import React, { useState } from 'react';
import { Settings, AlertTriangle, Pause, Play, Users, TrendingUp, Shield, Database } from 'lucide-react';

export function AdminPanel() {
  const [systemStatus, setSystemStatus] = useState<'active' | 'maintenance' | 'emergency'>('active');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'parameters' | 'users' | 'security'>('overview');

  const systemMetrics = [
    { label: 'Total TVL', value: '$545.2M', change: '+2.1%', status: 'healthy' },
    { label: 'Active Vaults', value: '8,421', change: '+156', status: 'healthy' },
    { label: 'Liquidations (24h)', value: '12', change: '-3', status: 'normal' },
    { label: 'System Health', value: '99.8%', change: '0%', status: 'healthy' }
  ];

  const vaultParameters = [
    { name: 'Min Collateral Ratio', current: '150%', recommended: '150%', category: 'Risk' },
    { name: 'Liquidation Penalty', current: '12.5%', recommended: '12.5%', category: 'Risk' },
    { name: 'Base Interest Rate', current: '5.2%', recommended: '5.5%', category: 'Rates' },
    { name: 'Max Loan-to-Value', current: '67%', recommended: '65%', category: 'Risk' },
    { name: 'Emergency Shutdown Delay', current: '24h', recommended: '24h', category: 'Security' }
  ];

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
    { id: 'parameters' as const, label: 'Parameters', icon: Settings },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'security' as const, label: 'Security', icon: Shield }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSystemStatus('maintenance')}
              className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Maintenance</span>
            </button>
            <button
              onClick={() => setSystemStatus('emergency')}
              className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Emergency Stop</span>
            </button>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg border-2 ${
          systemStatus === 'active' 
            ? 'border-green-200 bg-green-50' 
            : systemStatus === 'maintenance'
            ? 'border-yellow-200 bg-yellow-50'
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center space-x-3">
            {systemStatus === 'active' ? (
              <Play className="w-6 h-6 text-green-600" />
            ) : systemStatus === 'maintenance' ? (
              <Pause className="w-6 h-6 text-yellow-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <p className={`font-medium ${
                systemStatus === 'active' ? 'text-green-800' :
                systemStatus === 'maintenance' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                System Status: {systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}
              </p>
              <p className={`text-sm ${
                systemStatus === 'active' ? 'text-green-600' :
                systemStatus === 'maintenance' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                All systems operational • Last updated: 2 minutes ago
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemMetrics.map((metric) => (
          <div key={metric.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{metric.label}</p>
              <div className={`w-2 h-2 rounded-full ${
                metric.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className={`text-sm ${
              metric.change.startsWith('+') ? 'text-green-600' : 
              metric.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'
            }`}>
              {metric.change} from yesterday
            </p>
          </div>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Admin Activities</h3>
        <div className="space-y-3">
          {[
            { action: 'Parameter Update', details: 'Base interest rate: 5.2% → 5.5%', time: '10 minutes ago', user: 'admin@btcvaults.com' },
            { action: 'Emergency Pause', details: 'Vault #1247 liquidation paused for review', time: '2 hours ago', user: 'security@btcvaults.com' },
            { action: 'Oracle Update', details: 'Added new Chainlink price feed', time: '6 hours ago', user: 'ops@btcvaults.com' },
            { action: 'User Verification', details: 'KYC Tier 2 approved for user #8429', time: '1 day ago', user: 'compliance@btcvaults.com' }
          ].map((activity, index) => (
            <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-600">{activity.details}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.user}</p>
              </div>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderParameters = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Vault Parameters</h3>
        <div className="space-y-4">
          {vaultParameters.map((param) => (
            <div key={param.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{param.name}</p>
                <p className="text-xs text-gray-500">{param.category}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{param.current}</p>
                  <p className="text-xs text-gray-500">Current</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    param.current === param.recommended ? 'text-green-600' : 'text-orange-600'
                  }`}>{param.recommended}</p>
                  <p className="text-xs text-gray-500">Recommended</p>
                </div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors">
                  Update
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Administrative Access</h4>
            <p className="text-sm text-red-700 mt-1">
              You are accessing the administrative control panel. All actions are logged and require multi-signature approval. 
              Use extreme caution when modifying system parameters.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverview()}
      {selectedTab === 'parameters' && renderParameters()}
      {selectedTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
          <p className="text-gray-600">User management interface would be implemented here.</p>
        </div>
      )}
      {selectedTab === 'security' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Controls</h3>
          <p className="text-gray-600">Security monitoring and controls would be implemented here.</p>
        </div>
      )}
    </div>
  );
}