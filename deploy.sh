#!/bin/bash

# IC Custody Platform - Main Deployment Script
# Deploys the complete institutional custody platform with monitoring

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV="${1:-local}"
COMPONENT="${2:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
    echo "=================================="
}

log_component() {
    echo -e "${CYAN}[COMPONENT]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites for IC Custody Platform deployment..."
    
    # Source Rust environment if it exists
    if [[ -f "$HOME/.cargo/env" ]]; then
        source "$HOME/.cargo/env"
    fi
    
    # Check for required tools
    local required_tools=("dfx" "node" "npm" "docker" "docker-compose" "rustc" "cargo")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo
        echo "Installation instructions:"
        echo "========================"
        echo "# Install DFX (Internet Computer SDK)"
        echo "sh -ci \"\$(curl -fsSL https://sdk.dfinity.org/install.sh)\""
        echo
        echo "# Install Node.js and npm"
        echo "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
        echo "sudo apt-get install -y nodejs"
        echo
        echo "# Install Docker"
        echo "curl -fsSL https://get.docker.com -o get-docker.sh"
        echo "sh get-docker.sh"
        echo
        echo "# Install Rust"
        echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        echo
        exit 1
    fi
    
    # Check versions
    log_info "Tool versions:"
    dfx --version | head -1
    node --version
    npm --version
    docker --version
    docker-compose --version
    rustc --version | head -1
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        # Try with sudo if regular docker command fails
        if sudo docker info &> /dev/null; then
            log_warning "Docker requires sudo privileges. All Docker commands will use sudo."
            export DOCKER_SUDO=true
        else
            log_error "Docker daemon is not running. Please start Docker and try again."
            exit 1
        fi
    fi
    
    log_success "All prerequisites are satisfied"
}

