import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'getMinimumCollateralRatio' : ActorMethod<[], bigint>,
  'getVaultCount' : ActorMethod<[], bigint>,
  'greet' : ActorMethod<[string], string>,
  'incrementVaultCount' : ActorMethod<[], bigint>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
