import React from 'react';
import { Shield, CheckCircle, Clock, AlertTriangle, Award, FileText } from 'lucide-react';

export function ComplianceCenter() {
  const kycTiers = [
    {
      tier: 0,
      name: 'Anonymous',
      status: 'completed',
      limit: '$1,000',
      requirements: ['No verification required'],
      features: ['Basic vault operations', 'Limited deposit amounts'],
      badge: '🎭'
    },
    {
      tier: 1,
      name: 'Verified',
      status: 'completed',
      limit: '$10,000',
      requirements: ['Email verification', 'Phone number', 'Basic identity check'],
      features: ['Increased limits', 'Priority support', 'Advanced features'],
      badge: '✅'
    },
    {
      tier: 2,
      name: 'Institutional',
      status: 'active',
      limit: 'Unlimited',
      requirements: ['Full KYC documentation', 'Address verification', 'Source of funds', 'Regulatory compliance'],
      features: ['Unlimited deposits', 'Custom vault parameters', 'Dedicated support', 'Compliance reporting'],
      badge: '🏆'
    }
  ];

  const complianceReports = [
    { date: '2024-01-20', type: 'Monthly Compliance Report', status: 'completed', size: '2.4 MB' },
    { date: '2024-01-15', type: 'Transaction Audit Trail', status: 'completed', size: '1.8 MB' },
    { date: '2024-01-10', type: 'KYC Verification Report', status: 'completed', size: '0.9 MB' },
    { date: '2024-01-05', type: 'Risk Assessment', status: 'completed', size: '1.2 MB' }
  ];

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Compliance Status</h3>
          <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Tier 2 Verified</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-700">KYC Status</p>
            <p className="text-xs text-green-600">Fully Verified</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-700">Compliance Badge</p>
            <p className="text-xs text-blue-600">NFT Minted</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <FileText className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-orange-700">Reports</p>
            <p className="text-xs text-orange-600">4 Available</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-700">Next Review</p>
            <p className="text-xs text-purple-600">90 days</p>
          </div>
        </div>
      </div>

      {/* KYC Tiers */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">KYC Verification Tiers</h3>
        <div className="space-y-4">
          {kycTiers.map((tier) => {
            const isActive = tier.status === 'active';
            const isCompleted = tier.status === 'completed';
            
            return (
              <div key={tier.tier} className={`border-2 rounded-lg p-6 ${
                isActive ? 'border-green-200 bg-green-50' : 
                isCompleted ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{tier.badge}</div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        Tier {tier.tier}: {tier.name}
                      </h4>
                      <p className="text-sm text-gray-600">Deposit limit: {tier.limit}</p>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                    isActive ? 'bg-green-100 text-green-700' :
                    isCompleted ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {isActive ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Current Tier</span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Available</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Requirements</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {tier.requirements.map((req, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Features</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance NFT Badge */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Award className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Compliance NFT Badge</h4>
            <p className="text-gray-600 mb-4">
              Your Tier 2 compliance verification has been minted as an NFT badge, providing composable proof of your compliance status across the ICP ecosystem.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-700">NFT ID</p>
                <p className="text-sm text-gray-600 font-mono">btc-vault-compliance-tier2-#4521</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Issued Date</p>
                <p className="text-sm text-gray-600">January 15, 2024</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                View NFT
              </button>
              <button className="border border-purple-300 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors">
                Share Proof
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Reports */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Compliance Reports</h3>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Generate Report
          </button>
        </div>
        
        <div className="space-y-4">
          {complianceReports.map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{report.type}</p>
                  <p className="text-xs text-gray-500">{report.date} • {report.size}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                  {report.status}
                </span>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regulatory Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Regulatory Compliance</h4>
            <p className="text-sm text-yellow-700 mt-1">
              This platform operates in compliance with applicable regulations. Your data is processed according to privacy laws, 
              and all transactions are subject to anti-money laundering (AML) and know-your-customer (KYC) requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}