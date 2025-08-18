import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'sonner';
import custodyApi, { 
  CustodyAccount, 
  Transaction, 
  RiskAssessment,
  AuditEvent,
  ComplianceCheck
} from '../services/api';

// Hook for managing custody accounts
export const useCustodyAccounts = () => {
  const { user } = useUser();
  const [accounts, setAccounts] = useState<CustodyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const userAccounts = await custodyApi.getCustodyAccounts(user.id);
      setAccounts(userAccounts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createAccount = useCallback(async (
    name: string,
    accountType: string,
    signaturesRequired?: number
  ) => {
    if (!user?.id) return;

    try {
      await custodyApi.createAccount(user.id, name, accountType, signaturesRequired);
      toast.success('Account created successfully');
      await loadAccounts(); // Refresh the accounts list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      toast.error(errorMessage);
      throw err;
    }
  }, [user?.id, loadAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    createAccount,
  };
};

// Hook for managing transactions
export const useTransactions = () => {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async (limit: number = 50) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const userTransactions = await custodyApi.getTransactions(user.id, limit);
      setTransactions(userTransactions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createTransaction = useCallback(async (transactionData: {
    fromAccount: string;
    toAddress: string;
    amount: bigint;
    transactionType: string;
    memo?: string;
  }) => {
    if (!user?.id) return null;

    try {
      const transactionId = await custodyApi.createTransaction(user.id, transactionData);
      toast.success('Transaction created successfully');
      await loadTransactions(); // Refresh the transactions list
      return transactionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create transaction';
      toast.error(errorMessage);
      throw err;
    }
  }, [user?.id, loadTransactions]);

  const signTransaction = useCallback(async (transactionId: string) => {
    if (!user?.id) return;

    try {
      await custodyApi.signTransaction(user.id, transactionId);
      toast.success('Transaction signed successfully');
      await loadTransactions(); // Refresh to show updated signature status
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign transaction';
      toast.error(errorMessage);
      throw err;
    }
  }, [user?.id, loadTransactions]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    error,
    loadTransactions,
    createTransaction,
    signTransaction,
  };
};

// Hook for portfolio summary
export const usePortfolio = () => {
  const { user } = useUser();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const summary = await custodyApi.getPortfolioSummary(user.id);
      setPortfolio(summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load portfolio';
      setError(errorMessage);
      console.error('Portfolio loading error:', err);
      // Don't show error toast for portfolio as it might be called frequently
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPortfolio();
    
    // Set up real-time updates
    const handlePortfolioUpdate = () => {
      loadPortfolio();
    };

    custodyApi.on('portfolio_updated', handlePortfolioUpdate);

    return () => {
      custodyApi.off('portfolio_updated', handlePortfolioUpdate);
    };
  }, [loadPortfolio]);

  return {
    portfolio,
    loading,
    error,
    loadPortfolio,
  };
};

// Hook for risk assessment
export const useRiskAssessment = () => {
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  const assessRisk = useCallback(async (transactionData: any) => {
    try {
      setLoading(true);
      const assessment = await custodyApi.assessTransactionRisk(transactionData);
      setRiskAssessment(assessment);
      return assessment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assess risk';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    riskAssessment,
    loading,
    assessRisk,
  };
};

// Hook for compliance management
export const useCompliance = () => {
  const { user } = useUser();
  const [complianceStatus, setComplianceStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadComplianceStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const status = await custodyApi.getComplianceStatus(user.id);
      setComplianceStatus(status);
    } catch (err) {
      console.error('Failed to load compliance status:', err);
      // Don't show error toast as this is background loading
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const runComplianceCheck = useCallback(async (transactionId: string) => {
    try {
      const result = await custodyApi.runComplianceCheck(transactionId);
      toast.success('Compliance check completed');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Compliance check failed';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadComplianceStatus();
  }, [loadComplianceStatus]);

  return {
    complianceStatus,
    loading,
    loadComplianceStatus,
    runComplianceCheck,
  };
};

// Hook for audit trail
export const useAuditTrail = () => {
  const { user } = useUser();
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuditTrail = useCallback(async (
    accountId?: string,
    limit: number = 100
  ) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const events = await custodyApi.getAuditTrail(user.id, accountId, limit);
      setAuditEvents(events);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAuditTrail();
  }, [loadAuditTrail]);

  return {
    auditEvents,
    loading,
    loadAuditTrail,
  };
};

// Hook for real-time notifications and updates
export const useRealtimeUpdates = () => {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Start real-time updates
    custodyApi.startRealtimeUpdates();
    setConnected(true);

    // Listen for various events
    const handlePortfolioUpdate = (data: any) => {
      setLastUpdate(new Date());
      toast.info('Portfolio updated');
    };

    const handleTransactionUpdate = (data: any) => {
      setLastUpdate(new Date());
      toast.info(`Transaction ${data.transactionId} status updated`);
    };

    const handleComplianceAlert = (data: any) => {
      setLastUpdate(new Date());
      toast.warning('Compliance alert: ' + data.message);
    };

    const handleRiskAlert = (data: any) => {
      setLastUpdate(new Date());
      toast.error('Risk alert: ' + data.message);
    };

    custodyApi.on('portfolio_updated', handlePortfolioUpdate);
    custodyApi.on('transaction_updated', handleTransactionUpdate);
    custodyApi.on('compliance_alert', handleComplianceAlert);
    custodyApi.on('risk_alert', handleRiskAlert);

    return () => {
      custodyApi.off('portfolio_updated', handlePortfolioUpdate);
      custodyApi.off('transaction_updated', handleTransactionUpdate);
      custodyApi.off('compliance_alert', handleComplianceAlert);
      custodyApi.off('risk_alert', handleRiskAlert);
      setConnected(false);
    };
  }, []);

  return {
    connected,
    lastUpdate,
  };
};

// Combined hook for all custody operations
export const useCustodyOperations = () => {
  const accounts = useCustodyAccounts();
  const transactions = useTransactions();
  const portfolio = usePortfolio();
  const compliance = useCompliance();
  const auditTrail = useAuditTrail();
  const realtimeUpdates = useRealtimeUpdates();

  return {
    accounts,
    transactions,
    portfolio,
    compliance,
    auditTrail,
    realtimeUpdates,
  };
};
