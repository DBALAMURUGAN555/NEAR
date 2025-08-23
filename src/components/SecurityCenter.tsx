import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Users, 
  Activity, 
  Settings,
  RefreshCw,
  Filter,
  Download,
  Bell,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { securityMonitor, SecurityEvent, SecurityEventType, SecuritySeverity } from '@/lib/security';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  suspiciousActivities: number;
  rateLimitViolations: number;
}

export default function SecurityCenter() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    mediumEvents: 0,
    lowEvents: 0,
    suspiciousActivities: 0,
    rateLimitViolations: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState<SecuritySeverity | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshEvents();
    
    // Set up real-time alerts
    const alertHandler = (event: SecurityEvent) => {
      console.log('Security Alert:', event);
      // In production, this would trigger notifications, emails, etc.
      refreshEvents();
    };
    
    securityMonitor.onAlert(alertHandler);

    // Refresh events every 30 seconds
    const interval = setInterval(refreshEvents, 30000);
    return () => clearInterval(interval);
  }, [refreshEvents]);

  const refreshEvents = React.useCallback(() => {
    setIsRefreshing(true);
    const recentEvents = securityMonitor.getRecentEvents(200);
    setEvents(recentEvents);
    calculateMetrics(recentEvents);
    setIsRefreshing(false);
  }, []);

  const calculateMetrics = React.useCallback((eventList: SecurityEvent[]) => {
    const newMetrics: SecurityMetrics = {
      totalEvents: eventList.length,
      criticalEvents: eventList.filter(e => e.severity === SecuritySeverity.CRITICAL).length,
      highEvents: eventList.filter(e => e.severity === SecuritySeverity.HIGH).length,
      mediumEvents: eventList.filter(e => e.severity === SecuritySeverity.MEDIUM).length,
      lowEvents: eventList.filter(e => e.severity === SecuritySeverity.LOW).length,
      suspiciousActivities: eventList.filter(e => e.eventType === SecurityEventType.SUSPICIOUS_ACTIVITY).length,
      rateLimitViolations: eventList.filter(e => e.eventType === SecurityEventType.RATE_LIMIT_EXCEEDED).length,
    };
    setMetrics(newMetrics);
  }, []);

  const getFilteredEvents = () => {
    if (selectedFilter === 'all') return events;
    return events.filter(event => event.severity === selectedFilter);
  };

  const getSeverityColor = (severity: SecuritySeverity) => {
    switch (severity) {
      case SecuritySeverity.CRITICAL: return 'text-red-600 bg-red-50 border-red-200';
      case SecuritySeverity.HIGH: return 'text-orange-600 bg-orange-50 border-orange-200';
      case SecuritySeverity.MEDIUM: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case SecuritySeverity.LOW: return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getEventIcon = (eventType: SecurityEventType) => {
    switch (eventType) {
      case SecurityEventType.LOGIN_ATTEMPT:
      case SecurityEventType.LOGIN_SUCCESS:
      case SecurityEventType.LOGIN_FAILURE:
        return <Users className="w-4 h-4" />;
      case SecurityEventType.TRANSACTION_INITIATED:
      case SecurityEventType.TRANSACTION_APPROVED:
      case SecurityEventType.TRANSACTION_REJECTED:
        return <Activity className="w-4 h-4" />;
      case SecurityEventType.ADMIN_ACTION:
        return <Settings className="w-4 h-4" />;
      case SecurityEventType.EMERGENCY_ACTION:
        return <AlertTriangle className="w-4 h-4" />;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return <Eye className="w-4 h-4" />;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        return <XCircle className="w-4 h-4" />;
      case SecurityEventType.ACCESS_DENIED:
        return <Lock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportEvents = () => {
    const csvContent = [
      'Timestamp,Event Type,Principal,Details,Severity,IP Address',
      ...getFilteredEvents().map(event => 
        `${formatTimestamp(event.timestamp)},"${event.eventType}","${event.principal}","${event.details}","${event.severity}","${event.ipAddress || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Operations Center</h1>
            <p className="text-gray-600 mt-2">Real-time security monitoring and threat detection</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={refreshEvents}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportEvents}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalEvents}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.criticalEvents}</div>
              <p className="text-xs text-muted-foreground">Requires immediate attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Severity</CardTitle>
              <Shield className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.highEvents}</div>
              <p className="text-xs text-muted-foreground">Investigation required</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspicious Activities</CardTitle>
              <Eye className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{metrics.suspiciousActivities}</div>
              <p className="text-xs text-muted-foreground">Pattern detection</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Security Events</CardTitle>
            <CardDescription>Real-time security event monitoring and analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by severity:</span>
              </div>
              <div className="flex space-x-2">
                {(['all', SecuritySeverity.CRITICAL, SecuritySeverity.HIGH, SecuritySeverity.MEDIUM, SecuritySeverity.LOW] as const).map((severity) => (
                  <Button
                    key={severity}
                    variant={selectedFilter === severity ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter(severity)}
                  >
                    {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getFilteredEvents().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>No security events found</p>
                  <p className="text-sm">All systems are operating normally</p>
                </div>
              ) : (
                getFilteredEvents().map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(event.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">
                              {event.eventType.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                              {event.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm mb-1">{event.details}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <span>Principal: {event.principal}</span>
                            {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Operational Controls</CardTitle>
              <CardDescription>Emergency and administrative security controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <AlertTriangle className="w-6 h-6 mb-2 text-red-600" />
                  <span className="text-sm">Emergency Freeze</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <Shield className="w-6 h-6 mb-2 text-blue-600" />
                  <span className="text-sm">Security Audit</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <Users className="w-6 h-6 mb-2 text-green-600" />
                  <span className="text-sm">Access Review</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <Settings className="w-6 h-6 mb-2 text-gray-600" />
                  <span className="text-sm">Policy Update</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current security system health and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Security Monitoring</p>
                      <p className="text-sm text-green-600">Active and operational</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Rate Limiting</p>
                      <p className="text-sm text-green-600">Protection active</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Threat Detection</p>
                      <p className="text-sm text-green-600">Pattern analysis running</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">Alert System</p>
                      <p className="text-sm text-blue-600">Notifications enabled</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
