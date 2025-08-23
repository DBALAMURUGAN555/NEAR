import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';

export interface RiskAssessment {
  score: number;
  factors: string[];
}

export interface RiskManagementService {
  assess_risk: (account_id: string, amount: bigint) => Promise<RiskAssessment>;
  health_check: () => Promise<string>;
}

const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const RiskAssessment = IDL.Record({
    score: IDL.Nat8,
    factors: IDL.Vec(IDL.Text),
  });
  return IDL.Service({
    assess_risk: IDL.Func([IDL.Text, IDL.Nat64], [RiskAssessment], []),
    health_check: IDL.Func([], [IDL.Text], ['query']),
  });
};

export function createRiskManagementActor(canisterId?: string, host?: string) {
  const resolvedCanisterId = canisterId || import.meta.env.VITE_RISK_MANAGEMENT_CANISTER_ID;
  if (!resolvedCanisterId) {
    throw new Error('Missing canister id: VITE_RISK_MANAGEMENT_CANISTER_ID');
  }
  const agent = new HttpAgent({ host });
  // Note: in local dev with dfx, you may need agent.fetchRootKey();
  const actor = Actor.createActor<RiskManagementService>(idlFactory, {
    agent,
    canisterId: resolvedCanisterId,
  });
  return actor;
}


