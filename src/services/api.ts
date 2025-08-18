import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Import the generated IDL factories for our canisters
import { 
  idlFactory as custodyCoreIdlFactory,
  canisterId as custodyCoreCanisterId,
} from '../declarations/custody_core';

import { 
  idlFactory as multisigIdlFactory,
  canisterId as multisigCanisterId,
} from '../declarations/multisig_wallet';

import { 
  idlFactory as complianceIdlFactory,
  canisterId as complianceCanisterId,
} from '../declarations/compliance_engine';

import { 
  idlFactory as auditIdlFactory,
  canisterId as auditCanisterId,
} from '../declarations/audit_trail';

// Types for our custody operations
export interface CustodyAccount {
  id: string;
  name: string;
  accountType: 'cold_storage' | 'hot_wallet' | 'multi_sig';
  balance: bigint;
  btcAddress: string;
  status: 'active' | 'frozen' | 'maintenance';
  riskLevel: 'low' | 'medium' | 'high';
  lastActivity: string;
  signaturesRequired?: number;
  totalSigners?: number;
}

export interface Transaction {
  id: string;
  transactionType: 'withdrawal' | 'deposit' | 'internal_transfer' | 'sweep';
  fromAccount: string;
  toAddress: string;
  amount: bigint;
  fee: bigint;
  status: 'pending_approval' | 'approved' | 'confirming' | 'completed' | 'failed';
  createdAt: string;
  requiredSignatures: number;
  currentSignatures: number;
  memo?: string;
  riskAssessment?: RiskAssessment;
  complianceStatus?: 'pending' | 'approved' | 'rejected';
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  score: number;
  alerts: string[];
}

export interface RiskFactor {
  factor: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  weight: number;
}

