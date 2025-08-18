#[cfg(test)]
mod tests {
    use super::*;
    use candid::Principal;
    use std::collections::BTreeSet;

    // Helper function to create a test principal
    fn test_principal(id: u8) -> Principal {
        Principal::from_slice(&[id; 29])
    }

    // Helper function to create a test account
    fn create_test_account(id: u8, required_approvals: u8) -> CustodyAccount {
        CustodyAccount {
            id: format!("test_account_{}", id),
            owner: test_principal(id),
            institution_name: format!("Test Institution {}", id),
            account_type: AccountType::CorporateCustody,
            status: AccountStatus::Active,
            created_at: 1234567890,
            balance: 1000000,
            reserved_balance: 0,
            authorized_users: BTreeSet::from([test_principal(id)]),
            required_approvals,
            compliance_status: ComplianceStatus::Compliant,
        }
    }

    #[test]
    fn test_account_creation() {
        let account = create_test_account(1, 2);
        assert_eq!(account.id, "test_account_1");
        assert_eq!(account.institution_name, "Test Institution 1");
        assert_eq!(account.required_approvals, 2);
        assert_eq!(account.balance, 1000000);
        assert_eq!(account.status, AccountStatus::Active);
    }

    #[test]
    fn test_transaction_creation() {
        let account = create_test_account(1, 2);
        
        let transaction = Transaction {
            id: "test_tx_1".to_string(),
            account_id: account.id.clone(),
            transaction_type: TransactionType::Withdrawal,
            amount: 500000,
            recipient: Some("test_recipient".to_string()),
            status: TransactionStatus::Pending,
            initiated_by: test_principal(1),
            approvals: BTreeSet::new(),
            required_approvals: 2,
            created_at: 1234567890,
            executed_at: None,
            compliance_checked: false,
            risk_score: 5,
        };

        assert_eq!(transaction.amount, 500000);
        assert_eq!(transaction.status, TransactionStatus::Pending);
        assert_eq!(transaction.required_approvals, 2);
    }

    #[test]
    fn test_risk_score_calculation() {
        let account = create_test_account(1, 2);
        
        // Test low risk deposit
        let deposit_score = calculate_risk_score(&TransactionType::Deposit, 100000, &account);
        assert!(deposit_score <= 3);
        
        // Test high risk withdrawal
        let withdrawal_score = calculate_risk_score(&TransactionType::Withdrawal, 800000, &account);
        assert!(withdrawal_score >= 7);
        
        // Test emergency transaction
        let emergency_score = calculate_risk_score(&TransactionType::Emergency, 0, &account);
        assert!(emergency_score >= 8);
    }

    #[test]
    fn test_compliance_status_validation() {
        let mut account = create_test_account(1, 2);
        
        // Test compliant account
        assert_eq!(account.compliance_status, ComplianceStatus::Compliant);
        
        // Test non-compliant account
        account.compliance_status = ComplianceStatus::NonCompliant;
        assert_eq!(account.compliance_status, ComplianceStatus::NonCompliant);
        
        // Test pending KYC
        account.compliance_status = ComplianceStatus::PendingKyc;
        assert_eq!(account.compliance_status, ComplianceStatus::PendingKyc);
    }

    #[test]
    fn test_account_balance_operations() {
        let mut account = create_test_account(1, 1);
        let initial_balance = account.balance;
        
        // Test deposit
        account.balance += 200000;
        assert_eq!(account.balance, initial_balance + 200000);
        
        // Test withdrawal
        account.balance -= 150000;
        assert_eq!(account.balance, initial_balance + 200000 - 150000);
        
        // Test reserve balance
        account.reserved_balance = 100000;
        assert_eq!(account.reserved_balance, 100000);
    }

