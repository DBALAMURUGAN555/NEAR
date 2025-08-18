// Vault Core Canister
// Core Bitcoin Yield Vaults functionality

import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Time "mo:base/Time";

actor VaultCore {
    // Simplified version for initial deployment
    private stable var vaultCount : Nat = 0;
    private stable let MINIMUM_COLLATERAL_RATIO : Nat = 150; // 150%
    
    public func greet(name : Text) : async Text {
        "Hello, " # name # "! This is the Vault Core canister."
    };
    
    public func getMinimumCollateralRatio() : async Nat {
        MINIMUM_COLLATERAL_RATIO
    };
    
    public func getVaultCount() : async Nat {
        vaultCount
    };
    
    public func incrementVaultCount() : async Nat {
        vaultCount += 1;
        vaultCount
    };
}
