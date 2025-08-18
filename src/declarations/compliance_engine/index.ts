import { Principal } from '@dfinity/principal';

export interface ComplianceResult {
  id: string;
  check_type: string;
  status: string;
  result: any;
  timestamp: bigint;
}

export interface ComplianceStatus {
  status: string;
  kyc_level: string;
  aml_status: string;
  last_update: bigint;
  alerts: string[];
}

export interface _SERVICE {
  run_compliance_check: (transaction_id: string) => Promise<{ Ok?: ComplianceResult; Err?: string }>;
  get_user_compliance_status: (principal: Principal) => Promise<ComplianceStatus>;
}

export const idlFactory = ({ IDL }: any) => {
  return IDL.Service({
    'run_compliance_check': IDL.Func([IDL.Text], [IDL.Variant({ 
      'Ok': IDL.Record({
        'id': IDL.Text,
        'check_type': IDL.Text,
        'status': IDL.Text,
        'result': IDL.Text,
        'timestamp': IDL.Nat64,
      }), 
      'Err': IDL.Text 
    })], []),
  });
};

export const canisterId = 'rdmx6-jaaaa-aaaah-qdrqs-cai';