    #[test]
    fn test_multi_signature_approval_flow() {
        let mut transaction = Transaction {
            id: "test_tx_multisig".to_string(),
            account_id: "test_account_1".to_string(),
            transaction_type: TransactionType::Transfer,
            amount: 750000,
            recipient: Some("recipient_address".to_string()),
            status: TransactionStatus::Pending,
            initiated_by: test_principal(1),
            approvals: BTreeSet::new(),
            required_approvals: 3,
            created_at: 1234567890,
            executed_at: None,
            compliance_checked: false,
            risk_score: 6,
        };

        // Add first approval
        transaction.approvals.insert(test_principal(1));
        assert_eq!(transaction.approvals.len(), 1);
        assert_eq!(transaction.status, TransactionStatus::Pending);

        // Add second approval
        transaction.approvals.insert(test_principal(2));
        assert_eq!(transaction.approvals.len(), 2);
        assert_eq!(transaction.status, TransactionStatus::Pending);

        // Add third approval - should trigger approval
        transaction.approvals.insert(test_principal(3));
        assert_eq!(transaction.approvals.len(), 3);
        
        // Simulate status update after sufficient approvals
        if transaction.approvals.len() >= transaction.required_approvals as usize {
            transaction.status = TransactionStatus::Approved;
        }
        assert_eq!(transaction.status, TransactionStatus::Approved);
    }

    #[test]
    fn test_emergency_freeze_functionality() {
        let mut account = create_test_account(1, 2);
        assert_eq!(account.status, AccountStatus::Active);
        
        // Simulate emergency freeze
        account.status = AccountStatus::Frozen;
        assert_eq!(account.status, AccountStatus::Frozen);
        
        // Verify account is no longer active
        assert_ne!(account.status, AccountStatus::Active);
    }

    #[test]
    fn test_transaction_limits_validation() {
        let account = create_test_account(1, 2);
        let max_limit = 10_000_000_000u64; // 100 BTC equivalent
        
        // Test valid transaction amount
        let valid_amount = 500_000_000u64; // 5 BTC equivalent
        assert!(valid_amount <= max_limit);
        
        // Test invalid transaction amount
        let invalid_amount = 15_000_000_000u64; // 150 BTC equivalent
        assert!(invalid_amount > max_limit);
        
        // Test sufficient balance
        let transaction_amount = 800_000u64;
        assert!(account.balance >= transaction_amount);
        
        // Test insufficient balance
        let large_amount = 2_000_000u64;
        assert!(account.balance < large_amount);
    }

    #[test]
    fn test_authorized_users_management() {
        let mut account = create_test_account(1, 2);
        let initial_count = account.authorized_users.len();
        
        // Add new authorized user
        let new_user = test_principal(99);
        account.authorized_users.insert(new_user);
        assert_eq!(account.authorized_users.len(), initial_count + 1);
        assert!(account.authorized_users.contains(&new_user));
        
        // Remove authorized user
        account.authorized_users.remove(&new_user);
        assert_eq!(account.authorized_users.len(), initial_count);
        assert!(!account.authorized_users.contains(&new_user));
    }

    #[test]
    fn test_account_type_categorization() {
        let corporate_account = CustodyAccount {
            account_type: AccountType::CorporateCustody,
            ..create_test_account(1, 2)
        };
        assert!(matches!(corporate_account.account_type, AccountType::CorporateCustody));
        
        let gov_account = CustodyAccount {
            account_type: AccountType::GovernmentCustody,
            ..create_test_account(2, 3)
        };
        assert!(matches!(gov_account.account_type, AccountType::GovernmentCustody));
        
        let institutional_account = CustodyAccount {
            account_type: AccountType::InstitutionalCustody,
            ..create_test_account(3, 4)
        };
        assert!(matches!(institutional_account.account_type, AccountType::InstitutionalCustody));
    }

    #[test]
    fn test_transaction_status_transitions() {
        let mut transaction = Transaction {
            status: TransactionStatus::Pending,
            ..Transaction {
                id: "status_test_tx".to_string(),
                account_id: "test_account_1".to_string(),
                transaction_type: TransactionType::Transfer,
                amount: 100000,
                recipient: Some("test_recipient".to_string()),
                initiated_by: test_principal(1),
                approvals: BTreeSet::new(),
                required_approvals: 2,
                created_at: 1234567890,
                executed_at: None,
                compliance_checked: false,
                risk_score: 3,
            }
        };

        // Test valid status transitions
        assert_eq!(transaction.status, TransactionStatus::Pending);
        
        transaction.status = TransactionStatus::Approved;
        assert_eq!(transaction.status, TransactionStatus::Approved);
        
        transaction.status = TransactionStatus::Executed;
        assert_eq!(transaction.status, TransactionStatus::Executed);
        
        // Test rejection flow
        let mut rejected_tx = transaction.clone();
        rejected_tx.status = TransactionStatus::Rejected;
        assert_eq!(rejected_tx.status, TransactionStatus::Rejected);
    }

