import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Hash "mo:base/Hash";
import Nat32 "mo:base/Nat32";

module {
    public type CollateralAsset = {
        #BTC;
        #ICP;
        #USDT;
        #USDC;
    };

    public type VaultStatus = {
        #Active;
        #Liquidating;
        #Closed;
    };

    public type Vault = {
        owner: Principal;
        collateral: HashMap.HashMap<CollateralAsset, Nat>;
        debt: Nat;
        collateralValue: Nat;
        status: VaultStatus;
        kycTier: Nat;
        lastUpdateTime: Nat64;
        interestAccumulated: Nat;
    };

    public func assetEqual(a: CollateralAsset, b: CollateralAsset) : Bool {
        a == b
    };

    public func assetHash(asset: CollateralAsset) : Hash.Hash {
        switch(asset) {
            case (#BTC) 0;
            case (#ICP) 1;
            case (#USDT) 2;
            case (#USDC) 3;
        }
    };

    public type Result<Ok, Err> = {
        #ok: Ok;
        #err: Err;
    };

    public type VaultError = {
        #InsufficientCollateral;
        #VaultNotFound;
        #InactiveVault;
        #InsufficientBalance;
        #UnauthorizedCaller;
        #InvalidAmount;
    };

    public type InterestRate = {
        baseRate: Nat;
        utilizationMultiplier: Nat;
    };
}