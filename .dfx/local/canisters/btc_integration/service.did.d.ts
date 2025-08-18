import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface BitcoinAddress { 'balance' : bigint, 'address' : string }
export interface _SERVICE {
  'generate_address' : ActorMethod<[string], string>,
  'get_balance' : ActorMethod<[string], bigint>,
  'health_check' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