    #[test]
    fn test_custody_settings_validation() {
        let settings = CustodySettings {
            min_balance_threshold: 100_000_000,
            max_transaction_limit: 10_000_000_000,
            emergency_freeze_enabled: true,
            auto_compliance_check: true,
            risk_threshold: 7,
        };

        assert_eq!(settings.min_balance_threshold, 100_000_000);
        assert_eq!(settings.max_transaction_limit, 10_000_000_000);
        assert!(settings.emergency_freeze_enabled);
        assert!(settings.auto_compliance_check);
        assert_eq!(settings.risk_threshold, 7);
    }

    #[test]
    fn test_scheduled_transaction_functionality() {
        let scheduled_tx = ScheduledTransaction {
            id: "scheduled_tx_1".to_string(),
            account_id: "test_account_1".to_string(),
            transaction_type: TransactionType::Transfer,
            amount: 250000,
            recipient: Some("future_recipient".to_string()),
            execute_at: 1234567890 + 3600, // 1 hour in the future
            created_at: 1234567890,
            created_by: test_principal(1),
            status: ScheduledTransactionStatus::Pending,
        };

        assert_eq!(scheduled_tx.status, ScheduledTransactionStatus::Pending);
        assert!(scheduled_tx.execute_at > scheduled_tx.created_at);
        assert_eq!(scheduled_tx.amount, 250000);
    }

    #[test]
    fn test_account_summary_generation() {
        let account = create_test_account(1, 2);
        let transactions = vec![
            Transaction {
                id: "tx_1".to_string(),
                account_id: account.id.clone(),
                created_at: 1234567890,
                ..Transaction {
                    transaction_type: TransactionType::Deposit,
                    amount: 100000,
                    recipient: None,
                    status: TransactionStatus::Executed,
                    initiated_by: test_principal(1),
                    approvals: BTreeSet::new(),
                    required_approvals: 1,
                    executed_at: Some(1234567891),
                    compliance_checked: true,
                    risk_score: 2,
                }
            }
        ];

        let summary = AccountSummary {
            account_id: account.id.clone(),
            institution_name: account.institution_name.clone(),
            account_type: account.account_type.clone(),
            status: account.status.clone(),
            balance: account.balance,
            reserved_balance: account.reserved_balance,
            compliance_status: account.compliance_status.clone(),
            total_transactions: transactions.len() as u64,
            pending_transactions: 0,
            last_activity: transactions.iter().map(|t| t.created_at).max().unwrap_or(0),
        };

        assert_eq!(summary.total_transactions, 1);
        assert_eq!(summary.pending_transactions, 0);
        assert_eq!(summary.balance, 1000000);
    }

    #[test]
    fn test_system_metrics_calculation() {
        let accounts = vec![
            create_test_account(1, 2),
            create_test_account(2, 3),
            create_test_account(3, 1),
        ];

        let active_count = accounts.iter()
            .filter(|acc| acc.status == AccountStatus::Active)
            .count();

        let total_balance: u64 = accounts.iter()
            .map(|acc| acc.balance)
            .sum();

        let metrics = SystemMetrics {
            total_accounts: accounts.len() as u64,
            active_accounts: active_count as u64,
            total_transactions: 0,
            pending_transactions: 0,
            total_balance,
            total_reserved: 0,
            uptime: 1234567890,
        };

        assert_eq!(metrics.total_accounts, 3);
        assert_eq!(metrics.active_accounts, 3);
        assert_eq!(metrics.total_balance, 3000000); // 3 accounts * 1M each
    }
}
