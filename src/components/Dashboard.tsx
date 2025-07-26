import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Percent } from 'lucide-react';

export function Dashboard() {
  const stats = [
    {
      title: 'Total Vault Value',
      value: '$127,500',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: DollarSign,
      description: 'Combined collateral value'
    },
    {
      title: 'BTC Yield Earned',
      value: '0.0847 BTC',
      change: '+12.4%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      description: 'This month'
    },
    {
      title: 'Health Factor',
      value: '2.34',
      change: '-0.1',
      changeType: 'negative' as const,
      icon: CheckCircle,
      description: 'Safe (>1.5)'
    },
    {
      title: 'APY Rate',
      value: '8.7%',
      change: '+0.3%',
      changeType: 'positive' as const,
      icon: Percent,
      description: 'Current BTC yield'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-orange-600" />
                </div>
                <div className={`flex items-center text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changeType === 'positive' ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.description}</p>
              <p className="text-xs font-medium text-gray-500 mt-2">{stat.title}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collateral Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Collateral Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Bitcoin (ckBTC)</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">1.85 BTC</p>
                <p className="text-xs text-gray-500">65% • $78,500</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '65%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Internet Computer (ICP)</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">2,180 ICP</p>
                <p className="text-xs text-gray-500">25% • $30,200</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '25%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">USDC Stable</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">18,800 USDC</p>
                <p className="text-xs text-gray-500">10% • $18,800</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }}></div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">AI Optimization Available</p>
                <p className="text-xs text-blue-600 mt-1">Rebalancing to 70/20/10 could increase your yield by 0.3% APY</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Monitor */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Risk Monitor</h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Health Factor</span>
                <span className="text-sm font-bold text-green-600">2.34</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '78%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Safe zone (&gt;1.5)</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Liquidation Risk</span>
                <span className="text-sm font-bold text-green-600">Low</span>
              </div>
              <div className="text-xs text-gray-500">
                Price would need to fall <strong>57%</strong> to trigger liquidation
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Alerts</h4>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">Yield distribution completed</p>
                    <p className="text-xs text-gray-400">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">BTC volatility increased</p>
                    <p className="text-xs text-gray-400">6 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'Yield Distribution', amount: '+0.0042 BTC', time: '2 hours ago', status: 'completed' },
            { action: 'Collateral Deposit', amount: '+250 ICP', time: '1 day ago', status: 'completed' },
            { action: 'Borrow', amount: '-0.15 BTC', time: '3 days ago', status: 'completed' },
            { action: 'KYC Upgrade', amount: 'Tier 1 → Tier 2', time: '1 week ago', status: 'completed' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{activity.amount}</p>
                <div className="flex items-center justify-end mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500 capitalize">{activity.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}