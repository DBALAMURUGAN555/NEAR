export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'generate_address' : IDL.Func([IDL.Text], [IDL.Text], []),
    'get_balance' : IDL.Func([IDL.Text], [IDL.Nat64], ['query']),
    'health_check' : IDL.Func([], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
