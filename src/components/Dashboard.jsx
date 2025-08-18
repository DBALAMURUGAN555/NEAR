import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { 
  ShieldCheckIcon, 
  BanknotesIcon, 
  ExclamationTriangleIcon, 
  ClockIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { formatCurrency, formatBTC } from '../lib/utils';

const portfolioData = {
  totalValue: 24750000,
  btcHoldings: 425.6789,
  accounts: 8,
  pendingTransactions: 3,
  riskScore: 'LOW',
  complianceStatus: 'COMPLIANT'
};

const transactions = [
  {
    id: 'tx-001',
    type: 'withdrawal',
    amount: 2.5,
    currency: 'BTC',
    from: 'Treasury Vault A',
    to: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
    status: 'pending_approval',
    requester: 'Treasury Manager',
    created: '2024-01-15T10:30:00Z',
    approvals: 2,
    required: 3,
    riskLevel: 'medium'
  },
  {
    id: 'tx-002',
    type: 'internal_transfer',
    amount: 10.0,
    currency: 'BTC',
    from: 'Cold Storage',
    to: 'Hot Wallet',
    status: 'approved',
    requester: 'Operations Lead',
    created: '2024-01-15T09:15:00Z',
    approvals: 3,
    required: 3,
    riskLevel: 'low'
  },
  {
    id: 'tx-003',
    type: 'deposit',
    amount: 5.75,
    currency: 'BTC',
    from: 'External Counterparty',
    to: 'Custody Vault B',
    status: 'confirming',
    created: '2024-01-15T08:45:00Z',
    confirmations: 4,
    required: 6,
    riskLevel: 'low'
  }
];

const accounts = [
  {
    id: 'vault-a',
    name: 'Treasury Vault A',
    type: 'Cold Storage',
    balance: 125.4567,
    value: 7820000,
    riskLevel: 'low',
    lastActivity: '2024-01-14T16:20:00Z'
  },
  {
    id: 'vault-b',
    name: 'Custody Vault B',
    type: 'Multi-Sig',
    balance: 89.2345,
    value: 5590000,
    riskLevel: 'low',
    lastActivity: '2024-01-15T11:30:00Z'
  },
  {
    id: 'hot-wallet',
    name: 'Operations Hot Wallet',
    type: 'Hot Wallet',
    balance: 15.6789,
    value: 982000,
    riskLevel: 'medium',
    lastActivity: '2024-01-15T12:45:00Z'
  }
];

const riskAlerts = [
  {
    id: 'alert-001',
    type: 'velocity',
    severity: 'medium',
    message: 'Unusual transaction velocity detected in Hot Wallet',
    timestamp: '2024-01-15T11:20:00Z'
  },
  {
    id: 'alert-002',
    type: 'compliance',
    severity: 'high',
    message: 'KYC verification required for new counterparty',
    timestamp: '2024-01-15T10:45:00Z'
  }
];

const StatCard = ({ title, value, change, icon: Icon, trend = 'neutral' }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {change && (
          <p className={`text-sm ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-muted-foreground'
          }`}>
            {change}
          </p>
        )}
      </div>
      <div className="h-8 w-8 text-muted-foreground">
        <Icon className="h-full w-full" />
      </div>
    </div>
  </Card>
);

const TransactionRow = ({ transaction }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_approval': return 'text-amber-600 bg-amber-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'confirming': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <tr className="border-b">
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <BanknotesIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{transaction.id}</div>
            <div className="text-sm text-gray-500">{transaction.type.replace('_', ' ')}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{formatBTC(transaction.amount)}</div>
        <div className="text-sm text-gray-500">{transaction.currency}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">{transaction.from}</div>
        <div className="text-sm text-gray-500">→ {transaction.to.length > 20 ? 
          `${transaction.to.slice(0, 20)}...` : transaction.to}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
          {transaction.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(transaction.riskLevel)}`}>
          {transaction.riskLevel}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {transaction.approvals && (
          <div className="text-sm text-gray-900">
            {transaction.approvals}/{transaction.required}
          </div>
        )}
        {transaction.confirmations && (
          <div className="text-sm text-gray-900">
            {transaction.confirmations}/{transaction.required} confirmations
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Button variant="ghost" size="sm">
          <EyeIcon className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};

const AccountCard = ({ account }) => (
  <Card className="p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
        <p className="text-sm text-gray-500 mb-2">{account.type}</p>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">{formatBTC(account.balance)}</p>
          <p className="text-sm text-gray-500">{formatCurrency(account.value)}</p>
        </div>
      </div>
      <div className="flex flex-col items-end space-y-2">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          account.riskLevel === 'low' ? 'text-green-600 bg-green-50' :
          account.riskLevel === 'medium' ? 'text-amber-600 bg-amber-50' :
          'text-red-600 bg-red-50'
        }`}>
          {account.riskLevel} risk
        </span>
        <p className="text-xs text-gray-500">
          Last: {new Date(account.lastActivity).toLocaleString()}
        </p>
      </div>
    </div>
  </Card>
);

const AlertBanner = ({ alert }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-4 rounded-lg border-l-4 ${
      alert.severity === 'high' ? 'bg-red-50 border-red-400' :
      alert.severity === 'medium' ? 'bg-amber-50 border-amber-400' :
      'bg-blue-50 border-blue-400'
    }`}
  >
    <div className="flex items-start">
      <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 ${
        alert.severity === 'high' ? 'text-red-400' :
        alert.severity === 'medium' ? 'text-amber-400' :
        'text-blue-400'
      }`} />
      <div className="ml-3 flex-1">
        <p className={`text-sm font-medium ${
          alert.severity === 'high' ? 'text-red-800' :
          alert.severity === 'medium' ? 'text-amber-800' :
          'text-blue-800'
        }`}>
          {alert.message}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(alert.timestamp).toLocaleString()}
        </p>
      </div>
      <Button variant="ghost" size="sm">
        <XCircleIcon className="h-4 w-4" />
      </Button>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Custody Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {user?.firstName}. Monitor and manage your digital asset custody operations.
          </p>
        </div>

        {/* Risk Alerts */}
        {riskAlerts.length > 0 && (
          <div className="mb-8 space-y-4">
            {riskAlerts.map((alert) => (
              <AlertBanner key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Portfolio Value"
            value={formatCurrency(portfolioData.totalValue)}
            change="+2.4% (24h)"
            icon={BanknotesIcon}
            trend="up"
          />
          <StatCard
            title="Bitcoin Holdings"
            value={formatBTC(portfolioData.btcHoldings)}
            change="+0.15 BTC (7d)"
            icon={ShieldCheckIcon}
            trend="up"
          />
          <StatCard
            title="Active Accounts"
            value={portfolioData.accounts.toString()}
            icon={UserGroupIcon}
          />
          <StatCard
            title="Pending Actions"
            value={portfolioData.pendingTransactions.toString()}
            icon={ClockIcon}
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Portfolio Overview', icon: ChartBarIcon },
              { id: 'transactions', name: 'Transactions', icon: DocumentTextIcon },
              { id: 'accounts', name: 'Accounts', icon: UserGroupIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
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
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Portfolio Distribution</h2>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Portfolio chart will be integrated here</p>
                  </div>
                </Card>
              </div>
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3" />
                    <div>
                      <p className="font-medium text-green-900">Fully Compliant</p>
                      <p className="text-sm text-gray-500">All checks passed</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium text-green-900">Low Risk</p>
                      <p className="text-sm text-gray-500">All systems normal</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <Card>
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Recent Transactions</h2>
                  <Button>New Transaction</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <TransactionRow key={transaction.id} transaction={transaction} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'accounts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
