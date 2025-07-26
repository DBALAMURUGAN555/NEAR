import VaultCore "../main";
import Types "../types";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Result "mo:base/Result";

actor {
    // Test constants
    let TEST_DEPOSIT_AMOUNT : Nat = 1_000_000; // 1 BTC in Satoshis
    let TEST_BORROW_AMOUNT : Nat = 500_000;    // 0.5 BTC in Satoshis

    public func runTests() : async () {
        let vaultCore = await VaultCore.VaultCore();
        
        // 1. Test Vault Creation
        Debug.print("Testing vault creation...");
        let createResult = await vaultCore.createVault();
        assert(Result.isOk(createResult));
        
        // 2. Test Deposit
        Debug.print("Testing collateral deposit...");
        let depositResult = await vaultCore.deposit(#BTC, TEST_DEPOSIT_AMOUNT);
        switch(depositResult) {
            case (#ok(vault)) {
                assert(vault.collateralValue > 0);
            };
            case (#err(e)) {
                Debug.trap("Deposit failed");
            };
        };

        // 3. Test Borrowing
        Debug.print("Testing borrowing...");
        let borrowResult = await vaultCore.borrow(TEST_BORROW_AMOUNT);
        switch(borrowResult) {
            case (#ok(vault)) {
                assert(vault.debt == TEST_BORROW_AMOUNT);
            };
            case (#err(e)) {
                Debug.trap("Borrow failed");
            };
        };

        // 4. Test Health Factor
        Debug.print("Testing health factor calculation...");
        let healthResult = await vaultCore.getVaultHealth(Principal.fromActor(vaultCore));
        switch(healthResult) {
            case (#ok(health)) {
                assert(health >= 150); // Minimum collateral ratio
            };
            case (#err(e)) {
                Debug.trap("Health check failed");
            };
        };

        // 5. Test Repayment
        Debug.print("Testing loan repayment...");
        let repayResult = await vaultCore.repay(TEST_BORROW_AMOUNT / 2);
        switch(repayResult) {
            case (#ok(vault)) {
                assert(vault.debt == TEST_BORROW_AMOUNT / 2);
            };
            case (#err(e)) {
                Debug.trap("Repayment failed");
            };
        };

        // 6. Test Withdrawal
        Debug.print("Testing collateral withdrawal...");
        let withdrawResult = await vaultCore.withdraw(#BTC, TEST_DEPOSIT_AMOUNT / 4);
        assert(Result.isOk(withdrawResult));

        Debug.print("All vault core tests passed! ✅");
    };

    // Helper to run specific test cases
    public func testHealthFactor() : async () {
        let vaultCore = await VaultCore.VaultCore();
        // Create vault with 200% collateralization
        let _ = await vaultCore.createVault();
        let _ = await vaultCore.deposit(#BTC, 2_000_000);
        let _ = await vaultCore.borrow(1_000_000);
        
        let health = await vaultCore.getVaultHealth(Principal.fromActor(vaultCore));
        assert(Result.isOk(health));
    };
}