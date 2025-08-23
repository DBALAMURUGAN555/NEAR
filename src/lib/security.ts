import { Principal } from '@dfinity/principal';

// Security configuration and utilities
export interface SecurityConfig {
  maxLoginAttempts: number;
  sessionTimeoutMs: number;
  requireMFA: boolean;
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: number;
  eventType: SecurityEventType;
  principal: string;
  details: string;
  severity: SecuritySeverity;
  ipAddress?: string;
  userAgent?: string;
}

export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  TRANSACTION_INITIATED = 'transaction_initiated',
  TRANSACTION_APPROVED = 'transaction_approved',
  TRANSACTION_REJECTED = 'transaction_rejected',
  ADMIN_ACTION = 'admin_action',
  EMERGENCY_ACTION = 'emergency_action',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  ACCESS_DENIED = 'access_denied',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Rate limiting utilities
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [now]);
      return true;
    }

    const requests = this.requests.get(identifier)!;
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= this.config.rateLimitMaxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  clearOldRequests() {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

// Security monitoring and alerting
export class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private rateLimiter: RateLimiter;
  private config: SecurityConfig;
  private alertCallbacks: ((event: SecurityEvent) => void)[] = [];

  constructor(config: SecurityConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config);
    
    // Clean up old rate limit data periodically
    setInterval(() => {
      this.rateLimiter.clearOldRequests();
    }, 60000); // Every minute
  }

  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.events.push(securityEvent);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Check for suspicious patterns
    this.detectSuspiciousActivity(securityEvent);

    // Trigger alerts for high/critical events
    if (securityEvent.severity === SecuritySeverity.HIGH || 
        securityEvent.severity === SecuritySeverity.CRITICAL) {
      this.triggerAlert(securityEvent);
    }
  }

  private detectSuspiciousActivity(event: SecurityEvent) {
    const recentEvents = this.events.filter(e => 
      e.timestamp > Date.now() - 300000 && // Last 5 minutes
      e.principal === event.principal
    );

    // Detect multiple failed login attempts
    const failedLogins = recentEvents.filter(e => 
      e.eventType === SecurityEventType.LOGIN_FAILURE
    );

    if (failedLogins.length >= 5) {
      this.logEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        principal: event.principal,
        details: `Multiple failed login attempts detected: ${failedLogins.length}`,
        severity: SecuritySeverity.HIGH,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      });
    }

    // Detect rapid transaction attempts
    const rapidTransactions = recentEvents.filter(e => 
      e.eventType === SecurityEventType.TRANSACTION_INITIATED
    );

    if (rapidTransactions.length >= 10) {
      this.logEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        principal: event.principal,
        details: `Rapid transaction attempts detected: ${rapidTransactions.length}`,
        severity: SecuritySeverity.MEDIUM,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      });
    }
  }

  private triggerAlert(event: SecurityEvent) {
    this.alertCallbacks.forEach(callback => callback(event));
  }

  onAlert(callback: (event: SecurityEvent) => void) {
    this.alertCallbacks.push(callback);
  }

  checkRateLimit(identifier: string): boolean {
    return this.rateLimiter.isAllowed(identifier);
  }

  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getEventsByPrincipal(principal: string, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(e => e.principal === principal)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxLoginAttempts: 5,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  requireMFA: true,
  allowedOrigins: ['https://localhost:3000', 'https://your-domain.ic0.app'],
  rateLimitWindowMs: 60 * 1000, // 1 minute
  rateLimitMaxRequests: 100,
};

// Global security monitor instance
export const securityMonitor = new SecurityMonitor(DEFAULT_SECURITY_CONFIG);

// Security utilities
export function validatePrincipal(principal: string): boolean {
  try {
    Principal.fromText(principal);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeInput(input: string): string {
  // Basic input sanitization
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 1000); // Limit length
}

export function generateSecureId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
