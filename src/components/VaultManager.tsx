import React, { useState } from 'react';
import { Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle, Target } from 'lucide-react';

export function VaultManager() {
  const [selectedAction, setSelectedAction] = useState<'deposit' | 'withdraw' | 'borrow' | 'repay' | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'ICP' | 'USDC'>('BTC');
  const [amount, setAmount] = useState('');

  const assets = [
    { symbol: 'BTC', name: 'Bitcoin', balance: '1.85', price: '$42,500', icon: '₿' },
    { symbol: 'ICP', name: 'Internet Computer', balance: '2,180', price: '$13.85', icon: '∞' },
    { symbol: 'USDC', name: 'USD Coin', balance: '18,800', price: '$1.00', icon: '$' }
  ];

  const vaultActions = [
    { id: 'deposit' as const, label: 'Deposit', icon: ArrowUpRight, color: 'green' },
    { id: 'withdraw' as const, label: 'Withdraw', icon: ArrowDownLeft, color: 'blue' },
    { id: 'borrow' as const, label: 'Borrow', icon: Plus, color: 'orange' },
    { id: 'repay' as const, label: 'Repay', icon: RefreshCw, color: 'purple' }
  ];

  const handleExecuteAction = () => {
    // Simulate transaction
    console.log(`Executing ${selectedAction} of ${amount} ${selectedAsset}`);
    setSelectedAction(null);
    setAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Action Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vault Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vaultActions.map((action) => {
            const Icon = action.icon;
            const isSelected = selectedAction === action.id;
            
            return (
              <button
                key={action.id}
                onClick={() => setSelectedAction(isSelected ? null : action.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `border-${action.color}-500 bg-${action.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  isSelected ? `text-${action.color}-600` : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  isSelected ? `text-${action.color}-700` : 'text-gray-600'
                }`}>
                  {action.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Form */}
      {selectedAction && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)} Assets
          </h3>
          
          <div className="space-y-4">
            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Asset</label>
              <div className="grid grid-cols-3 gap-3">
                {assets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset.symbol as any)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedAsset === asset.symbol
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`text-2xl mb-1 ${
                        selectedAsset === asset.symbol ? 'text-orange-600' : 'text-gray-400'
                      }`}>
                        {asset.icon}
                      </div>
                      <p className={`text-sm font-medium ${
                        selectedAsset === asset.symbol ? 'text-orange-700' : 'text-gray-600'
                      }`}>
                        {asset.symbol}
                      </p>
                      <p className="text-xs text-gray-500">{asset.balance}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Enter ${selectedAsset} amount`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <button className="absolute right-3 top-3 text-sm font-medium text-orange-600 hover:text-orange-700">
                  MAX
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleExecuteAction}
              disabled={!amount}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)} {amount} {selectedAsset}
            </button>
          </div>
        </div>
      )}

      {/* AI Optimization Suggestion */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Collateral Optimizer</h4>
            <p className="text-gray-600 mb-4">
              Based on current market conditions, we recommend rebalancing your collateral to optimize yield and reduce liquidation risk.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Current Allocation</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• BTC: 65% (1.85 BTC)</li>
                  <li>• ICP: 25% (2,180 ICP)</li>
                  <li>• USDC: 10% (18,800 USDC)</li>
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Recommended Allocation</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• BTC: 70% (+0.12 BTC)</li>
                  <li>• ICP: 20% (-327 ICP)</li>
                  <li>• USDC: 10% (no change)</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-green-600">+0.3% APY</span> potential yield increase
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Apply Optimization
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Positions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Current Positions</h3>
        <div className="space-y-4">
          {[
            { type: 'Collateral', asset: 'BTC', amount: '1.85', value: '$78,500', status: 'active' },
            { type: 'Collateral', asset: 'ICP', amount: '2,180', value: '$30,200', status: 'active' },
            { type: 'Collateral', asset: 'USDC', amount: '18,800', value: '$18,800', status: 'active' },
            { type: 'Borrowed', asset: 'BTC', amount: '0.65', value: '$27,625', status: 'borrowed' }
          ].map((position, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  position.status === 'active' ? 'bg-green-500' : 'bg-orange-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {position.type} • {position.asset}
                  </p>
                  <p className="text-xs text-gray-500">{position.amount} {position.asset}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{position.value}</p>
                <p className={`text-xs font-medium ${
                  position.status === 'active' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {position.status === 'active' ? 'Collateral' : 'Debt'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Risk Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              All DeFi operations carry inherent risks. Your collateral may be liquidated if the health factor falls below 1.0. 
              Monitor your positions regularly and maintain adequate collateralization ratios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}