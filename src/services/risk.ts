import { createRiskManagementActor } from '@/declarations/risk_management';

export async function assessRisk(accountId: string, amountSats: bigint) {
  const actor = createRiskManagementActor();
  return actor.assess_risk(accountId, amountSats);
}


