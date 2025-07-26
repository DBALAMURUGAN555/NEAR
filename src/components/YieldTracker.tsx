import React, { useState } from 'react';
import { TrendingUp, Calendar, Download, Zap, Clock, DollarSign } from 'lucide-react';

export function YieldTracker() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const yieldData = [
    { date: '2024-01-01', btcYield: 0.0125, usdValue: 530.25, apy: 8.2 },
    { date: '2024-01-08', btcYield: 0.0118, usdValue: 501.60, apy: 8.1 },
    { date: '2024-01-15', btcYield: 0.0132, usdValue: 561.20, apy: 8.4 },
    { date: '2024-01-22', btcYield: 0.0145, usdValue: 616.25, apy: 8.7 },
  ];

  const distributionEvents = [
    { date: '2024-01-22', amount: '0.0042 BTC', usdValue: '$178.50', source: 'Lending Interest', status: 'completed' },
    { date: '2024-01-21', amount: '0.0038 BTC', usdValue: '$161.50', source: 'DEX Fees', status: 'completed' },
    { date: '2024-01-20', amount: '0.0035 BTC', usdValue: '$148.75', source: 'Liquidation Fees', status: 'completed' },
    { date: '2024-01-19', amount: '0.0041 BTC', usdValue: '$174.25', source: 'Lending Interest', status: 'completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Yield Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-green-600">+12.4%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">0.0847 BTC</h3>
          <p className="text-sm text-gray-600">Total Yield Earned</p>
          <p className="text-xs text-gray-500 mt-2">≈ $3,598.75 USD</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-green-600">+0.3%</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">8.7%</h3>
          <p className="text-sm text-gray-600">Current APY</p>
          <p className="text-xs text-gray-500 mt-2">BTC-denominated yield</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-blue-600">Next: 2h</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Daily</h3>
          <p className="text-sm text-gray-600">Distribution Schedule</p>
          <p className="text-xs text-gray-500 mt-2">Auto-compounding</p>
        </div>
      </div>

      {/* Yield Chart and Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Yield Performance</h3>
          <div className="flex items-center space-x-2">
            {(['7d', '30d', '90d', '1y'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeframe === period
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period}
              </button>
            ))}
            <button className="flex items-center space-x-2 px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        {/* Simple Chart Visualization */}
        <div className="h-64 bg-gray-50 rounded-lg flex items-end justify-center p-4">
          <div className="flex items-end space-x-2 h-full w-full max-w-md">
            {yieldData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-orange-500 rounded-t-sm"
                  style={{ height: `${(data.apy / 10) * 100}%` }}
                ></div>
                <p className="text-xs text-gray-500 mt-2">{data.date.slice(5)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Distribution History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Distributions</h3>
          <button className="flex items-center space-x-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
            <Calendar className="w-4 h-4" />
            <span>View All</span>
          </button>
        </div>
        
        <div className="space-y-4">
          {distributionEvents.map((event, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{event.source}</p>
                  <p className="text-xs text-gray-500">{event.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{event.amount}</p>
                <p className="text-xs text-gray-500">{event.usdValue}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Yield Sources Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Yield Sources</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Lending Interest</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">65%</p>
                <p className="text-xs text-gray-500">0.055 BTC</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '65%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">DEX Trading Fees</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">25%</p>
                <p className="text-xs text-gray-500">0.021 BTC</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '25%' }}></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Liquidation Fees</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibld text-gray-900">10%</p>
                <p className="text-xs text-gray-500">0.008 BTC</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Compounding Effect</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Initial Deposit</span>
              <span className="text-sm font-semibold text-gray-900">1.0000 BTC</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Yield Earned</span>
              <span className="text-sm font-semibold text-green-600">+0.0847 BTC</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Auto-Compounded</span>
              <span className="text-sm font-semibold text-blue-600">+0.0053 BTC</span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Current Balance</span>
                <span className="text-base font-bold text-gray-900">1.0900 BTC</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">+9.0% growth since deposit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}