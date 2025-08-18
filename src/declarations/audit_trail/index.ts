import { Principal } from '@dfinity/principal';

export interface LogEventRequest {
  event_type: string;
  user_id: string;
  account_id: string;
  transaction_id: string;
  details: string;
  ip_address: string;
  user_agent: string;
}

export interface AuditEvent {
  id: string;
  event_type: string;
  user_id: Principal;
  account_id: string;
  transaction_id: string;
  timestamp: bigint;
  details: string;
  ip_address: string;
  user_agent: string;
}

export interface GetAuditEventsRequest {
  user_id: Principal;
  account_id: string;
  limit: number;
}

export interface _SERVICE {
  log_event: (request: LogEventRequest) => Promise<{ Ok?: string; Err?: string }>;
  get_audit_events: (request: GetAuditEventsRequest) => Promise<AuditEvent[]>;
}

export const idlFactory = ({ IDL }: any) => {
  return IDL.Service({
    'log_event': IDL.Func([IDL.Record({
      'event_type': IDL.Text,
      'user_id': IDL.Text,
      'account_id': IDL.Text,
      'transaction_id': IDL.Text,
      'details': IDL.Text,
      'ip_address': IDL.Text,
      'user_agent': IDL.Text,
    })], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
  });
};

export const canisterId = 'rdmx6-jaaaa-aaaah-qdrqt-cai';
