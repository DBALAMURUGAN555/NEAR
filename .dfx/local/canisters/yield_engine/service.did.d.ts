import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Result = { 'Ok' : string } |
  { 'Err' : string };
export interface YieldPosition {
  'strategy' : string,
  'accumulated_yield' : bigint,
  'start_time' : bigint,
  'amount' : bigint,
}
export interface YieldStrategy {
  'apy' : number,
  'name' : string,
  'risk_level' : number,
  'is_active' : boolean,
}
export interface _SERVICE {
  'deposit_for_yield' : ActorMethod<[string, bigint], Result>,
  'get_user_positions' : ActorMethod<[string], Array<YieldPosition>>,
  'get_yield_strategies' : ActorMethod<[], Array<YieldStrategy>>,
  'greet' : ActorMethod<[string], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
