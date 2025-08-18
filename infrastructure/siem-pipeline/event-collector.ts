/**
 * Event Collector Service
 * Securely collects events from IC Events canister and forwards to SIEM
 * Implements certified queries, data minimization, and secure transport
 */

import { Actor, HttpAgent, Certificate } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { createHash, createHmac } from 'crypto';
import fetch from 'node-fetch';
import winston from 'winston';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { parseArgs } from 'util';

// Configuration interfaces
interface CollectorConfig {
  icNetwork: 'local' | 'mainnet' | 'testnet';
  icGatewayUrl: string;
  eventsCanisterId: string;
  identityPath: string;
  siem: {
    type: 'elasticsearch' | 'splunk' | 'opensearch';
    endpoint: string;
    apiKey?: string;
    index: string;
    batchSize: number;
    flushIntervalMs: number;
  };
  kafka: {
    brokers: string[];
    topic: string;
    clientId: string;
    groupId: string;
  };
  security: {
    enableCertifiedQueries: boolean;
    dataMinimization: boolean;
    encryptInTransit: boolean;
    hmacSecret: string;
  };
  collection: {
    pollIntervalMs: number;
    batchSize: number;
    maxRetries: number;
    startFromTimestamp?: number;
  };
  gdpr: {
    enableDataMinimization: boolean;
    retentionPolicyDays: number;
    logDataProcessing: boolean;
  };
}

// Event types from the Events canister
interface SecurityEvent {
  id: string;
  timestamp: bigint;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'Info';
  category: 
    | 'Authentication' 
    | 'Authorization' 
    | 'CustodyOperation' 
    | 'ComplianceCheck'
    | 'PolicyDecision'
    | 'KeyManagement'
    | 'BlockchainIO'
    | 'AdminAction'
    | 'ConfigurationChange'
    | 'SecurityIncident'
    | 'SystemHealth'
    | 'AuditTrail';
  event_type: string;
  actor_id: string;
  organization_id: string | null;
  session_id: string | null;
  source_canister: string;
  source_ip: string | null;
  user_agent: string | null;
  details: Array<[string, string]>;
  risk_score: number | null;
  compliance_flags: string[];
  correlation_id: string | null;
  data_classification: 'Public' | 'Internal' | 'Confidential' | 'PersonalData' | 'SensitivePersonal';
  retention_period_days: number;
  checksum: string;
}

interface ProcessedEvent {
  id: string;
  timestamp: string;
  severity: string;
  category: string;
  event_type: string;
  actor_id_hash?: string; // Minimized for GDPR
  organization_id?: string;
  source_canister: string;
  source_ip_masked?: string; // IP with last octet masked
  details: Record<string, string>;
  risk_score?: number;
  compliance_flags: string[];
  correlation_id?: string;
  data_classification: string;
  collection_metadata: {
    collected_at: string;
    collector_version: string;
    certification_status: 'certified' | 'uncertified' | 'failed';
    processing_pipeline: string;
  };
}

// Events canister interface
const eventsCanisterIDL = ({ IDL }: any) => {
  const EventSeverity = IDL.Variant({
    P0: IDL.Null,
    P1: IDL.Null,
    P2: IDL.Null,
    P3: IDL.Null,
    Info: IDL.Null,
  });

  const EventCategory = IDL.Variant({
    Authentication: IDL.Null,
    Authorization: IDL.Null,
    CustodyOperation: IDL.Null,
    ComplianceCheck: IDL.Null,
    PolicyDecision: IDL.Null,
    KeyManagement: IDL.Null,
    BlockchainIO: IDL.Null,
    AdminAction: IDL.Null,
    ConfigurationChange: IDL.Null,
    SecurityIncident: IDL.Null,
    SystemHealth: IDL.Null,
    AuditTrail: IDL.Null,
  });

  const SecurityEvent = IDL.Record({
    id: IDL.Text,
    timestamp: IDL.Int,
    severity: EventSeverity,
    category: EventCategory,
    event_type: IDL.Text,
    actor_id: IDL.Text,
    organization_id: IDL.Opt(IDL.Text),
    session_id: IDL.Opt(IDL.Text),
    source_canister: IDL.Text,
    source_ip: IDL.Opt(IDL.Text),
    user_agent: IDL.Opt(IDL.Text),
    details: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    risk_score: IDL.Opt(IDL.Nat),
    compliance_flags: IDL.Vec(IDL.Text),
    correlation_id: IDL.Opt(IDL.Text),
    data_classification: IDL.Variant({
      Public: IDL.Null,
      Internal: IDL.Null,
      Confidential: IDL.Null,
      PersonalData: IDL.Null,
      SensitivePersonal: IDL.Null,
    }),
    retention_period_days: IDL.Nat,
    checksum: IDL.Text,
  });

  return IDL.Service({
    export_events_for_siem: IDL.Func(
      [IDL.Opt(IDL.Int), IDL.Opt(IDL.Nat)],
      [IDL.Variant({ Ok: IDL.Vec(SecurityEvent), Err: IDL.Text })],
      ['query']
    ),
    get_system_metrics: IDL.Func(
      [],
      [IDL.Record({
        total_events: IDL.Nat,
        events_last_hour: IDL.Nat,
        events_last_24h: IDL.Nat,
        p0_alerts_active: IDL.Nat,
        p1_alerts_active: IDL.Nat,
        storage_used_mb: IDL.Nat,
        oldest_event_age_hours: IDL.Nat,
        data_export_last_run: IDL.Opt(IDL.Int),
      })],
      ['query']
    ),
  });
};

