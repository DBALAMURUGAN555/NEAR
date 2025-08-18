import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface RiskAssessment { 'score' : number, 'factors' : Array<string> }
export interface _SERVICE {
  'assess_risk' : ActorMethod<[string, bigint], RiskAssessment>,
  'health_check' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
