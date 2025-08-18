import { Principal } from '@dfinity/principal';

export interface Account {
  id: string;
  name: string;
  account_type: string;
  balance: bigint;
  btc_address: string;
  status: string;
  risk_level: string;
  last_activity: bigint;
  signatures_required: number;
  total_signers: number;
}

export interface Transaction {
  id: string;
  transaction_type: string;
  from_account: string;
  to_address: string;
  amount: bigint;
  fee: bigint;
  status: string;
  created_at: bigint;
  required_signatures: number;
  current_signatures: number;
  memo: string;
}

export interface PortfolioSummary {
  total_value: bigint;
  total_btc: bigint;
  account_count: number;
  pending_transactions: number;
  risk_level: string;
  compliance_status: string;
}

export interface CreateAccountRequest {
  owner: Principal;
  name: string;
  account_type: string;
  signatures_required: number;
}

export interface CreateTransactionRequest {
  creator: Principal;
  from_account: string;
  to_address: string;
  amount: bigint;
  transaction_type: string;
  memo: string;
}

export interface _SERVICE {
  get_user_accounts: (principal: Principal) => Promise<Account[]>;
  create_account: (request: CreateAccountRequest) => Promise<{ Ok?: string; Err?: string }>;
  get_portfolio_summary: (principal: Principal) => Promise<PortfolioSummary>;
  create_transaction: (request: CreateTransactionRequest) => Promise<{ Ok?: string; Err?: string }>;
  get_user_transactions: (principal: Principal, limit: number) => Promise<Transaction[]>;
}

// Mock IDL factory - in real implementation this would be generated
export const idlFactory = ({ IDL }: any) => {
  return IDL.Service({
    'get_user_accounts': IDL.Func([IDL.Principal], [IDL.Vec(IDL.Record({
      'id': IDL.Text,
      'name': IDL.Text,
      'account_type': IDL.Text,
      'balance': IDL.Nat64,
      'btc_address': IDL.Text,
      'status': IDL.Text,
      'risk_level': IDL.Text,
      'last_activity': IDL.Nat64,
      'signatures_required': IDL.Nat32,
      'total_signers': IDL.Nat32,
    }))], ['query']),
    // Add other method signatures...
  });
};

// Mock canister ID - in real implementation this would be generated
export const canisterId = 'rdmx6-jaaaa-aaaah-qdrqq-cai';