# Setup environment
setup_environment() {
    log_section "Setting up Environment"
    
    # Create necessary directories
    local dirs=(
        "${SCRIPT_DIR}/logs"
        "${SCRIPT_DIR}/data"
        "${SCRIPT_DIR}/.dfx"
        "${SCRIPT_DIR}/infrastructure/siem-pipeline/config"
        "${SCRIPT_DIR}/infrastructure/siem-pipeline/logs"
        "${SCRIPT_DIR}/infrastructure/siem-pipeline/data"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done
    
    # Copy environment configuration if it doesn't exist
    if [[ ! -f "${SCRIPT_DIR}/infrastructure/siem-pipeline/config/${ENV}.env" ]]; then
        log_info "Creating default environment configuration..."
        
        cat > "${SCRIPT_DIR}/infrastructure/siem-pipeline/config/${ENV}.env" << EOF
# IC Custody Platform - ${ENV} Environment Configuration

# Elasticsearch Configuration
ELASTIC_PASSWORD=SecureElasticPassword123!
KIBANA_PASSWORD=SecureKibanaPassword123!
KIBANA_ENCRYPTION_KEY=a-32-character-long-encryption-key

# Redis Configuration
REDIS_PASSWORD=SecureRedisPassword123!

# Grafana Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=SecureGrafanaPassword123!

# PagerDuty Integration (replace with your keys)
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-integration-key
PAGERDUTY_CRITICAL_KEY=your-pagerduty-critical-key
PAGERDUTY_HIGH_KEY=your-pagerduty-high-key
PAGERDUTY_SECURITY_KEY=your-pagerduty-security-key

# Slack Integration (replace with your webhook URL)
SLACK_API_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# SMTP Configuration for email alerts
SMTP_HOST=localhost:587
SMTP_FROM=alerts@custody-platform.com
SMTP_USERNAME=
SMTP_PASSWORD=

# Webhook Configuration
WEBHOOK_SECRET=SecureWebhookSecret123!

# Service URLs (for production, replace with actual URLs)
KIBANA_URL=http://localhost:5601
GRAFANA_URL=http://localhost:3000
ALERTMANAGER_URL=http://localhost:9093
ADMIN_PORTAL_URL=http://localhost:8000

# Email addresses
DEFAULT_EMAIL=ops@custody-platform.com
COMPLIANCE_EMAIL=compliance@custody-platform.com

# IC Network Configuration
IC_NETWORK=${ENV}
IC_GATEWAY_URL=http://localhost:4943
EVENTS_CANISTER_ID=rdmx6-jaaaa-aaaaa-aaadq-cai
EOF
        
        log_warning "Default configuration created at infrastructure/siem-pipeline/config/${ENV}.env"
        log_warning "Please update the configuration with your actual credentials and keys!"
    fi
    
    log_success "Environment setup completed"
}

# Deploy IC canisters
deploy_canisters() {
    log_section "Deploying IC Canisters"
    
    cd "$SCRIPT_DIR"
    
    # Start local DFX if environment is local
    if [[ "$ENV" == "local" ]]; then
        log_info "Starting local DFX replica..."
        dfx start --background --clean || log_warning "DFX may already be running"
        sleep 5
    fi
    
    # Deploy canisters in order
    local canisters=("events" "compliance" "multisig" "custody_core")
    
    for canister in "${canisters[@]}"; do
        log_component "Deploying $canister canister..."
        
        if [[ "$ENV" == "local" ]]; then
            dfx deploy "$canister" --argument '()'
        else
            dfx deploy "$canister" --network "$ENV" --argument '()'
        fi
        
        log_success "$canister canister deployed successfully"
    done
    
    # Get canister IDs and update configuration
    log_info "Updating canister IDs in configuration..."
    
    local events_canister_id
    if [[ "$ENV" == "local" ]]; then
        events_canister_id=$(dfx canister id events)
    else
        events_canister_id=$(dfx canister id events --network "$ENV")
    fi
    
    # Update the environment configuration with actual canister ID
    sed -i "s/EVENTS_CANISTER_ID=.*/EVENTS_CANISTER_ID=$events_canister_id/" \
        "${SCRIPT_DIR}/infrastructure/siem-pipeline/config/${ENV}.env"
    
    log_success "Canisters deployed successfully"
    
    # Show canister information
    echo
    echo "Deployed Canisters:"
    echo "=================="
    for canister in "${canisters[@]}"; do
        if [[ "$ENV" == "local" ]]; then
            echo "$canister: $(dfx canister id "$canister")"
        else
            echo "$canister: $(dfx canister id "$canister" --network "$ENV")"
        fi
    done
}

# Build frontend
build_frontend() {
    log_section "Building Frontend Application"
    
    cd "${SCRIPT_DIR}/src/frontend"
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm install
    
    # Build the application
    log_info "Building React application..."
    npm run build
    
    # Copy build artifacts
    if [[ -d "${SCRIPT_DIR}/src/frontend/build" ]]; then
        log_info "Copying build artifacts..."
        cp -r build/* "${SCRIPT_DIR}/data/frontend/" 2>/dev/null || mkdir -p "${SCRIPT_DIR}/data/frontend"
        cp -r build/* "${SCRIPT_DIR}/data/frontend/"
    fi
    
    log_success "Frontend built successfully"
}

# Deploy SIEM infrastructure
deploy_siem() {
    log_section "Deploying SIEM Infrastructure"
    
    cd "${SCRIPT_DIR}/infrastructure/siem-pipeline"
    
    # Build TypeScript event collector
    log_info "Building event collector service..."
    
    # Create package.json if it doesn't exist
    if [[ ! -f "package.json" ]]; then
        cat > package.json << EOF
{
  "name": "ic-custody-siem",
  "version": "1.0.0",
  "description": "SIEM Event Collector for IC Custody Platform",
  "main": "dist/event-collector.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/event-collector.js",
    "dev": "ts-node event-collector.ts"
  },
  "dependencies": {
    "@dfinity/agent": "^0.19.0",
    "@dfinity/principal": "^0.19.0",
    "node-fetch": "^2.6.12",
    "winston": "^3.10.0",
    "kafkajs": "^2.2.4"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  }
}
EOF
    fi
    
    # Install dependencies and build
    npm install
    npx tsc --init --target es2020 --module commonjs --outDir dist --rootDir . --esModuleInterop --allowSyntheticDefaultImports
    npx tsc
    
    # Deploy SIEM stack
    log_info "Deploying SIEM infrastructure..."
    ./deploy.sh "$ENV"
    
    log_success "SIEM infrastructure deployed successfully"
}

# Run tests
run_tests() {
    log_section "Running Tests"
    
    cd "$SCRIPT_DIR"
    
    # Run Rust tests
    log_component "Running Rust canister tests..."
    if find . -name "*.rs" -path "*/src/*" | head -1 | grep -q .; then
        cargo test --all
    else
        log_warning "No Rust tests found"
    fi
    
    # Run Motoko tests (if any test files exist)
    log_component "Running Motoko tests..."
    if find . -name "*.test.mo" | head -1 | grep -q .; then
        dfx test
    else
        log_warning "No Motoko tests found"
    fi
    
    # Run frontend tests
    log_component "Running frontend tests..."
    cd "${SCRIPT_DIR}/src/frontend"
    if [[ -f "package.json" ]] && npm list --depth=0 | grep -q "test"; then
        npm test -- --watchAll=false
    else
        log_warning "No frontend tests configured"
    fi
    
    log_success "All tests completed"
}

# Verify deployment
verify_deployment() {
    log_section "Verifying Deployment"
    
    cd "$SCRIPT_DIR"
    
    # Check canister status
    log_info "Checking canister status..."
    local canisters=("events" "compliance" "multisig" "custody_core")
    
    for canister in "${canisters[@]}"; do
        local status
        if [[ "$ENV" == "local" ]]; then
            status=$(dfx canister status "$canister" 2>/dev/null || echo "FAILED")
        else
            status=$(dfx canister status "$canister" --network "$ENV" 2>/dev/null || echo "FAILED")
        fi
        
        if [[ "$status" == "FAILED" ]]; then
            log_error "$canister canister is not responding"
        else
            log_success "$canister canister is running"
        fi
    done
    
    # Check SIEM services
    log_info "Checking SIEM services..."
    
    local services=(
        "elasticsearch:9200"
        "kibana:5601"
        "grafana:3000"
        "prometheus:9090"
        "alertmanager:9093"
    )
    
    for service in "${services[@]}"; do
        local host port
        IFS=':' read -r host port <<< "$service"
        
        if curl -s --max-time 5 "http://localhost:$port" >/dev/null 2>&1; then
            log_success "$service is accessible"
        else
            log_warning "$service is not accessible (may still be starting)"
        fi
    done
    
    log_success "Deployment verification completed"
}

# Show access information
show_access_info() {
    log_section "Access Information"
    
    echo -e "${GREEN}🎉 IC Custody Platform Deployed Successfully!${NC}"
    echo
    echo "Platform Components:"
    echo "==================="
    
    # Canister information
    echo "📱 IC Canisters:"
    if [[ "$ENV" == "local" ]]; then
        echo "   Events Canister: $(dfx canister id events 2>/dev/null || echo 'Not deployed')"
        echo "   Compliance Canister: $(dfx canister id compliance 2>/dev/null || echo 'Not deployed')"
        echo "   MultiSig Canister: $(dfx canister id multisig 2>/dev/null || echo 'Not deployed')"
        echo "   Custody Core: $(dfx canister id custody_core 2>/dev/null || echo 'Not deployed')"
        echo "   Candid Interface: http://localhost:4943?canisterId=$(dfx canister id events 2>/dev/null || echo 'unknown')"
    else
        echo "   Network: $ENV"
        echo "   Check canister IDs with: dfx canister id <canister_name> --network $ENV"
    fi
    
    echo
    echo "🔍 Monitoring & SIEM:"
    echo "   Kibana (SIEM Dashboard): http://localhost:5601"
    echo "   Username: elastic"
    echo "   Password: $(grep ELASTIC_PASSWORD "${SCRIPT_DIR}/infrastructure/siem-pipeline/config/${ENV}.env" | cut -d'=' -f2)"
    echo
    echo "   Grafana (Metrics): http://localhost:3000"
    echo "   Username: admin"
    echo "   Password: $(grep GRAFANA_PASSWORD "${SCRIPT_DIR}/infrastructure/siem-pipeline/config/${ENV}.env" | cut -d'=' -f2)"
    echo
    echo "   Prometheus: http://localhost:9090"
    echo "   Alertmanager: http://localhost:9093"
    echo "   Jaeger Tracing: http://localhost:16686"
    
    echo
    echo "🛠️  Management Commands:"
    echo "======================="
    echo "# View logs"
    echo "docker-compose -f infrastructure/siem-pipeline/docker-compose.yml logs -f"
    echo
    echo "# Check canister status"
    echo "dfx canister status --all${ENV:+ --network $ENV}"
    echo
    echo "# Stop services"
    echo "docker-compose -f infrastructure/siem-pipeline/docker-compose.yml down"
    echo
    echo "# Redeploy specific component"
    echo "./deploy.sh $ENV [component]"
    
    if [[ "$ENV" == "local" ]]; then
        echo
        echo "# Stop local IC replica"
        echo "dfx stop"
    fi
    
    echo
    echo "📚 Documentation:"
    echo "================"
    echo "   SIEM Integration: docs/siem-integration.md"
    echo "   API Documentation: Generated in Candid interface"
    echo "   Frontend Guide: src/frontend/README.md"
    
    echo
    echo -e "${YELLOW}⚠️  Important Notes:${NC}"
    echo "   - Update credentials in infrastructure/siem-pipeline/config/${ENV}.env"
    echo "   - Configure PagerDuty and Slack webhooks for alerts"
    echo "   - Review security settings before production deployment"
    echo "   - Set up SSL certificates for production environments"
}

# Cleanup function
cleanup() {
    log_section "Cleaning Up Deployment"
    
    log_info "Stopping SIEM services..."
    cd "${SCRIPT_DIR}/infrastructure/siem-pipeline"
    docker-compose down -v --remove-orphans 2>/dev/null || true
    
    if [[ "$ENV" == "local" ]]; then
        log_info "Stopping local IC replica..."
        dfx stop 2>/dev/null || true
    fi
    
    log_info "Cleaning up Docker resources..."
    docker system prune -f 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Show help
show_help() {
    echo "IC Custody Platform - Deployment Script"
    echo "======================================="
    echo
    echo "Usage: $0 [ENVIRONMENT] [COMPONENT]"
    echo
    echo "Environments:"
    echo "  local      - Local development with DFX replica (default)"
    echo "  testnet    - IC testnet deployment"
    echo "  mainnet    - IC mainnet deployment"
    echo
    echo "Components:"
    echo "  all        - Deploy complete platform (default)"
    echo "  canisters  - Deploy only IC canisters"
    echo "  frontend   - Build only frontend"
    echo "  siem       - Deploy only SIEM infrastructure"
    echo "  test       - Run tests only"
    echo "  verify     - Verify deployment only"
    echo "  cleanup    - Clean up deployment"
    echo
    echo "Examples:"
    echo "  $0                     # Deploy everything locally"
    echo "  $0 local canisters     # Deploy only canisters locally"
    echo "  $0 testnet siem        # Deploy SIEM to testnet"
    echo "  $0 local cleanup       # Clean up local deployment"
    echo
    echo "Prerequisites:"
    echo "  - DFX (Internet Computer SDK)"
    echo "  - Node.js and npm"
    echo "  - Docker and Docker Compose"
    echo "  - Rust and Cargo"
}

# Main execution function
main() {
    # Handle special commands
    if [[ "$ENV" == "help" || "$ENV" == "-h" || "$ENV" == "--help" ]]; then
        show_help
        exit 0
    fi
    
    case "${COMPONENT:-all}" in
        "cleanup")
            cleanup
            exit 0
            ;;
    esac
    
    log_section "IC Custody Platform Deployment"
    log_info "Environment: $ENV"
    log_info "Component: $COMPONENT"
    log_info "Started at: $(date)"
    
    # Execute deployment steps based on component
    case "$COMPONENT" in
        "all")
            check_prerequisites
            setup_environment
            deploy_canisters
            build_frontend
            deploy_siem
            run_tests
            verify_deployment
            show_access_info
            ;;
        "canisters")
            check_prerequisites
            setup_environment
            deploy_canisters
            ;;
        "frontend")
            check_prerequisites
            build_frontend
            ;;
        "siem")
            check_prerequisites
            setup_environment
            deploy_siem
            ;;
        "test")
            run_tests
            ;;
        "verify")
            verify_deployment
            ;;
        *)
            log_error "Unknown component: $COMPONENT"
            show_help
            exit 1
            ;;
    esac
    
    log_success "Deployment completed successfully at $(date)"
}

# Error handling
trap 'log_error "Deployment failed at line $LINENO"' ERR

# Execute main function with all arguments
main "$@"
