import { useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { securityMonitor, SecurityEventType, SecuritySeverity } from '@/lib/security';

export function useSecurity() {
  const { user } = useUser();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn && user) {
      // Log successful login
      securityMonitor.logEvent({
        eventType: SecurityEventType.LOGIN_SUCCESS,
        principal: user.primaryEmailAddress?.emailAddress || user.id,
        details: `User ${user.primaryEmailAddress?.emailAddress || user.id} successfully authenticated`,
        severity: SecuritySeverity.LOW,
        ipAddress: undefined, // Would be captured from request headers in production
        userAgent: navigator.userAgent,
      });
    }
  }, [isSignedIn, user]);

  const logSecurityEvent = (
    eventType: SecurityEventType,
    details: string,
    severity: SecuritySeverity = SecuritySeverity.MEDIUM
  ) => {
    if (user) {
      securityMonitor.logEvent({
        eventType,
        principal: user.primaryEmailAddress?.emailAddress || user.id,
        details,
        severity,
        ipAddress: undefined,
        userAgent: navigator.userAgent,
      });
    }
  };

  const logTransactionEvent = (
    eventType: SecurityEventType.TRANSACTION_INITIATED | SecurityEventType.TRANSACTION_APPROVED | SecurityEventType.TRANSACTION_REJECTED,
    transactionId: string,
    amount?: string,
    recipient?: string
  ) => {
    const details = `Transaction ${eventType}: ${transactionId}${amount ? ` Amount: ${amount}` : ''}${recipient ? ` Recipient: ${recipient}` : ''}`;
    logSecurityEvent(eventType, details, SecuritySeverity.MEDIUM);
  };

  const logAdminAction = (action: string, details: string) => {
    logSecurityEvent(SecurityEventType.ADMIN_ACTION, `Admin action: ${action} - ${details}`, SecuritySeverity.HIGH);
  };

  const logEmergencyAction = (action: string, reason: string) => {
    logSecurityEvent(SecurityEventType.EMERGENCY_ACTION, `Emergency action: ${action} - Reason: ${reason}`, SecuritySeverity.CRITICAL);
  };

  const checkRateLimit = (identifier: string): boolean => {
    return securityMonitor.checkRateLimit(identifier);
  };

  return {
    logSecurityEvent,
    logTransactionEvent,
    logAdminAction,
    logEmergencyAction,
    checkRateLimit,
    user,
    isSignedIn,
  };
}
