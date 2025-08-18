# SIEM Integration & Security Monitoring

## Overview

The IC Custody Platform implements a comprehensive Security Information and Event Management (SIEM) system to provide enterprise-grade security monitoring, incident response, and compliance reporting. The SIEM architecture collects security events from all platform components, applies data minimization for GDPR compliance, and routes alerts through multiple channels.

## Architecture

### Components

1. **Events Canister (Motoko)** - Central event collection and storage on IC
2. **Logging SDK (Motoko)** - Shared library for structured event emission
3. **Event Collector (Node.js)** - Secure bridge from IC to SIEM infrastructure
4. **Data Pipeline** - Kafka → Vector → Elasticsearch/Splunk
5. **Alerting System** - Prometheus + Alertmanager → PagerDuty/Slack
6. **Dashboards** - Kibana (SIEM) + Grafana (Monitoring)

### Data Flow

```
IC Canisters → Events Canister → Event Collector → Kafka → Vector → SIEM
                                      ↓
                              Prometheus ← Metrics
                                      ↓
                              Alertmanager → PagerDuty/Slack
```

## Event Taxonomy

### Event Categories

- **Authentication** - Sign-ins, MFA, session management
- **Authorization** - RBAC decisions, policy evaluations
- **CustodyOperation** - Deposits, withdrawals, transfers
- **ComplianceCheck** - KYC, sanctions, AML screening
- **PolicyDecision** - Policy engine decisions
- **KeyManagement** - Key generation, rotation, signing
- **BlockchainIO** - Bitcoin transactions, UTXO queries
- **AdminAction** - Administrative changes
- **ConfigurationChange** - System configuration updates
- **SecurityIncident** - Anomalies, threats, violations
- **SystemHealth** - Performance, availability metrics
- **AuditTrail** - Compliance and audit events

### Severity Levels

- **P0** - Critical: Immediate action required (< 5 minutes)
- **P1** - High: Escalation within 1 hour
- **P2** - Medium: Address within 8 hours
- **P3** - Low: Routine monitoring
- **Info** - Informational events

## GDPR Compliance

### Data Minimization

The SIEM system implements automatic data minimization:

- **PII Pseudonymization**: Actor IDs are hashed using HMAC-SHA256
- **IP Masking**: IP addresses have last octet masked (e.g., 192.168.1.*)
- **Data Classification**: Events are tagged with GDPR classifications
- **Retention Policies**: Automatic data expiry based on classification
- **Right to Erasure**: Data deletion API for GDPR requests

### Data Classifications

- **Public** - No restrictions (365 days retention)
- **Internal** - Internal company data (365 days)
- **Confidential** - Sensitive business data (7-10 years)
- **PersonalData** - GDPR personal data (7 years)
- **SensitivePersonal** - GDPR special categories (7 years)

## Deployment

### Prerequisites

- Docker & Docker Compose 1.28+
- 16GB+ RAM, 100GB+ storage
- TLS certificates for Elasticsearch
- PagerDuty integration keys
- Slack webhook URLs

### Quick Start

```bash
# Clone the repository
cd infrastructure/siem-pipeline

# Configure environment
cp config/production.env.example config/production.env
# Edit config/production.env with your settings

# Deploy the stack
chmod +x deploy.sh
./deploy.sh production

# Verify deployment
docker-compose ps
docker-compose logs -f event-collector
```

### Configuration Files

- `config/production.env` - Environment variables
- `config/alertmanager.yml` - Alert routing rules
- `config/vector.toml` - Log aggregation pipeline
- `config/prometheus.yml` - Metrics collection
- `docker-compose.yml` - Infrastructure definition

## Alert Configuration

### PagerDuty Integration

Configure PagerDuty routing keys for different severity levels:

```bash
# Critical alerts (P0)
PAGERDUTY_CRITICAL_KEY=your-critical-integration-key

# High priority alerts (P1)
PAGERDUTY_HIGH_KEY=your-high-priority-key

# Security incidents
PAGERDUTY_SECURITY_KEY=your-security-team-key
```

### Slack Integration

Set up Slack webhooks for different teams:

```bash
# Main alerts channel
SLACK_API_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Additional channels configured in alertmanager.yml:
# - #alerts-critical
# - #alerts-high
# - #security-alerts
# - #custody-operations
# - #infrastructure
```

### Alert Rules

The system includes pre-configured alert rules:

- **Multiple Authentication Failures** (5 failures in 15 minutes)
- **High-Value Transactions** (immediate alert)
- **Security Incidents** (immediate escalation)
- **System Health Issues** (infrastructure problems)
- **Compliance Violations** (regulatory requirements)

## Monitoring Dashboards

### Kibana SIEM Dashboard

Access: `http://localhost:5601`

**Key Features:**
- Security event timeline
- Threat hunting interface
- Compliance reporting
- Incident investigation tools
- User behavior analytics

**Default Searches:**
- High-risk transactions
- Failed authentication attempts
- Security incidents
- Compliance events
- Administrative actions

### Grafana Monitoring

Access: `http://localhost:3000`

**Key Dashboards:**
- SIEM System Overview
- Event Collection Metrics
- Infrastructure Health
- Alert Response Times
- Data Pipeline Performance

## Event Collection Integration

### Using the Logging SDK

```motoko
import LoggingSDK "shared/logging_sdk";

// Initialize logger
let logger_config: LoggingSDK.LoggerConfig = {
    events_canister_id = Principal.fromText("your-events-canister-id");
    default_organization_id = ?"your-org-id";
    buffer_size = 100;
    flush_interval_ns = 60_000_000_000; // 60 seconds
    enable_batching = true;
    retry_attempts = 3;
    correlation_context = null;
};

let logger = LoggingSDK.create_logger(logger_config);

// Log authentication event
let result = await LoggingSDK.log_authentication_event(
    logger,
    "user_login",
    user_id,
    ?session_id,
    ?source_ip,
    true, // success
    [("method", "password"), ("mfa", "enabled")]
);

// Log custody operation
let result = await LoggingSDK.log_custody_operation(
    logger,
    "withdrawal",
    user_id,
    account_id,
    ?"1000000", // $1M
    ?"USD",
    ?transaction_id,
    [("approval_count", "3"), ("policy_version", "v2.1")]
);

// Log security incident
let result = await LoggingSDK.log_security_incident(
    logger,
    "suspicious_activity",
    user_id,
    [("pattern", "velocity_abuse"), ("confidence", "high")],
    ?"account_locked"
);
```

### Event Correlation

Use correlation IDs to track related events:

```motoko
// Generate correlation ID for transaction
let correlation_id = LoggingSDK.generate_correlation_id();
LoggingSDK.set_correlation_id(logger, ?correlation_id);

// All subsequent events will include this correlation ID
await LoggingSDK.log_custody_operation(...);
await LoggingSDK.log_compliance_check(...);
await LoggingSDK.log_policy_decision(...);
```

## Incident Response

### Alert Priorities

**P0 Critical (Immediate Response)**
- System outages affecting custody operations
- Security breaches or unauthorized access
- Data corruption or loss
- Critical compliance violations

**P1 High (1-hour Response)**
- High-value transaction anomalies
- Authentication system issues
- Performance degradation
- Policy violations

**P2 Medium (8-hour Response)**
- Failed compliance checks
- Suspicious user activity
- System warnings
- Configuration changes

### Response Procedures

1. **Alert Reception**
   - PagerDuty notification for P0/P1
   - Slack notification for visibility
   - Email for compliance team

2. **Initial Assessment** (within 5 minutes for P0)
   - Check Kibana for event details
   - Review Grafana for system health
   - Assess correlation with other events

3. **Investigation**
   - Use correlation ID to trace related events
   - Check user activity patterns
   - Review compliance implications

4. **Response Actions**
   - Implement containment measures
   - Notify stakeholders
   - Document findings
   - Update policies if needed

5. **Resolution**
   - Verify issue resolution
   - Update monitoring if needed
   - Conduct post-incident review

## Data Pipeline Monitoring

### Key Metrics

- **Event Collection Rate**: Events per second
- **Processing Latency**: End-to-end event latency
- **Error Rate**: Failed event processing
- **Storage Usage**: Elasticsearch disk usage
- **Alert Response Time**: Time to acknowledge alerts

### Health Checks

```bash
# Check event collector health
curl http://localhost:8080/health

# Check Elasticsearch cluster
curl -k -u elastic:password https://localhost:9200/_cluster/health

# Check Kafka topics
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# View recent events
docker-compose logs -f --tail=100 event-collector
```

### Troubleshooting

**Common Issues:**

1. **Events not appearing in Elasticsearch**
   - Check event collector logs
   - Verify Kafka connectivity
   - Check Vector configuration

2. **Alerts not firing**
   - Verify Prometheus targets
   - Check Alertmanager configuration
   - Test notification channels

