import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Percent,
  Shield,
  Users,
  Activity,
  Clock,
  Eye,
  BarChart3,
  Zap,
  FileText,
  Lock,
  Globe,
  Target,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface MetricData {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: any;
  description: string;
  category: 'financial' | 'operational' | 'compliance' | 'security';
}

interface CustodyAccount {
  id: string;
  institution: string;
  type: 'Corporate' | 'Government' | 'Institutional' | 'Trust';
  balance: number;
  status: 'Active' | 'Pending' | 'Frozen';
  riskRating: 'Low' | 'Medium' | 'High';
  complianceStatus: 'Compliant' | 'Pending KYC' | 'Requires Review';
  lastActivity: string;
}

interface Transaction {
  id: string;
  account: string;
  type: 'Deposit' | 'Withdrawal' | 'Transfer' | 'Emergency';
  amount: number;
  currency: string;
  status: 'Pending' | 'Approved' | 'Executed' | 'Rejected';
  timestamp: string;
  approvalsRequired: number;
  approvalsReceived: number;
  riskScore: number;
}

export function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  
  // Real-time metrics that would come from your canisters
  const [metrics, setMetrics] = useState<MetricData[]>([
    {
      title: 'Assets Under Custody',
      value: '$2.47B',
      change: '+12.3%',
      changeType: 'positive' as const,
      icon: DollarSign,
      description: 'Total institutional assets',
      category: 'financial'
    },
    {
      title: 'Active Accounts',
      value: '1,247',
      change: '+23',
      changeType: 'positive' as const,
      icon: Users,
      description: 'Institutional custody accounts',
      category: 'operational'
    },
    {
      title: 'Compliance Score',
      value: '98.7%',
      change: '+0.2%',
      changeType: 'positive' as const,
      icon: Shield,
      description: 'KYC/AML compliance rating',
      category: 'compliance'
    },
    {
      title: 'Security Rating',
      value: 'AAA',
      change: 'Stable',
      changeType: 'neutral' as const,
      icon: Lock,
      description: 'Institutional security grade',
      category: 'security'
    },
    {
      title: 'Transaction Volume',
      value: '$847M',
      change: '+18.4%',
      changeType: 'positive' as const,
      icon: Activity,
      description: '24h transaction volume',
      category: 'operational'
    },
    {
      title: 'Average Yield',
      value: '8.4%',
      change: '+0.3%',
      changeType: 'positive' as const,
      icon: Percent,
      description: 'Institutional yield average',
      category: 'financial'
    },
    {
      title: 'Risk-Adjusted Return',
      value: '12.7%',
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: Target,
      description: 'Sharpe ratio equivalent',
      category: 'financial'
    },
    {
      title: 'Uptime',
      value: '99.97%',
      change: 'SLA Met',
      changeType: 'positive' as const,
      icon: Zap,
      description: 'Platform availability',
      category: 'operational'
    }
  ]);
  
  // Mock data for institutional accounts
  const custodyAccounts: CustodyAccount[] = [
    {
      id: 'acc_001',
      institution: 'JPMorgan Chase Bank',
      type: 'Corporate',
      balance: 125000000,
      status: 'Active',
      riskRating: 'Low',
      complianceStatus: 'Compliant',
      lastActivity: '2 hours ago'
    },
    {
      id: 'acc_002',
      institution: 'US Treasury Department',
      type: 'Government',
      balance: 89500000,
      status: 'Active',
      riskRating: 'Low',
      complianceStatus: 'Compliant',
      lastActivity: '45 minutes ago'
    },
    {
      id: 'acc_003',
      institution: 'Goldman Sachs Asset Management',
      type: 'Institutional',
      balance: 234000000,
      status: 'Active',
      riskRating: 'Medium',
      complianceStatus: 'Compliant',
      lastActivity: '12 minutes ago'
    },
    {
      id: 'acc_004',
      institution: 'Fidelity Digital Assets',
      type: 'Trust',
      balance: 67800000,
      status: 'Pending',
      riskRating: 'Low',
      complianceStatus: 'Pending KYC',
      lastActivity: '3 hours ago'
    }
  ];
  
  // Mock high-value transactions requiring attention
  const pendingTransactions: Transaction[] = [
    {
      id: 'tx_001',
      account: 'JPMorgan Chase Bank',
      type: 'Withdrawal',
      amount: 15000000,
      currency: 'USD',
      status: 'Pending',
      timestamp: '15 minutes ago',
      approvalsRequired: 3,
      approvalsReceived: 2,
      riskScore: 6
    },
    {
      id: 'tx_002',
      account: 'Goldman Sachs Asset Management',
      type: 'Transfer',
      amount: 25000000,
      currency: 'USD',
      status: 'Approved',
      timestamp: '1 hour ago',
      approvalsRequired: 4,
      approvalsReceived: 4,
      riskScore: 4
    },
    {
      id: 'tx_003',
      account: 'US Treasury Department',
      type: 'Emergency',
      amount: 0,
      currency: 'N/A',
      status: 'Pending',
      timestamp: '30 minutes ago',
      approvalsRequired: 5,
      approvalsReceived: 3,
      riskScore: 9
    }
  ];
  
  const refreshData = async () => {
    setRefreshing(true);
    // In production, this would fetch real data from your canisters
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };
  
  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': case 'Compliant': case 'Executed': case 'Approved': return 'text-green-600 bg-green-50';
      case 'Pending': case 'Pending KYC': return 'text-yellow-600 bg-yellow-50';
      case 'Frozen': case 'Rejected': case 'Requires Review': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  const getRiskColor = (rating: string | number) => {
    if (typeof rating === 'string') {
      switch (rating) {
        case 'Low': return 'text-green-600 bg-green-50';
        case 'Medium': return 'text-yellow-600 bg-yellow-50';
        case 'High': return 'text-red-600 bg-red-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    }
    // For numeric risk scores (1-10)
    if (rating <= 3) return 'text-green-600 bg-green-50';
    if (rating <= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Institutional Custody Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring and analytics for institutional digital asset custody</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Live</span>
          </div>
          <select 
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last Week</option>
            <option value="30d">Last Month</option>
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const categoryColor = {
            financial: 'bg-green-50 text-green-600',
            operational: 'bg-blue-50 text-blue-600',
            compliance: 'bg-purple-50 text-purple-600',
            security: 'bg-red-50 text-red-600'
          }[metric.category];
          
          return (
            <div key={metric.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${categoryColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center text-sm font-medium ${
                  metric.changeType === 'positive' ? 'text-green-600' : 
                  metric.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {metric.changeType === 'positive' && <TrendingUp className="w-4 h-4 mr-1" />}
                  {metric.changeType === 'negative' && <TrendingDown className="w-4 h-4 mr-1" />}
                  {metric.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
              <p className="text-sm text-gray-600">{metric.description}</p>
              <p className="text-xs font-medium text-gray-500 mt-2">{metric.title}</p>
            </div>
          );
        })}
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Institutional Accounts Overview */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Institutional Custody Accounts</h3>
            <button className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
              <Eye className="w-4 h-4" />
              <span>View All</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {custodyAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                    {account.institution.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{account.institution}</h4>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                        {account.status}
                      </span>
                      <span className="text-xs text-gray-500">{account.type}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{account.lastActivity}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(account.balance)}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(account.riskRating)}`}>
                      {account.riskRating} Risk
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.complianceStatus)}`}>
                      {account.complianceStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Regulatory Update Required</p>
                <p className="text-xs text-amber-600 mt-1">New KYC requirements for institutional accounts above $50M. 3 accounts require updates.</p>
              </div>
            </div>
          </div>
        </div>

        {/* High-Priority Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Priority Transactions</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Real-time</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {pendingTransactions.map((tx) => (
              <div key={tx.id} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                    <span className="text-xs text-gray-500">{tx.type}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(tx.riskScore)}`}>
                    Risk: {tx.riskScore}/10
                  </span>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900">{tx.account}</p>
                  <p className="text-xs text-gray-500 mt-1">{tx.timestamp}</p>
                </div>
                
                {tx.amount > 0 && (
                  <div className="text-sm font-semibold text-gray-900 mb-3">
                    {formatCurrency(tx.amount)} {tx.currency}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    Approvals: {tx.approvalsReceived}/{tx.approvalsRequired}
                  </span>
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{ width: `${(tx.approvalsReceived / tx.approvalsRequired) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              View Transaction Queue
            </button>
          </div>
        </div>
      </div>

      {/* Risk & Compliance Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Risk Analytics</h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Portfolio Risk Score</span>
                <span className="text-sm font-bold text-green-600">4.2/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '42%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Low risk - within institutional parameters</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Concentration Risk</span>
                <span className="text-sm font-bold text-yellow-600">6.1/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '61%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Medium - consider diversification</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Liquidity Risk</span>
                <span className="text-sm font-bold text-green-600">2.8/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '28%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Low - adequate liquidity buffers</p>
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Compliance Dashboard</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">KYC/AML Status</p>
                  <p className="text-xs text-green-600">All accounts compliant</p>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Audit Trail</p>
                  <p className="text-xs text-green-600">Complete & tamper-proof</p>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Sanctions Screening</p>
                  <p className="text-xs text-yellow-600">2 pending reviews</p>
                </div>
              </div>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Regulatory Reporting</p>
                  <p className="text-xs text-green-600">Automated & up-to-date</p>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* System Health & Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">System Health & Recent Activity</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>All Systems Operational</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>99.97% Uptime</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">API Response</span>
              <span className="text-xs text-green-600 font-semibold">142ms</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Security Score</span>
              <span className="text-xs text-green-600 font-semibold">AAA</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }}></div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Throughput</span>
              <span className="text-xs text-blue-600 font-semibold">847 TPS</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Storage</span>
              <span className="text-xs text-yellow-600 font-semibold">78%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}