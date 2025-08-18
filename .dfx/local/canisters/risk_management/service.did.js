export const idlFactory = ({ IDL }) => {
  const RiskAssessment = IDL.Record({
    'score' : IDL.Nat8,
    'factors' : IDL.Vec(IDL.Text),
  });
  return IDL.Service({
    'assess_risk' : IDL.Func([IDL.Text, IDL.Nat64], [RiskAssessment], []),
    'health_check' : IDL.Func([], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
