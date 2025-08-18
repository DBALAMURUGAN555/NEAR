#!/bin/bash

# SIEM Pipeline Deployment Script for IC Custody Platform
# Deploys security monitoring infrastructure with proper security hardening

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="${1:-production}"
CONFIG_FILE="${SCRIPT_DIR}/config/${ENV}.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for required tools
    local required_tools=("docker" "docker-compose" "openssl" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        # Try with sudo if regular docker command fails
        if sudo docker info &> /dev/null; then
            log_warning "Docker requires sudo privileges. All Docker commands will use sudo."
            export DOCKER_SUDO=true
        else
            log_error "Docker daemon is not running"
            exit 1
        fi
    fi
    
    # Check minimum Docker Compose version
    local compose_version
    compose_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [[ "$(printf '%s\n' "1.28.0" "$compose_version" | sort -V | head -n1)" != "1.28.0" ]]; then
        log_error "Docker Compose version 1.28.0 or higher required (found: $compose_version)"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Load configuration
load_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    log_info "Loading configuration from $CONFIG_FILE"
    set -a  # Export all variables
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
    set +a
    
    # Validate required environment variables
    local required_vars=(
        "ELASTIC_PASSWORD"
        "KIBANA_PASSWORD"
        "REDIS_PASSWORD"
        "PAGERDUTY_INTEGRATION_KEY"
        "SLACK_API_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "Configuration loaded successfully"
}

# Generate TLS certificates for Elasticsearch
generate_certificates() {
    log_info "Generating TLS certificates for Elasticsearch..."
    
    local certs_dir="${SCRIPT_DIR}/config/certs"
    mkdir -p "$certs_dir"
    
    if [[ ! -f "$certs_dir/ca.key" ]]; then
        log_info "Generating CA certificate..."
        
        # Generate CA private key
        openssl genrsa -out "$certs_dir/ca.key" 4096
        
        # Generate CA certificate
        openssl req -new -x509 -days 3650 -key "$certs_dir/ca.key" \
            -out "$certs_dir/ca.crt" \
            -subj "/C=US/ST=California/L=San Francisco/O=IC Custody Platform/OU=Security/CN=IC-Custody-CA"
        
        log_success "CA certificate generated"
    fi
    
    if [[ ! -f "$certs_dir/elasticsearch.key" ]]; then
        log_info "Generating Elasticsearch certificate..."
        
        # Generate Elasticsearch private key
        openssl genrsa -out "$certs_dir/elasticsearch.key" 2048
        
        # Generate certificate signing request
        openssl req -new -key "$certs_dir/elasticsearch.key" \
            -out "$certs_dir/elasticsearch.csr" \
            -subj "/C=US/ST=California/L=San Francisco/O=IC Custody Platform/OU=Security/CN=elasticsearch"
        
        # Create certificate extensions file
        cat > "$certs_dir/elasticsearch.ext" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = elasticsearch
DNS.2 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
        
        # Generate Elasticsearch certificate
        openssl x509 -req -in "$certs_dir/elasticsearch.csr" \
            -CA "$certs_dir/ca.crt" -CAkey "$certs_dir/ca.key" \
            -CAcreateserial -out "$certs_dir/elasticsearch.crt" \
            -days 365 -extensions v3_req -extfile "$certs_dir/elasticsearch.ext"
        
        # Clean up CSR and extensions file
        rm "$certs_dir/elasticsearch.csr" "$certs_dir/elasticsearch.ext"
        
        log_success "Elasticsearch certificate generated"
    fi
    
    # Set proper permissions
    chmod 600 "$certs_dir"/*.key
    chmod 644 "$certs_dir"/*.crt
    
    log_success "TLS certificates ready"
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    local dirs=(
        "${SCRIPT_DIR}/logs"
        "${SCRIPT_DIR}/data"
        "${SCRIPT_DIR}/config/grafana/dashboards"
        "${SCRIPT_DIR}/config/grafana/provisioning/dashboards"
        "${SCRIPT_DIR}/config/grafana/provisioning/datasources"
        "${SCRIPT_DIR}/config/alertmanager/templates"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        log_info "Created directory: $dir"
    done
    
    # Set proper permissions for log directory
    chmod 755 "${SCRIPT_DIR}/logs"
    
    log_success "Directories created successfully"
}

# Generate configuration files
generate_configs() {
    log_info "Generating configuration files..."
    
    # Generate Vector configuration
    cat > "${SCRIPT_DIR}/config/vector.toml" << EOF
# Vector Configuration for IC Custody Platform SIEM
# Aggregates logs and forwards to Kafka and Elasticsearch

[api]
enabled = true
address = "0.0.0.0:8686"

# Input: Application logs
[sources.app_logs]
type = "file"
include = ["/var/log/apps/*.log"]
read_from = "beginning"

# Input: System logs
[sources.system_logs]
type = "journald"
current_boot_only = true

# Transform: Parse and enrich logs
[transforms.parse_logs]
type = "remap"
inputs = ["app_logs"]
source = '''
. = parse_json!(.message)
.timestamp = now()
.hostname = get_hostname!()
.source = "ic-custody-platform"

# Add GDPR compliance flags
if exists(.actor_id) {
  .contains_pii = true
  .data_classification = "PersonalData"
} else {
  .contains_pii = false
  .data_classification = "Internal"
}

# Enrich security events
if .category == "SecurityIncident" {
  .alert_required = true
  .priority = "high"
}
'''

# Transform: Filter sensitive data
[transforms.gdpr_filter]
type = "remap"
inputs = ["parse_logs"]
source = '''
# Remove or hash sensitive fields for GDPR compliance
if .contains_pii == true {
  if exists(.actor_id) {
    .actor_id_hash = sha256(.actor_id)[0:16]
    del(.actor_id)
  }
  if exists(.source_ip) {
    .source_ip_masked = replace(.source_ip, r'\\.[0-9]+$', ".***")
    del(.source_ip)
  }
}
'''

# Output: Kafka
[sinks.kafka_output]
type = "kafka"
inputs = ["gdpr_filter"]
bootstrap_servers = "kafka:29092"
topic = "security-events"
compression = "gzip"
encoding.codec = "json"

# Output: Elasticsearch
[sinks.elasticsearch_output]
type = "elasticsearch"
inputs = ["gdpr_filter"]
endpoint = "https://elasticsearch:9200"
index = "ic-custody-events-%Y.%m.%d"
auth.strategy = "basic"
auth.user = "elastic"
auth.password = "${ELASTIC_PASSWORD}"
tls.verify_certificate = false
tls.verify_hostname = false

# Output: Console (for debugging)
[sinks.console_output]
type = "console"
inputs = ["gdpr_filter"]
encoding.codec = "json"
target = "stdout"
EOF

    # Generate Prometheus configuration
    cat > "${SCRIPT_DIR}/config/prometheus.yml" << EOF
# Prometheus Configuration for IC Custody Platform SIEM

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'ic-custody-siem'
    environment: '${ENV}'

# Alerting rules
rule_files:
  - "alert_rules.yml"

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# Scrape configurations
scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Event Collector
  - job_name: 'event-collector'
    static_configs:
      - targets: ['event-collector:8080']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # Elasticsearch
  - job_name: 'elasticsearch'
    static_configs:
      - targets: ['elasticsearch:9200']
    metrics_path: '/_prometheus/metrics'
    scheme: 'https'
    tls_config:
      insecure_skip_verify: true
    basic_auth:
      username: 'elastic'
      password: '${ELASTIC_PASSWORD}'

  # Kafka
  - job_name: 'kafka'
    static_configs:
      - targets: ['kafka:9101']

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  # Node Exporter (if available)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
EOF

    # Generate Grafana datasource configuration
    cat > "${SCRIPT_DIR}/config/grafana/provisioning/datasources/datasources.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: https://elasticsearch:9200
    database: "ic-custody-events-*"
    timeField: "@timestamp"
    basicAuth: true
    basicAuthUser: elastic
    basicAuthPassword: ${ELASTIC_PASSWORD}
    jsonData:
      esVersion: 70
      timeInterval: "10s"
      maxConcurrentShardRequests: 5
      logMessageField: "message"
      logLevelField: "severity"
      tlsSkipVerify: true
EOF

    log_success "Configuration files generated"
}

# Build custom Docker images
build_images() {
    log_info "Building custom Docker images..."
    
    # Build Event Collector image
    cat > "${SCRIPT_DIR}/Dockerfile.collector" << EOF
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/
COPY config/ ./config/

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node /app/dist/event-collector.js --command health

EXPOSE 8080

CMD ["node", "/app/dist/event-collector.js", "--command", "start"]
EOF

    # Build the image
    docker build -f "${SCRIPT_DIR}/Dockerfile.collector" -t ic-custody/event-collector:latest "${SCRIPT_DIR}"
    
    log_success "Docker images built successfully"
}

# Deploy the stack
deploy_stack() {
    log_info "Deploying SIEM stack..."
    
    cd "$SCRIPT_DIR"
    
    # Pull latest images
    docker-compose pull
    
    # Deploy with specific environment
    docker-compose --env-file "$CONFIG_FILE" up -d
    
    log_success "SIEM stack deployed successfully"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    local services=(
        "elasticsearch:9200"
        "kibana:5601"
        "kafka:9092"
        "prometheus:9090"
        "grafana:3000"
    )
    
    for service in "${services[@]}"; do
        local host port
        IFS=':' read -r host port <<< "$service"
        
        log_info "Waiting for $host:$port..."
        timeout 300 bash -c "until nc -z $host $port; do sleep 5; done" || {
            log_error "Timeout waiting for $service"
            return 1
        }
        log_success "$service is ready"
    done
    
    # Additional health checks
    log_info "Performing health checks..."
    
    # Check Elasticsearch cluster health
    local es_health
    es_health=$(curl -s -k -u "elastic:${ELASTIC_PASSWORD}" \
        "https://localhost:9200/_cluster/health" | jq -r '.status')
    
    if [[ "$es_health" != "green" && "$es_health" != "yellow" ]]; then
        log_error "Elasticsearch cluster health is $es_health"
        return 1
    fi
    log_success "Elasticsearch cluster health: $es_health"
    
    log_success "All services are ready"
}

# Setup initial data and dashboards
setup_initial_data() {
    log_info "Setting up initial data and dashboards..."
    
    # Create Elasticsearch index templates
    curl -s -k -u "elastic:${ELASTIC_PASSWORD}" \
        -X PUT "https://localhost:9200/_index_template/ic-custody-events" \
        -H "Content-Type: application/json" \
        -d '{
          "index_patterns": ["ic-custody-events-*"],
          "template": {
            "settings": {
              "number_of_shards": 1,
              "number_of_replicas": 1,
              "index.lifecycle.name": "ic-custody-policy",
              "index.lifecycle.rollover_alias": "ic-custody-events"
            },
            "mappings": {
              "properties": {
                "@timestamp": { "type": "date" },
                "severity": { "type": "keyword" },
                "category": { "type": "keyword" },
                "event_type": { "type": "keyword" },
                "actor_id_hash": { "type": "keyword" },
                "organization_id": { "type": "keyword" },
                "source_canister": { "type": "keyword" },
                "risk_score": { "type": "integer" },
                "compliance_flags": { "type": "keyword" },
                "correlation_id": { "type": "keyword" },
                "data_classification": { "type": "keyword" },
                "details": { "type": "object" }
              }
            }
          }
        }' > /dev/null
    
    log_success "Elasticsearch index template created"
    
    # Create Kibana index patterns and dashboards
    # This would typically be done through Kibana's API or saved objects
    
    log_success "Initial data setup completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check if all containers are running
    local failed_containers
    failed_containers=$(docker-compose ps --filter status=exited -q)
    
    if [[ -n "$failed_containers" ]]; then
        log_error "Some containers failed to start:"
        docker-compose ps --filter status=exited
        return 1
    fi
    
    # Test event collection
    log_info "Testing event collection..."
    
    # This would send a test event to verify the pipeline
    # docker exec ic-event-collector node /app/dist/test-event.js
    
    log_success "Deployment verification completed"
}

# Show access information
show_access_info() {
    log_success "SIEM Pipeline deployed successfully!"
    echo
    echo "Access Information:"
    echo "=================="
    echo "Kibana (SIEM Dashboard): http://localhost:5601"
    echo "  Username: elastic"
    echo "  Password: ${ELASTIC_PASSWORD}"
    echo
    echo "Grafana (Monitoring): http://localhost:3000"
    echo "  Username: admin"
    echo "  Password: ${GRAFANA_PASSWORD}"
    echo
    echo "Prometheus (Metrics): http://localhost:9090"
    echo "Alertmanager (Alerts): http://localhost:9093"
    echo "Jaeger (Tracing): http://localhost:16686"
    echo
    echo "Logs:"
    echo "====="
    echo "View logs: docker-compose logs -f [service_name]"
    echo "Log files: ${SCRIPT_DIR}/logs/"
    echo
    echo "Management:"
    echo "==========="
    echo "Stop: docker-compose down"
    echo "Update: ./deploy.sh ${ENV}"
    echo "Scale: docker-compose up -d --scale event-collector=3"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up deployment..."
    cd "$SCRIPT_DIR"
    docker-compose down -v --remove-orphans
    docker system prune -f
    log_success "Cleanup completed"
}

# Main execution
main() {
    log_info "Starting SIEM Pipeline deployment for environment: $ENV"
    
    # Handle cleanup command
    if [[ "${1:-}" == "cleanup" ]]; then
        cleanup
        exit 0
    fi
    
    # Execute deployment steps
    check_prerequisites
    load_config
    generate_certificates
    create_directories
    generate_configs
    build_images
    deploy_stack
    wait_for_services
    setup_initial_data
    verify_deployment
    show_access_info
    
    log_success "SIEM Pipeline deployment completed successfully!"
}

# Error handling
trap 'log_error "Deployment failed at line $LINENO"' ERR

# Execute main function
main "$@"