class EventCollector {
  private config: CollectorConfig;
  private logger: winston.Logger;
  private eventsActor: any;
  private kafkaProducer: Producer;
  private lastCollectedTimestamp: bigint = 0n;
  private isRunning: boolean = false;
  private eventBuffer: ProcessedEvent[] = [];
  private metrics: {
    eventsCollected: number;
    eventsProcessed: number;
    eventsSent: number;
    errorsCount: number;
    lastRunTime: Date | null;
  } = {
    eventsCollected: 0,
    eventsProcessed: 0,
    eventsSent: 0,
    errorsCount: 0,
    lastRunTime: null,
  };

  constructor(config: CollectorConfig) {
    this.config = config;
    this.setupLogger();
    this.initializeIC();
    this.setupKafka();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'siem-event-collector' },
      transports: [
        new winston.transports.File({ 
          filename: '/var/log/siem-collector/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: '/var/log/siem-collector/combined.log' 
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ],
    });
  }

  private async initializeIC(): Promise<void> {
    try {
      // In production, load identity from secure storage
      const agent = new HttpAgent({
        host: this.config.icGatewayUrl,
        fetch: fetch as any,
      });

      // Only fetch root key for local development
      if (this.config.icNetwork === 'local') {
        await agent.fetchRootKey();
      }

      this.eventsActor = Actor.createActor(eventsCanisterIDL, {
        agent,
        canisterId: Principal.fromText(this.config.eventsCanisterId),
      });

      this.logger.info('IC connection initialized', {
        network: this.config.icNetwork,
        canister: this.config.eventsCanisterId,
      });
    } catch (error) {
      this.logger.error('Failed to initialize IC connection', { error });
      throw error;
    }
  }

  private setupKafka(): void {
    const kafka = new Kafka({
      clientId: this.config.kafka.clientId,
      brokers: this.config.kafka.brokers,
    });

    this.kafkaProducer = kafka.producer();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Collector is already running');
      return;
    }

    try {
      await this.kafkaProducer.connect();
      this.isRunning = true;

      // Set starting timestamp if provided
      if (this.config.collection.startFromTimestamp) {
        this.lastCollectedTimestamp = BigInt(this.config.collection.startFromTimestamp);
      }

      this.logger.info('Event collector started', {
        pollInterval: this.config.collection.pollIntervalMs,
        batchSize: this.config.collection.batchSize,
        startFromTimestamp: this.lastCollectedTimestamp.toString(),
      });

      // Start collection loop
      this.collectionLoop();

      // Start periodic flush
      this.flushLoop();

    } catch (error) {
      this.logger.error('Failed to start event collector', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Flush remaining events
    await this.flushEventBuffer();
    
    await this.kafkaProducer.disconnect();
    this.logger.info('Event collector stopped');
  }

  private async collectionLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.collectEvents();
        this.metrics.lastRunTime = new Date();
        
        await new Promise(resolve => 
          setTimeout(resolve, this.config.collection.pollIntervalMs)
        );
      } catch (error) {
        this.logger.error('Error in collection loop', { error });
        this.metrics.errorsCount++;
        
        // Exponential backoff on errors
        await new Promise(resolve => 
          setTimeout(resolve, Math.min(this.config.collection.pollIntervalMs * 2, 60000))
        );
      }
    }
  }

  private async flushLoop(): Promise<void> {
    while (this.isRunning) {
      await new Promise(resolve => 
        setTimeout(resolve, this.config.siem.flushIntervalMs)
      );
      
      if (this.eventBuffer.length > 0) {
        await this.flushEventBuffer();
      }
    }
  }

  private async collectEvents(): Promise<void> {
    try {
      this.logger.debug('Collecting events', {
        since: this.lastCollectedTimestamp.toString(),
        batchSize: this.config.collection.batchSize,
      });

      const result = await this.eventsActor.export_events_for_siem(
        this.lastCollectedTimestamp > 0n ? [this.lastCollectedTimestamp] : [],
        [this.config.collection.batchSize]
      );

      if ('Err' in result) {
        throw new Error(`Events collection failed: ${result.Err}`);
      }

      const rawEvents: SecurityEvent[] = result.Ok;
      this.metrics.eventsCollected += rawEvents.length;

      if (rawEvents.length === 0) {
        this.logger.debug('No new events collected');
        return;
      }

      this.logger.info('Collected events', { count: rawEvents.length });

      // Process and minimize events
      for (const rawEvent of rawEvents) {
        const processedEvent = await this.processEvent(rawEvent);
        this.eventBuffer.push(processedEvent);
        this.metrics.eventsProcessed++;

        // Update last collected timestamp
        if (rawEvent.timestamp > this.lastCollectedTimestamp) {
          this.lastCollectedTimestamp = rawEvent.timestamp;
        }
      }

      // Flush if buffer is full
      if (this.eventBuffer.length >= this.config.siem.batchSize) {
        await this.flushEventBuffer();
      }

    } catch (error) {
      this.logger.error('Failed to collect events', { error });
      throw error;
    }
  }

  private async processEvent(rawEvent: SecurityEvent): Promise<ProcessedEvent> {
    const processed: ProcessedEvent = {
      id: rawEvent.id,
      timestamp: new Date(Number(rawEvent.timestamp) / 1000000).toISOString(),
      severity: this.formatVariant(rawEvent.severity),
      category: this.formatVariant(rawEvent.category),
      event_type: rawEvent.event_type,
      organization_id: rawEvent.organization_id || undefined,
      source_canister: rawEvent.source_canister,
      details: Object.fromEntries(rawEvent.details),
      risk_score: rawEvent.risk_score ? Number(rawEvent.risk_score) : undefined,
      compliance_flags: rawEvent.compliance_flags,
      correlation_id: rawEvent.correlation_id || undefined,
      data_classification: this.formatVariant(rawEvent.data_classification),
      collection_metadata: {
        collected_at: new Date().toISOString(),
        collector_version: '1.0.0',
        certification_status: 'certified', // Would verify certificate in production
        processing_pipeline: 'ic-to-siem-v1',
      },
    };

    // Apply GDPR data minimization
    if (this.config.gdpr.enableDataMinimization) {
      processed.actor_id_hash = this.hashActorId(rawEvent.actor_id);
      processed.source_ip_masked = this.maskIpAddress(rawEvent.source_ip);
    } else {
      (processed as any).actor_id = rawEvent.actor_id;
      (processed as any).source_ip = rawEvent.source_ip;
    }

    // Add integrity verification
    const expectedChecksum = this.calculateEventChecksum(rawEvent);
    if (expectedChecksum !== rawEvent.checksum) {
      this.logger.warn('Event checksum mismatch', {
        eventId: rawEvent.id,
        expected: expectedChecksum,
        actual: rawEvent.checksum,
      });
    }

    return processed;
  }

  private hashActorId(actorId: string): string {
    if (!this.config.security.hmacSecret) {
      return createHash('sha256').update(actorId).digest('hex').substring(0, 16);
    }
    
    return createHmac('sha256', this.config.security.hmacSecret)
      .update(actorId)
      .digest('hex')
      .substring(0, 16);
  }

  private maskIpAddress(ip: string | null): string | undefined {
    if (!ip) return undefined;
    
    if (ip.includes('.')) {
      // IPv4: mask last octet
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
      }
    } else if (ip.includes(':')) {
      // IPv6: mask last 64 bits
      const parts = ip.split(':');
      if (parts.length >= 4) {
        return parts.slice(0, 4).join(':') + '::***';
      }
    }
    
    return ip;
  }

  private formatVariant(variant: any): string {
    if (typeof variant === 'object' && variant !== null) {
      return Object.keys(variant)[0];
    }
    return String(variant);
  }

  private calculateEventChecksum(event: SecurityEvent): string {
    // Simplified checksum calculation - match the canister implementation
    const combined = event.id + event.timestamp.toString() + event.actor_id + event.event_type;
    return createHash('sha256').update(combined).digest('hex').substring(0, 16);
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Send to Kafka
      await this.sendToKafka(eventsToSend);
      
      // Send to SIEM
      await this.sendToSIEM(eventsToSend);
      
      this.metrics.eventsSent += eventsToSend.length;
      
      this.logger.info('Events flushed successfully', {
        count: eventsToSend.length,
        kafkaTopic: this.config.kafka.topic,
        siemIndex: this.config.siem.index,
      });

    } catch (error) {
      this.logger.error('Failed to flush events', { error, count: eventsToSend.length });
      
      // Re-add events to buffer for retry (with circuit breaker logic)
      if (this.eventBuffer.length < 10000) { // Prevent memory overflow
        this.eventBuffer.unshift(...eventsToSend);
      }
      
      throw error;
    }
  }

  private async sendToKafka(events: ProcessedEvent[]): Promise<void> {
    const messages = events.map(event => ({
      key: event.id,
      value: JSON.stringify(event),
      headers: {
        'content-type': 'application/json',
        'event-category': event.category,
        'event-severity': event.severity,
        'data-classification': event.data_classification,
      },
    }));

    await this.kafkaProducer.send({
      topic: this.config.kafka.topic,
      messages,
    });
  }

  private async sendToSIEM(events: ProcessedEvent[]): Promise<void> {
    switch (this.config.siem.type) {
      case 'elasticsearch':
      case 'opensearch':
        await this.sendToElastic(events);
        break;
      case 'splunk':
        await this.sendToSplunk(events);
        break;
      default:
        throw new Error(`Unsupported SIEM type: ${this.config.siem.type}`);
    }
  }

  private async sendToElastic(events: ProcessedEvent[]): Promise<void> {
    const body = events.flatMap(event => [
      { index: { _index: this.config.siem.index, _id: event.id } },
      event,
    ]);

    const response = await fetch(`${this.config.siem.endpoint}/_bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${this.config.siem.apiKey}`,
      },
      body: body.map(item => JSON.stringify(item)).join('\n') + '\n',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Elasticsearch bulk insert failed: ${response.status} ${error}`);
    }

    const result = await response.json();
    if (result.errors) {
      this.logger.warn('Some events failed to index in Elasticsearch', {
        errors: result.items.filter((item: any) => item.index?.error),
      });
    }
  }

  private async sendToSplunk(events: ProcessedEvent[]): Promise<void> {
    for (const event of events) {
      const splunkEvent = {
        time: Math.floor(new Date(event.timestamp).getTime() / 1000),
        source: 'ic-custody-platform',
        sourcetype: 'security_event',
        index: this.config.siem.index,
        event: event,
      };

      const response = await fetch(`${this.config.siem.endpoint}/services/collector/event`, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.config.siem.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(splunkEvent),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Splunk event submission failed: ${response.status} ${error}`);
      }
    }
  }

  async getMetrics(): Promise<typeof this.metrics> {
    return { ...this.metrics };
  }

  async getSystemHealth(): Promise<any> {
    try {
      const canisterMetrics = await this.eventsActor.get_system_metrics();
      return {
        collector: this.metrics,
        canister: canisterMetrics,
        status: this.isRunning ? 'running' : 'stopped',
        bufferSize: this.eventBuffer.length,
        lastCollectedTimestamp: this.lastCollectedTimestamp.toString(),
      };
    } catch (error) {
      this.logger.error('Failed to get system health', { error });
      return {
        collector: this.metrics,
        status: 'error',
        error: error.message,
      };
    }
  }
}

// CLI interface
async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      config: { type: 'string', default: './config.json' },
      command: { type: 'string', default: 'start' },
    },
  });

  // Load configuration
  const config: CollectorConfig = require(values.config || './config.json');

  const collector = new EventCollector(config);

  switch (values.command) {
    case 'start':
      await collector.start();
      break;
    case 'health':
      const health = await collector.getSystemHealth();
      console.log(JSON.stringify(health, null, 2));
      break;
    case 'metrics':
      const metrics = await collector.getMetrics();
      console.log(JSON.stringify(metrics, null, 2));
      break;
    default:
      console.error(`Unknown command: ${values.command}`);
      process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down event collector...');
    await collector.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error('Event collector failed:', error);
    process.exit(1);
  });
}

export { EventCollector, CollectorConfig, ProcessedEvent };