3. **High memory usage**
   - Adjust buffer sizes
   - Check for event backlogs
   - Scale event collectors

4. **Authentication failures**
   - Verify credentials in environment
   - Check certificate validity
   - Review security settings

## Performance Optimization

### Event Collection

- **Batching**: Enable event batching for high-volume sources
- **Compression**: Use GZIP compression for Kafka messages
- **Indexing**: Optimize Elasticsearch index settings
- **Retention**: Configure appropriate data retention policies

### Infrastructure Scaling

```bash
# Scale event collectors
docker-compose up -d --scale event-collector=3

# Scale Kafka brokers (requires configuration changes)
docker-compose up -d --scale kafka=3

# Monitor resource usage
docker stats
```

## Security Considerations

### Access Control

- Events canister uses IC authentication
- Elasticsearch requires basic auth + TLS
- Grafana/Kibana require user authentication
- API keys for external integrations

### Network Security

- All communication encrypted in transit
- Elasticsearch uses self-signed certificates
- Firewall rules for external access
- VPN access for administrative interfaces

### Data Protection

- Event data encrypted at rest
- PII minimization applied automatically
- Audit trails for all access
- Regular security assessments

## Compliance Features

### Audit Trails

- Immutable event logging on IC
- Checksum verification for data integrity
- Complete audit trail for all actions
- Automated compliance reporting

### Regulatory Support

- **SOX**: Financial transaction logging
- **GDPR**: Data minimization and retention
- **FINRA**: Surveillance and reporting
- **AML**: Transaction monitoring
- **KYC**: Identity verification logging

### Reporting

Generate compliance reports from Kibana:

1. **Daily Security Summary**
   - Event volume by category
   - Security incidents
   - Failed authentication attempts

2. **Weekly Compliance Report**
   - Policy violations
   - High-risk transactions
   - Administrative actions

3. **Monthly Audit Report**
   - Complete event summary
   - Trend analysis
   - Recommendations

## Maintenance

### Regular Tasks

- **Daily**: Review critical alerts
- **Weekly**: Check system health metrics
- **Monthly**: Update retention policies
- **Quarterly**: Security assessment
- **Annually**: Disaster recovery test

### Backup & Recovery

```bash
# Backup Elasticsearch indices
curl -X PUT "localhost:9200/_snapshot/backup_repo" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/backup"
  }
}'

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/backup_repo/snapshot_1"

# Restore from snapshot
curl -X POST "localhost:9200/_snapshot/backup_repo/snapshot_1/_restore"
```

### Updates

```bash
# Update SIEM stack
git pull origin main
./deploy.sh production

# Update specific service
docker-compose pull event-collector
docker-compose up -d event-collector
```

## API Reference

### Events Canister

```motoko
// Log security event
public func log_event(
    severity: EventSeverity,
    category: EventCategory,
    event_type: Text,
    actor_id: Text,
    organization_id: ?Text,
    session_id: ?Text,
    source_ip: ?Text,
    user_agent: ?Text,
    details: [(Text, Text)],
    risk_score: ?Nat,
    correlation_id: ?Text
): async Result.Result<Text, Text>

// Query events
public query func query_events(query: EventQuery): async EventBatch

// Export for SIEM
public func export_events_for_siem(
    since_timestamp: ?Int,
    batch_size: ?Nat
): async Result.Result<[SecurityEvent], Text>

// System metrics
public query func get_system_metrics(): async SystemMetrics
```

### Event Collector

```bash
# Health check
GET /health

# Metrics
GET /metrics

# Manual collection
POST /collect

# Configuration
GET /config
PUT /config
```

## Support

### Logs Location

- **Event Collector**: `/var/log/siem-collector/`
- **Docker Logs**: `docker-compose logs [service]`
- **Elasticsearch**: `/usr/share/elasticsearch/logs/`
- **Kibana**: `/usr/share/kibana/logs/`

### Debugging

Enable debug logging:

```bash
# Event collector debug mode
export LOG_LEVEL=debug
docker-compose restart event-collector

# Vector debug mode
export VECTOR_LOG=debug
docker-compose restart vector
```

### Contact Information

- **Security Team**: security@custody-platform.com
- **Operations**: ops@custody-platform.com
- **Compliance**: compliance@custody-platform.com
- **On-call**: PagerDuty escalation policy

---

This SIEM integration provides enterprise-grade security monitoring with GDPR compliance, real-time alerting, and comprehensive audit trails for the IC Custody Platform.
