import { Principal } from '@dfinity/principal';

export interface SignTransactionRequest {
  signer: Principal;
  transaction_id: string;
}

export interface SignatureStatus {
  required_signatures: number;
  current_signatures: number;
  signers: Principal[];
  is_complete: boolean;
}

export interface _SERVICE {
  sign_transaction: (request: SignTransactionRequest) => Promise<{ Ok?: boolean; Err?: string }>;
  get_signature_status: (transaction_id: string) => Promise<SignatureStatus>;
}

export const idlFactory = ({ IDL }: any) => {
  return IDL.Service({
    'sign_transaction': IDL.Func([IDL.Record({
      'signer': IDL.Principal,
      'transaction_id': IDL.Text,
    })], [IDL.Variant({ 'Ok': IDL.Bool, 'Err': IDL.Text })], []),
  });
};

export const canisterId = 'rdmx6-jaaaa-aaaah-qdrqr-cai';
