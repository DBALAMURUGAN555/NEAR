import Types "./types";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Int "mo:base/Int";
import Float "mo:base/Float";

actor class VaultCore() {
    type Vault = Types.Vault;
    type CollateralAsset = Types.CollateralAsset;
    type VaultStatus = Types.VaultStatus;
    type VaultError = Types.VaultError;
    type Result<Ok, Err> = Types.Result<Ok, Err>;

    // State variables
    private stable var vaults = HashMap.HashMap<Principal, Vault>(10, Principal.equal, Principal.hash);
    private stable let MINIMUM_COLLATERAL_RATIO : Nat = 150; // 150%
    private stable let LIQUIDATION_THRESHOLD : Nat = 130; // 130%
    private stable var interestRate = { baseRate = 5; utilizationMultiplier = 2 }; // 5% base + utilization multiplier

    // Calculate health factor
    private func calculateHealthFactor(vault: Vault) : Nat {
        if (vault.debt == 0) return 999; // Max health if no debt
        return (vault.collateralValue * 100) / vault.debt;
    };

    // Borrow function
    public shared(msg) func borrow(amount: Nat) : async Result<Vault, VaultError> {
        let caller = msg.caller;
        
        switch (vaults.get(caller)) {
            case (?vault) {
                if (vault.status != #Active) {
                    return #err(#InactiveVault);
                };

                // Calculate new debt including interest
                let newDebt = vault.debt + amount;
                let newHealth = (vault.collateralValue * 100) / newDebt;

                if (newHealth < MINIMUM_COLLATERAL_RATIO) {
                    return #err(#InsufficientCollateral);
                };

                let updatedVault : Vault = {
                    owner = vault.owner;
                    collateral = vault.collateral;
                    debt = newDebt;
                    collateralValue = vault.collateralValue;
                    status = vault.status;
                    kycTier = vault.kycTier;
                    lastUpdateTime = Time.now();
                    interestAccumulated = vault.interestAccumulated;
                };

                vaults.put(caller, updatedVault);
                #ok(updatedVault)
            };
            case null {
                #err(#VaultNotFound)
            };
        };
    };

    // Repay function
    public shared(msg) func repay(amount: Nat) : async Result<Vault, VaultError> {
        let caller = msg.caller;
        
        switch (vaults.get(caller)) {
            case (?vault) {
                if (amount > vault.debt) {
                    return #err(#InvalidAmount);
                };

                let updatedVault : Vault = {
                    owner = vault.owner;
                    collateral = vault.collateral;
                    debt = vault.debt - amount;
                    collateralValue = vault.collateralValue;
                    status = vault.status;
                    kycTier = vault.kycTier;
                    lastUpdateTime = Time.now();
                    interestAccumulated = vault.interestAccumulated;
                };

                vaults.put(caller, updatedVault);
                #ok(updatedVault)
            };
            case null {
                #err(#VaultNotFound)
            };
        };
    };

    // Withdraw collateral
    public shared(msg) func withdraw(asset: CollateralAsset, amount: Nat) : async Result<Vault, VaultError> {
        let caller = msg.caller;
        
        switch (vaults.get(caller)) {
            case (?vault) {
                if (vault.status != #Active) {
                    return #err(#InactiveVault);
                };

                let currentAmount = Option.get(vault.collateral.get(asset), 0);
                if (currentAmount < amount) {
                    return #err(#InsufficientBalance);
                };

                vault.collateral.put(asset, currentAmount - amount);
                
                // Recalculate health factor
                let newHealth = calculateHealthFactor(vault);
                if (newHealth < MINIMUM_COLLATERAL_RATIO and vault.debt > 0) {
                    return #err(#InsufficientCollateral);
                };

                vaults.put(caller, vault);
                #ok(vault)
            };
            case null {
                #err(#VaultNotFound)
            };
        };
    };

    // Calculate and accrue interest
    private func accrueInterest(vault: Vault) : Vault {
        let timeElapsed = (Time.now() - vault.lastUpdateTime) / 1_000_000_000; // Convert to seconds
        let interestRate = interestRate.baseRate + 
            (interestRate.utilizationMultiplier * vault.debt / vault.collateralValue);
        
        let interest = (vault.debt * interestRate * Nat64.toNat(timeElapsed)) / (100 * 365 * 24 * 3600);
        
        {
            owner = vault.owner;
            collateral = vault.collateral;
            debt = vault.debt + interest;
            collateralValue = vault.collateralValue;
            status = vault.status;
            kycTier = vault.kycTier;
            lastUpdateTime = Time.now();
            interestAccumulated = vault.interestAccumulated + interest;
        }
    };

    // Query methods
    public query func getVaultHealth(owner: Principal) : async Result<Nat, VaultError> {
        switch (vaults.get(owner)) {
            case (?vault) {
                #ok(calculateHealthFactor(vault))
            };
            case null {
                #err(#VaultNotFound)
            };
        };
    };
}