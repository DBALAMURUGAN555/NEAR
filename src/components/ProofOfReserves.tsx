import React from 'react';
import { Shield, CheckCircle, ExternalLink, Copy, Download, Clock, Hash } from 'lucide-react';

export function ProofOfReserves() {
  const reserveData = {
    totalBTC: '12,847.5632',
    totalUSD: '$545,234,780',
    lastUpdate: '2024-01-22 14:30:25 UTC',
    blockHeight: '825,094',
    merkleRoot: '9f4c8e7a2b1d5f3e8c6a4b9d7e2f5c8a1b4d7e9f2c5a8b3d6e9f2c5a8b1d4e7f',
    auditHash: 'sha256:a8f5c2e7b1d4f9c3e6a2b5d8f1c4e7a9b2d5f8c1e4a7b3d6f9c2e5a8b1d4f7e'
  };

  const auditHistory = [
    { date: '2024-01-22', auditor: 'Chainalysis', status: 'verified', hash: '9f4c8e7a...1d4e7f' },
    { date: '2024-01-21', auditor: 'Automatic', status: 'verified', hash: '8e3b7d2a...2e5c8f' },
    { date: '2024-01-20', auditor: 'Automatic', status: 'verified', hash: '7d2a5f8c...3b6e9d' },
    { date: '2024-01-19', auditor: 'Automatic', status: 'verified', hash: '6c1b4e8d...4a7c2f' }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Main Proof of Reserves Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Proof of Reserves</h3>
          <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Verified</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-3xl font-bold text-orange-600 mb-2">{reserveData.totalBTC}</div>
            <p className="text-sm font-medium text-orange-700">Total BTC Reserves</p>
            <p className="text-xs text-orange-600">Chain-Key Bitcoin</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-2">{reserveData.totalUSD}</div>
            <p className="text-sm font-medium text-green-700">USD Value</p>
            <p className="text-xs text-green-600">At current rates</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{reserveData.blockHeight}</div>
            <p className="text-sm font-medium text-blue-700">Block Height</p>
            <p className="text-xs text-blue-600">Latest verification</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-700">Real-Time</p>
            <p className="text-xs text-purple-600">Continuous monitoring</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Last Updated: {reserveData.lastUpdate}</p>
          <p className="text-xs text-gray-500">
            Reserves are automatically verified every block and audited by third-party validators daily.
          </p>
        </div>
      </div>

      {/* Cryptographic Proofs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Cryptographic Verification</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Merkle Root Hash</h4>
              <button 
                onClick={() => copyToClipboard(reserveData.merkleRoot)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-mono text-gray-600 bg-white p-2 rounded border">
              {reserveData.merkleRoot}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Cryptographic proof of all vault holdings at block {reserveData.blockHeight}
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Audit Hash</h4>
              <button 
                onClick={() => copyToClipboard(reserveData.auditHash)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-mono text-gray-600 bg-white p-2 rounded border">
              {reserveData.auditHash}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Third-party auditor signed verification hash
            </p>
          </div>
        </div>
      </div>

      {/* Verification Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Verification Methods</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-1">
                <Hash className="w-3 h-3 text-orange-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">On-Chain Verification</h4>
                <p className="text-xs text-gray-600 mt-1">
                  All reserves are verifiable on the Bitcoin blockchain using threshold ECDSA signatures
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                <Shield className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Third-Party Audits</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Regular audits by Chainalysis and other compliance partners
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Real-Time Monitoring</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Continuous verification of reserves vs. liabilities every block
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Verify Independently
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Audit History</h3>
          <div className="space-y-3">
            {auditHistory.map((audit, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{audit.auditor}</p>
                    <p className="text-xs text-gray-500">{audit.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600 font-medium">{audit.status}</p>
                  <p className="text-xs text-gray-500 font-mono">{audit.hash}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="flex items-center space-x-2 w-full justify-center py-2 text-sm text-blue-600 hover:text-blue-700">
              <Download className="w-4 h-4" />
              <span>Download Full Audit Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* API Access */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <ExternalLink className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">API Access for Institutions</h4>
            <p className="text-gray-600 mb-4">
              Institutional clients can access real-time proof-of-reserves data via our REST API and webhooks 
              for automated compliance monitoring and reporting.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">API Endpoint</p>
                <p className="text-sm text-gray-600 font-mono bg-white p-2 rounded border">
                  https://api.btcvaults.icp/reserves
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Response Format</p>
                <p className="text-sm text-gray-600">JSON with cryptographic proofs</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Get API Key
              </button>
              <button className="border border-blue-300 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}