export interface ComplianceCheck {
  id: string;
  transactionId: string;
  checkType: 'kyc' | 'aml' | 'sanctions' | 'velocity' | 'limits';
  status: 'pending' | 'passed' | 'failed' | 'review_required';
  result?: any;
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  userId: string;
  accountId?: string;
  transactionId?: string;
  timestamp: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class CustodyApiService {
  private agent: HttpAgent;
  private custodyActor: any;
  private multisigActor: any;
  private complianceActor: any;
  private auditActor: any;

  constructor() {
    // Initialize the HTTP agent
    this.agent = new HttpAgent({
      host: process.env.DFX_NETWORK === 'ic' 
        ? 'https://icp-api.io' 
        : 'http://localhost:4943',
    });

    // Only fetch root key when not on mainnet
    if (process.env.DFX_NETWORK !== 'ic') {
      this.agent.fetchRootKey().catch(err => {
        console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
        console.error(err);
      });
    }

    // Initialize actors for each canister
    this.initializeActors();
  }

  private async initializeActors() {
    try {
      this.custodyActor = Actor.createActor(custodyCoreIdlFactory, {
        agent: this.agent,
        canisterId: custodyCoreCanisterId,
      });

      this.multisigActor = Actor.createActor(multisigIdlFactory, {
        agent: this.agent,
        canisterId: multisigCanisterId,
      });

      this.complianceActor = Actor.createActor(complianceIdlFactory, {
        agent: this.agent,
        canisterId: complianceCanisterId,
      });

      this.auditActor = Actor.createActor(auditIdlFactory, {
        agent: this.agent,
        canisterId: auditCanisterId,
      });
    } catch (error) {
      console.error('Failed to initialize canister actors:', error);
    }
  }

  // Custody Core Methods
  async getCustodyAccounts(userId: string): Promise<CustodyAccount[]> {
    try {
      const principal = Principal.fromText(userId);
      const result = await this.custodyActor.get_user_accounts(principal);
      
      return result.map((account: any) => ({
        id: account.id,
        name: account.name,
        accountType: account.account_type,
        balance: account.balance,
        btcAddress: account.btc_address,
        status: account.status,
        riskLevel: account.risk_level || 'low',
        lastActivity: new Date(Number(account.last_activity) / 1000000).toISOString(),
        signaturesRequired: account.signatures_required,
        totalSigners: account.total_signers,
      }));
    } catch (error) {
      console.error('Failed to fetch custody accounts:', error);
      throw error;
    }
  }

  async createAccount(
    userId: string, 
    name: string, 
    accountType: string,
    signaturesRequired?: number
  ): Promise<string> {
    try {
      const principal = Principal.fromText(userId);
      const result = await this.custodyActor.create_account({
        owner: principal,
        name,
        account_type: accountType,
        signatures_required: signaturesRequired || 1,
      });
      
      if (result.Ok) {
        return result.Ok;
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to create custody account:', error);
      throw error;
    }
  }

  async getPortfolioSummary(userId: string) {
    try {
      const principal = Principal.fromText(userId);
      const result = await this.custodyActor.get_portfolio_summary(principal);
      
      return {
        totalValue: result.total_value,
        totalBtc: result.total_btc,
        accountCount: result.account_count,
        pendingTransactions: result.pending_transactions,
        riskLevel: result.risk_level,
        complianceStatus: result.compliance_status,
      };
    } catch (error) {
      console.error('Failed to fetch portfolio summary:', error);
      throw error;
    }
  }

  // Transaction Methods
  async createTransaction(
    userId: string,
    transactionData: {
      fromAccount: string;
      toAddress: string;
      amount: bigint;
      transactionType: string;
      memo?: string;
    }
  ): Promise<string> {
    try {
      const principal = Principal.fromText(userId);
      const result = await this.custodyActor.create_transaction({
        creator: principal,
        from_account: transactionData.fromAccount,
        to_address: transactionData.toAddress,
        amount: transactionData.amount,
        transaction_type: transactionData.transactionType,
        memo: transactionData.memo || '',
      });
      
      if (result.Ok) {
        // Log the transaction creation in audit trail
        await this.logAuditEvent({
          eventType: 'transaction_created',
          userId,
          transactionId: result.Ok,
          details: transactionData,
        });
        
        return result.Ok;
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  }

  async getTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const principal = Principal.fromText(userId);
      const result = await this.custodyActor.get_user_transactions(principal, limit);
      
      return result.map((tx: any) => ({
        id: tx.id,
        transactionType: tx.transaction_type,
        fromAccount: tx.from_account,
        toAddress: tx.to_address,
        amount: tx.amount,
        fee: tx.fee,
        status: tx.status,
        createdAt: new Date(Number(tx.created_at) / 1000000).toISOString(),
        requiredSignatures: tx.required_signatures,
        currentSignatures: tx.current_signatures,
        memo: tx.memo,
      }));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error;
    }
  }

  // Multi-signature Methods
  async signTransaction(userId: string, transactionId: string): Promise<boolean> {
    try {
      const principal = Principal.fromText(userId);
      const result = await this.multisigActor.sign_transaction({
        signer: principal,
        transaction_id: transactionId,
      });
      
      if (result.Ok) {
        // Log the signature in audit trail
        await this.logAuditEvent({
          eventType: 'transaction_signed',
          userId,
          transactionId,
          details: { action: 'signature_added' },
        });
        
        return result.Ok;
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  }

  async getSignatureStatus(transactionId: string) {
    try {
      const result = await this.multisigActor.get_signature_status(transactionId);
      
      return {
        requiredSignatures: result.required_signatures,
        currentSignatures: result.current_signatures,
        signers: result.signers,
        isComplete: result.is_complete,
      };
    } catch (error) {
      console.error('Failed to get signature status:', error);
      throw error;
    }
  }

  // Compliance Methods
  async runComplianceCheck(transactionId: string): Promise<ComplianceCheck> {
    try {
      const result = await this.complianceActor.run_compliance_check(transactionId);
      
      if (result.Ok) {
        return {
          id: result.Ok.id,
          transactionId,
          checkType: result.Ok.check_type,
          status: result.Ok.status,
          result: result.Ok.result,
          timestamp: new Date(Number(result.Ok.timestamp) / 1000000).toISOString(),
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to run compliance check:', error);
      throw error;
    }
  }

  async getComplianceStatus(userId: string) {
    try {
      const principal = Principal.fromText(userId);
      const result = await this.complianceActor.get_user_compliance_status(principal);
      
      return {
        status: result.status,
        kycLevel: result.kyc_level,
        amlStatus: result.aml_status,
        lastUpdate: new Date(Number(result.last_update) / 1000000).toISOString(),
        alerts: result.alerts || [],
      };
    } catch (error) {
      console.error('Failed to get compliance status:', error);
      throw error;
    }
  }

  // Risk Assessment Methods
  async assessTransactionRisk(transactionData: any): Promise<RiskAssessment> {
    try {
      // This would integrate with your risk management canister
      // For now, we'll simulate risk assessment
      const riskFactors: RiskFactor[] = [
        {
          factor: 'Transaction Amount',
          level: transactionData.amount > 1000000n ? 'high' : 'medium',
          description: 'Amount analysis based on limits',
          weight: 0.3,
        },
        {
          factor: 'Destination Address',
          level: 'low',
          description: 'Known counterparty address',
          weight: 0.2,
        },
        {
          factor: 'Time of Day',
          level: 'low',
          description: 'Transaction during business hours',
          weight: 0.1,
        },
        {
          factor: 'Velocity Check',
          level: 'medium',
          description: 'Multiple transactions detected',
          weight: 0.4,
        },
      ];

      const score = riskFactors.reduce((acc, factor) => {
        const levelScore = factor.level === 'low' ? 1 : factor.level === 'medium' ? 2 : 3;
        return acc + (levelScore * factor.weight);
      }, 0);

      const riskLevel = score < 1.5 ? 'low' : score < 2.5 ? 'medium' : 'high';

      return {
        riskLevel,
        factors: riskFactors,
        score,
        alerts: riskLevel === 'high' ? ['High-risk transaction requires additional approval'] : [],
      };
    } catch (error) {
      console.error('Failed to assess transaction risk:', error);
      throw error;
    }
  }

  // Audit Trail Methods
  async logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const result = await this.auditActor.log_event({
        event_type: event.eventType,
        user_id: event.userId,
        account_id: event.accountId || '',
        transaction_id: event.transactionId || '',
        details: JSON.stringify(event.details),
        ip_address: event.ipAddress || '',
        user_agent: event.userAgent || '',
      });
      
      if (!result.Ok) {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw here as audit logging should not break the main flow
    }
  }

  async getAuditTrail(
    userId: string,
    accountId?: string,
    limit: number = 100
  ): Promise<AuditEvent[]> {
    try {
      const principal = Principal.fromText(userId);
      const result = await this.auditActor.get_audit_events({
        user_id: principal,
        account_id: accountId || '',
        limit,
      });
      
      return result.map((event: any) => ({
        id: event.id,
        eventType: event.event_type,
        userId: event.user_id.toString(),
        accountId: event.account_id,
        transactionId: event.transaction_id,
        timestamp: new Date(Number(event.timestamp) / 1000000).toISOString(),
        details: JSON.parse(event.details),
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
      }));
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
      throw error;
    }
  }

  // Real-time Updates (WebSocket simulation)
  private eventListeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Simulate real-time updates (in a real implementation, this would use WebSockets)
  startRealtimeUpdates() {
    setInterval(async () => {
      try {
        // Poll for updates and emit events
        // This is a simplified simulation
        this.emit('portfolio_updated', {
          timestamp: new Date().toISOString(),
          type: 'balance_change',
        });
      } catch (error) {
        console.error('Error in realtime updates:', error);
      }
    }, 30000); // Poll every 30 seconds
  }
}

// Export a singleton instance
export const custodyApi = new CustodyApiService();
export default custodyApi;
