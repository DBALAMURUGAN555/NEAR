import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheckIcon,
  ServerIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  SignalIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface SystemMetric {
  name: string;
  value: string | number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
  trend?: 'up' | 'down' | 'stable';
  description: string;
}

interface SecurityAlert {
  id: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'security' | 'compliance' | 'system' | 'network';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  actionRequired: boolean;
}

const systemMetrics: SystemMetric[] = [
  {
    name: 'System Uptime',
    value: '99.98%',
    status: 'healthy',
    lastUpdated: '2024-01-15T12:00:00Z',
    trend: 'stable',
    description: 'Overall system availability in the last 30 days'
  },
  {
    name: 'Canister Health',
    value: '5/5',
    status: 'healthy',
    lastUpdated: '2024-01-15T12:00:00Z',
    trend: 'stable',
    description: 'All custody canisters operational'
  },
  {
    name: 'API Response Time',
    value: '45ms',
    status: 'healthy',
    lastUpdated: '2024-01-15T12:00:00Z',
    trend: 'down',
    description: 'Average API response time'
  },
  {
    name: 'Network Latency',
    value: '12ms',
    status: 'healthy',
    lastUpdated: '2024-01-15T12:00:00Z',
    trend: 'stable',
    description: 'Network latency to ICP mainnet'
  },
  {
    name: 'Security Score',
    value: 98,
    status: 'healthy',
    lastUpdated: '2024-01-15T11:45:00Z',
    trend: 'stable',
    description: 'Overall security posture score'
  },
  {
    name: 'Compliance Status',
    value: 'Compliant',
    status: 'healthy',
    lastUpdated: '2024-01-15T11:30:00Z',
    trend: 'stable',
    description: 'Regulatory compliance status'
  },
  {
    name: 'Active Sessions',
    value: 47,
    status: 'healthy',
    lastUpdated: '2024-01-15T12:00:00Z',
    trend: 'up',
    description: 'Current active user sessions'
  },
  {
    name: 'Failed Login Attempts',
    value: 3,
    status: 'warning',
    lastUpdated: '2024-01-15T11:55:00Z',
    trend: 'up',
    description: 'Failed authentication attempts (last hour)'
  }
];

const securityAlerts: SecurityAlert[] = [
  {
    id: 'alert-001',
    level: 'medium',
    category: 'security',
    title: 'Multiple Failed Login Attempts',
    description: 'Detected 5 failed login attempts from IP 192.168.1.100 in the last 10 minutes',
    timestamp: '2024-01-15T11:50:00Z',
    resolved: false,
    actionRequired: true
  },
  {
    id: 'alert-002',
    level: 'low',
    category: 'system',
    title: 'High Memory Usage',
    description: 'Memory usage reached 85% on canister custody_core_2024',
    timestamp: '2024-01-15T11:30:00Z',
    resolved: false,
    actionRequired: false
  },
  {
    id: 'alert-003',
    level: 'high',
    category: 'compliance',
    title: 'KYC Document Expired',
    description: 'KYC document for user john.doe@institution.gov expired and requires renewal',
    timestamp: '2024-01-15T10:15:00Z',
    resolved: false,
    actionRequired: true
  },
  {
    id: 'alert-004',
    level: 'critical',
    category: 'security',
    title: 'Unusual Transaction Pattern',
    description: 'Detected unusual transaction pattern: Large withdrawal outside business hours',
    timestamp: '2024-01-15T09:45:00Z',
    resolved: true,
    actionRequired: false
  }
];

