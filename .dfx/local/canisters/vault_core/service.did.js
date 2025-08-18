export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'getMinimumCollateralRatio' : IDL.Func([], [IDL.Nat], []),
    'getVaultCount' : IDL.Func([], [IDL.Nat], []),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], []),
    'incrementVaultCount' : IDL.Func([], [IDL.Nat], []),
  });
};
export const init = ({ IDL }) => { return []; };
