export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text });
  const YieldPosition = IDL.Record({
    'strategy' : IDL.Text,
    'accumulated_yield' : IDL.Nat64,
    'start_time' : IDL.Nat64,
    'amount' : IDL.Nat64,
  });
  const YieldStrategy = IDL.Record({
    'apy' : IDL.Float64,
    'name' : IDL.Text,
    'risk_level' : IDL.Nat8,
    'is_active' : IDL.Bool,
  });
  return IDL.Service({
    'deposit_for_yield' : IDL.Func([IDL.Text, IDL.Nat64], [Result], []),
    'get_user_positions' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(YieldPosition)],
        ['query'],
      ),
    'get_yield_strategies' : IDL.Func([], [IDL.Vec(YieldStrategy)], ['query']),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