const MetricCard = ({ metric }: { metric: SystemMetric }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />;
      case 'critical':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'critical':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↗</span>;
      case 'down':
        return <span className="text-red-500">↘</span>;
      case 'stable':
        return <span className="text-gray-400">→</span>;
      default:
        return null;
    }
  };

  return (
    <Card className={`p-4 border-l-4 ${getStatusColor(metric.status)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(metric.status)}
            <h3 className="font-medium text-gray-900">{metric.name}</h3>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
            {getTrendIcon(metric.trend)}
          </div>
          <p className="text-sm text-gray-600">{metric.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            Updated: {new Date(metric.lastUpdated).toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
};

const AlertCard = ({ alert }: { alert: SecurityAlert }) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <ShieldCheckIcon className="h-4 w-4" />;
      case 'system':
        return <ServerIcon className="h-4 w-4" />;
      case 'compliance':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'network':
        return <SignalIcon className="h-4 w-4" />;
      default:
        return <BellIcon className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${alert.resolved ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${getLevelColor(alert.level)}`}>
            {getCategoryIcon(alert.category)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900">{alert.title}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(alert.level)}`}>
                {alert.level.toUpperCase()}
              </span>
              {alert.resolved && (
                <span className="px-2 py-1 text-xs font-medium rounded-full text-green-600 bg-green-50">
                  RESOLVED
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{new Date(alert.timestamp).toLocaleString()}</span>
              <span className="capitalize">{alert.category}</span>
              {alert.actionRequired && (
                <span className="text-amber-600 font-medium">Action Required</span>
              )}
            </div>
          </div>
        </div>
        {!alert.resolved && (
          <div className="flex gap-2">
            {alert.actionRequired && (
              <Button variant="outline" size="sm">
                Investigate
              </Button>
            )}
            <Button variant="ghost" size="sm">
              Acknowledge
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function SystemMonitor() {
  const [selectedTab, setSelectedTab] = useState('metrics');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
      // In a real implementation, this would fetch new data
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const criticalAlerts = securityAlerts.filter(alert => !alert.resolved && alert.level === 'critical');
  const highAlerts = securityAlerts.filter(alert => !alert.resolved && (alert.level === 'high' || alert.level === 'medium'));
  const healthyMetrics = systemMetrics.filter(metric => metric.status === 'healthy').length;
  // const warningMetrics = systemMetrics.filter(metric => metric.status === 'warning').length;
  // const criticalMetrics = systemMetrics.filter(metric => metric.status === 'critical').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            System Monitor
          </h1>
          <p className="text-gray-600">
            Real-time monitoring of system health, security, and compliance status.
          </p>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800">System Status</p>
                <p className="text-2xl font-bold text-green-900">Operational</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Healthy Metrics</p>
                <p className="text-2xl font-bold text-gray-900">{healthyMetrics}/{systemMetrics.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {criticalAlerts.length + highAlerts.length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <CpuChipIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-sm font-bold text-gray-900">
                  {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center">
                <XCircleIcon className="h-6 w-6 text-red-600 mr-3" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-900">
                    {criticalAlerts.length} Critical Alert{criticalAlerts.length !== 1 ? 's' : ''} Require Immediate Attention
                  </h3>
                  <p className="text-sm text-red-700">
                    Critical security or system issues detected. Please review and take action immediately.
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  View Critical Alerts
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'metrics', name: 'System Metrics', icon: ChartBarIcon },
              { id: 'alerts', name: 'Security Alerts', icon: ShieldCheckIcon },
              { id: 'performance', name: 'Performance', icon: CpuChipIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {selectedTab === 'metrics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemMetrics.map((metric, index) => (
                <MetricCard key={index} metric={metric} />
              ))}
            </div>
          )}

          {selectedTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Security Alerts</h2>
                <div className="flex items-center gap-4">
                  <select 
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    defaultValue="all"
                  >
                    <option value="all">All Alerts</option>
                    <option value="critical">Critical Only</option>
                    <option value="unresolved">Unresolved</option>
                    <option value="today">Today</option>
                  </select>
                  <Button variant="outline" size="sm">
                    Export Report
                  </Button>
                </div>
              </div>
              {securityAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}

          {selectedTab === 'performance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">API Performance</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Performance charts will be integrated here</p>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Resource Usage</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Resource usage metrics will be integrated here</p>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Transaction Throughput</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Transaction throughput charts will be integrated here</p>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Network Health</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Network health metrics will be integrated here</p>
                </div>
              </Card>
            </div>
          )}
        </motion.div>

        {/* Refresh Controls */}
        <div className="mt-8 flex items-center justify-between p-4 bg-white rounded-lg border">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Auto-refresh every:</span>
            <select 
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleString()}
            </span>
            <Button variant="outline" size="sm" onClick={() => setLastRefresh(new Date())}>
              Refresh Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
