import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import {
  ArrowRightIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { formatBTC, formatCurrency } from '../lib/utils';

const mockAccounts = [
  {
    id: 'vault-a',
    name: 'Treasury Vault A',
    type: 'Cold Storage',
    balance: 125.4567,
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
  },
  {
    id: 'vault-b',
    name: 'Custody Vault B',
    type: 'Multi-Sig',
    balance: 89.2345,
    address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
  },
  {
    id: 'hot-wallet',
    name: 'Operations Hot Wallet',
    type: 'Hot Wallet',
    balance: 15.6789,
    address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
  }
];

const signers = [
  {
    id: 'signer-1',
    name: 'Treasury Manager',
    role: 'Manager',
    email: 'treasury@institution.gov',
    status: 'available',
    lastActivity: '2024-01-15T10:30:00Z'
  },
  {
    id: 'signer-2',
    name: 'Operations Lead',
    role: 'Operations',
    email: 'ops@institution.gov',
    status: 'available',
    lastActivity: '2024-01-15T09:15:00Z'
  },
  {
    id: 'signer-3',
    name: 'Compliance Officer',
    role: 'Compliance',
    email: 'compliance@institution.gov',
    status: 'available',
    lastActivity: '2024-01-15T11:45:00Z'
  },
  {
    id: 'signer-4',
    name: 'Security Administrator',
    role: 'Security',
    email: 'security@institution.gov',
    status: 'offline',
    lastActivity: '2024-01-14T16:20:00Z'
  }
];

const TransactionPreview = ({ transaction }) => (
  <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
    <h3 className="text-lg font-semibold mb-4 flex items-center">
      <DocumentArrowUpIcon className="h-5 w-5 mr-2 text-blue-600" />
      Transaction Preview
    </h3>
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900">{transaction.fromAccount}</p>
            <p className="text-sm text-gray-500">Source Account</p>
          </div>
        </div>
        <ArrowRightIcon className="h-6 w-6 text-gray-400" />
        <div className="flex items-center">
          <div className="ml-3 text-right">
            <p className="font-medium text-gray-900">{transaction.toAddress}</p>
            <p className="text-sm text-gray-500">Destination</p>
          </div>
          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center ml-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-sm text-gray-500">Amount</p>
          <p className="text-lg font-semibold text-gray-900">{formatBTC(transaction.amount)}</p>
          <p className="text-sm text-gray-500">{formatCurrency(transaction.amount * 62500)}</p>
        </div>
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-sm text-gray-500">Network Fee</p>
          <p className="text-lg font-semibold text-gray-900">{formatBTC(transaction.fee)}</p>
          <p className="text-sm text-gray-500">{formatCurrency(transaction.fee * 62500)}</p>
        </div>
      </div>

      <div className="p-3 bg-white rounded-lg border">
        <p className="text-sm text-gray-500 mb-2">Required Signatures</p>
        <div className="flex items-center">
          <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm font-medium">{transaction.requiredSignatures} of {transaction.totalSigners} signers required</span>
        </div>
      </div>

      {transaction.memo && (
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-sm text-gray-500">Memo</p>
          <p className="text-sm text-gray-900 mt-1">{transaction.memo}</p>
        </div>
      )}
    </div>
  </Card>
);

const SignerCard = ({ signer, isSelected, onToggle, disabled = false }) => (
  <div 
    className={`p-4 border rounded-lg cursor-pointer transition-all ${
      isSelected 
        ? 'border-blue-500 bg-blue-50' 
        : disabled 
        ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
        : 'border-gray-200 hover:border-gray-300'
    }`}
    onClick={() => !disabled && onToggle(signer.id)}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
          signer.status === 'available' ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          <UsersIcon className={`h-5 w-5 ${
            signer.status === 'available' ? 'text-green-600' : 'text-gray-400'
          }`} />
        </div>
        <div className="ml-3">
          <p className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-900'}`}>
            {signer.name}
          </p>
          <p className={`text-sm ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
            {signer.role} • {signer.status}
          </p>
        </div>
      </div>
      {isSelected && (
        <CheckCircleIcon className="h-5 w-5 text-blue-600" />
      )}
    </div>
  </div>
);

const RiskAssessment = ({ transaction }) => {
  const [riskLevel, setRiskLevel] = useState('medium');
  const [riskFactors] = useState([
    { factor: 'Transaction Amount', level: 'medium', description: 'Amount exceeds daily limit' },
    { factor: 'Destination Address', level: 'low', description: 'Known counterparty address' },
    { factor: 'Time of Day', level: 'low', description: 'Transaction during business hours' },
    { factor: 'Velocity Check', level: 'high', description: 'Multiple transactions in short timeframe' }
  ]);

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-amber-600" />
        Risk Assessment
      </h3>
      
      <div className={`p-4 rounded-lg border mb-4 ${getRiskColor(riskLevel)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Overall Risk Level</p>
            <p className="text-sm opacity-75">Based on multiple risk factors</p>
          </div>
          <span className="text-xl font-bold uppercase">{riskLevel}</span>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Risk Factors</h4>
        {riskFactors.map((factor, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">{factor.factor}</p>
              <p className="text-xs text-gray-500">{factor.description}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              factor.level === 'low' ? 'text-green-600 bg-green-100' :
              factor.level === 'medium' ? 'text-amber-600 bg-amber-100' :
              'text-red-600 bg-red-100'
            }`}>
              {factor.level}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default function TransactionBuilder() {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [transaction, setTransaction] = useState({
    type: 'withdrawal',
    fromAccount: '',
    toAddress: '',
    amount: '',
    fee: 0.0001,
    memo: '',
    requiredSignatures: 3,
    totalSigners: 4
  });
  const [selectedSigners, setSelectedSigners] = useState([]);
  const [documents, setDocuments] = useState([]);

  const handleSignerToggle = (signerId) => {
    setSelectedSigners(prev => 
      prev.includes(signerId) 
        ? prev.filter(id => id !== signerId)
        : [...prev, signerId]
    );
  };

  const handleFileUpload = (files) => {
    const newDocuments = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    }));
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const canProceedToStep = (stepNumber) => {
    switch (stepNumber) {
      case 2:
        return transaction.fromAccount && transaction.toAddress && transaction.amount;
      case 3:
        return selectedSigners.length >= transaction.requiredSignatures;
      case 4:
        return true; // Documents are optional
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Transaction
          </h1>
          <p className="text-gray-600">
            Build and submit a new multi-signature transaction for approval.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { number: 1, title: 'Transaction Details' },
              { number: 2, title: 'Review & Risk Assessment' },
              { number: 3, title: 'Select Signers' },
              { number: 4, title: 'Upload Documents' },
              { number: 5, title: 'Submit for Approval' }
            ].map((stepItem, index) => (
              <div key={stepItem.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step >= stepItem.number
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {step > stepItem.number ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{stepItem.number}</span>
                  )}
                </div>
                <div className="ml-2">
                  <p className={`text-sm font-medium ${
                    step >= stepItem.number ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {stepItem.title}
                  </p>
                </div>
                {index < 4 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    step > stepItem.number ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-2">
            <Card className="p-6">
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Transaction Details</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Type
                    </label>
                    <select 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={transaction.type}
                      onChange={(e) => setTransaction(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="withdrawal">External Withdrawal</option>
                      <option value="internal_transfer">Internal Transfer</option>
                      <option value="sweep">Sweep Transaction</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Account
                    </label>
                    <select 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={transaction.fromAccount}
                      onChange={(e) => setTransaction(prev => ({ ...prev, fromAccount: e.target.value }))}
                    >
                      <option value="">Select source account...</option>
                      {mockAccounts.map(account => (
                        <option key={account.id} value={account.name}>
                          {account.name} ({formatBTC(account.balance)} available)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Bitcoin address or select from address book"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={transaction.toAddress}
                      onChange={(e) => setTransaction(prev => ({ ...prev, toAddress: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (BTC)
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      placeholder="0.00000000"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={transaction.amount}
                      onChange={(e) => setTransaction(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Memo (Optional)
                    </label>
                    <textarea
                      placeholder="Transaction description or reference..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={transaction.memo}
                      onChange={(e) => setTransaction(prev => ({ ...prev, memo: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Review Transaction</h2>
                  <RiskAssessment transaction={transaction} />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Select Required Signers</h2>
                    <span className="text-sm text-gray-500">
                      {selectedSigners.length} of {transaction.requiredSignatures} required
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {signers.map(signer => (
                      <SignerCard
                        key={signer.id}
                        signer={signer}
                        isSelected={selectedSigners.includes(signer.id)}
                        onToggle={handleSignerToggle}
                        disabled={signer.status === 'offline'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Upload Supporting Documents</h2>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      Drag and drop files here, or click to browse
                    </p>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <label htmlFor="file-upload">
                      <Button type="button" variant="outline" className="cursor-pointer">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Documents
                      </Button>
                    </label>
                  </div>
                  
                  {documents.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">Uploaded Documents</h3>
                      {documents.map(doc => (
                        <div key={doc.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <DocumentArrowUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {(doc.size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.uploadedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Submit for Approval</h2>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-green-800">
                          Transaction ready for submission
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          Your transaction will be sent to the selected signers for approval. 
                          You'll receive notifications as approvals are collected.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Button className="flex-1">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      Submit Transaction
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {step >= 1 && transaction.fromAccount && transaction.toAddress && transaction.amount && (
              <TransactionPreview transaction={transaction} />
            )}

            {/* Navigation */}
            <Card className="p-4">
              <div className="flex space-x-3">
                {step > 1 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(step - 1)}
                    className="flex-1"
                  >
                    Previous
                  </Button>
                )}
                {step < 5 && (
                  <Button 
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceedToStep(step + 1)}
                    className="flex-1"
                  >
                    {step === 4 ? 'Review' : 'Next'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
