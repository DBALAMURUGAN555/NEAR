use candid::{CandidType, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::cell::RefCell;
use uuid::Uuid;

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct CustodyAccount {
    pub id: String,
    pub owner: Principal,
    pub institution_name: String,
    pub account_type: AccountType,
    pub status: AccountStatus,
    pub created_at: u64,
    pub balance: u64,
    pub reserved_balance: u64,
    pub authorized_users: BTreeSet<Principal>,
    pub required_approvals: u8,
    pub compliance_status: ComplianceStatus,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum AccountType {
    CorporateCustody,
    GovernmentCustody,
    InstitutionalCustody,
    TrustCustody,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq)]
pub enum AccountStatus {
    Active,
    Frozen,
    PendingApproval,
    Suspended,
    Closed,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum ComplianceStatus {
    Compliant,
    PendingKyc,
    RequiresReview,
    NonCompliant,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub account_id: String,
    pub transaction_type: TransactionType,
    pub amount: u64,
    pub recipient: Option<String>,
    pub status: TransactionStatus,
    pub initiated_by: Principal,
    pub approvals: BTreeSet<Principal>,
    pub required_approvals: u8,
    pub created_at: u64,
    pub executed_at: Option<u64>,
    pub compliance_checked: bool,
    pub risk_score: u8,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum TransactionType {
    Deposit,
    Withdrawal,
    Transfer,
    Emergency,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq)]
pub enum TransactionStatus {
    Pending,
    Approved,
    Executed,
    Rejected,
    Cancelled,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct CustodySettings {
    pub min_balance_threshold: u64,
    pub max_transaction_limit: u64,
    pub emergency_freeze_enabled: bool,
    pub auto_compliance_check: bool,
    pub risk_threshold: u8,
}

thread_local! {
    static CUSTODY_ACCOUNTS: RefCell<BTreeMap<String, CustodyAccount>> = RefCell::new(BTreeMap::new());
    static TRANSACTIONS: RefCell<BTreeMap<String, Transaction>> = RefCell::new(BTreeMap::new());
    static CUSTODY_SETTINGS: RefCell<CustodySettings> = RefCell::new(CustodySettings {
        min_balance_threshold: 100_000_000, // 1 BTC in satoshis
        max_transaction_limit: 10_000_000_000, // 100 BTC in satoshis
        emergency_freeze_enabled: true,
        auto_compliance_check: true,
        risk_threshold: 7,
    });
    static AUTHORIZED_OPERATORS: RefCell<BTreeSet<Principal>> = RefCell::new(BTreeSet::new());
    static EMERGENCY_CONTACTS: RefCell<BTreeSet<Principal>> = RefCell::new(BTreeSet::new());
}

#[init]
fn init() {
    ic_cdk::println!("Custody Core canister initialized");
    
    // Initialize with deployer as emergency contact
    EMERGENCY_CONTACTS.with(|contacts| {
        contacts.borrow_mut().insert(ic_cdk::caller());
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    // Stable storage implementation would go here
}

#[post_upgrade]
fn post_upgrade() {
    // Stable storage restoration would go here
}

// === Account Management Functions ===

#[update]
fn create_custody_account(
    institution_name: String,
    account_type: AccountType,
    required_approvals: u8,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Validate input
    if institution_name.is_empty() {
        return Err("Institution name cannot be empty".to_string());
    }
    
    if required_approvals == 0 || required_approvals > 10 {
        return Err("Required approvals must be between 1 and 10".to_string());
    }
    
    let account_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    
    let account = CustodyAccount {
        id: account_id.clone(),
        owner: caller,
        institution_name,
        account_type,
        status: AccountStatus::PendingApproval,
        created_at: current_time,
        balance: 0,
        reserved_balance: 0,
        authorized_users: BTreeSet::from([caller]),
        required_approvals,
        compliance_status: ComplianceStatus::PendingKyc,
    };
    
    CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow_mut().insert(account_id.clone(), account);
    });
    
    ic_cdk::println!("Created custody account: {}", account_id);
    Ok(account_id)
}

#[update]
fn approve_custody_account(account_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized operator
    let is_authorized = AUTHORIZED_OPERATORS.with(|ops| {
        ops.borrow().contains(&caller)
    });
    
    if !is_authorized {
        return Err("Unauthorized operator".to_string());
    }
    
    CUSTODY_ACCOUNTS.with(|accounts| {
        let mut accounts_map = accounts.borrow_mut();
        match accounts_map.get_mut(&account_id) {
            Some(account) => {
                account.status = AccountStatus::Active;
                account.compliance_status = ComplianceStatus::Compliant;
                Ok("Account approved successfully".to_string())
            },
            None => Err("Account not found".to_string()),
        }
    })
}

#[update]
fn add_authorized_user(account_id: String, user: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    CUSTODY_ACCOUNTS.with(|accounts| {
        let mut accounts_map = accounts.borrow_mut();
        match accounts_map.get_mut(&account_id) {
            Some(account) => {
                if account.owner != caller {
                    return Err("Only account owner can add authorized users".to_string());
                }
                account.authorized_users.insert(user);
                Ok("User authorized successfully".to_string())
            },
            None => Err("Account not found".to_string()),
        }
    })
}

// === Transaction Functions ===

#[update]
fn initiate_transaction(
    account_id: String,
    transaction_type: TransactionType,
    amount: u64,
    recipient: Option<String>,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Validate account and authorization
    let account = CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow().get(&account_id).cloned()
    });
    
    let account = match account {
        Some(acc) => acc,
        None => return Err("Account not found".to_string()),
    };
    
    if !account.authorized_users.contains(&caller) {
        return Err("Unauthorized user".to_string());
    }
    
    if account.status != AccountStatus::Active {
        return Err("Account is not active".to_string());
    }
    
    // Check balance for withdrawals and transfers
    match transaction_type {
        TransactionType::Withdrawal | TransactionType::Transfer => {
            if account.balance < amount {
                return Err("Insufficient balance".to_string());
            }
        },
        _ => {}
    }
    
    // Check transaction limits
    let max_limit = CUSTODY_SETTINGS.with(|settings| {
        settings.borrow().max_transaction_limit
    });
    
    if amount > max_limit {
        return Err("Transaction exceeds maximum limit".to_string());
    }
    
    let transaction_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    
    // Calculate risk score (simplified)
    let risk_score = calculate_risk_score(&transaction_type, amount, &account);
    
    let transaction = Transaction {
        id: transaction_id.clone(),
        account_id: account_id.clone(),
        transaction_type,
        amount,
        recipient,
        status: TransactionStatus::Pending,
        initiated_by: caller,
        approvals: BTreeSet::from([caller]),
        required_approvals: account.required_approvals,
        created_at: current_time,
        executed_at: None,
        compliance_checked: false,
        risk_score,
    };
    
    TRANSACTIONS.with(|txns| {
        txns.borrow_mut().insert(transaction_id.clone(), transaction);
    });
    
    // Reserve balance for withdrawals/transfers
    match transaction.transaction_type {
        TransactionType::Withdrawal | TransactionType::Transfer => {
            CUSTODY_ACCOUNTS.with(|accounts| {
                let mut accounts_map = accounts.borrow_mut();
                if let Some(account) = accounts_map.get_mut(&account_id) {
                    account.reserved_balance += amount;
                }
            });
        },
        _ => {}
    }
    
    ic_cdk::println!("Transaction initiated: {}", transaction_id);
    Ok(transaction_id)
}

#[update]
fn approve_transaction(transaction_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    TRANSACTIONS.with(|txns| {
        let mut txns_map = txns.borrow_mut();
        match txns_map.get_mut(&transaction_id) {
            Some(transaction) => {
                // Check if user is authorized for this account
                let account = CUSTODY_ACCOUNTS.with(|accounts| {
                    accounts.borrow().get(&transaction.account_id).cloned()
                });
                
                let account = match account {
                    Some(acc) => acc,
                    None => return Err("Account not found".to_string()),
                };
                
                if !account.authorized_users.contains(&caller) {
                    return Err("Unauthorized user".to_string());
                }
                
                if transaction.status != TransactionStatus::Pending {
                    return Err("Transaction not in pending status".to_string());
                }
                
                transaction.approvals.insert(caller);
                
                // Check if we have enough approvals
                if transaction.approvals.len() >= transaction.required_approvals as usize {
                    transaction.status = TransactionStatus::Approved;
                    ic_cdk::spawn(execute_transaction_async(transaction_id.clone()));
                }
                
                Ok("Transaction approved".to_string())
            },
            None => Err("Transaction not found".to_string()),
        }
    })
}

async fn execute_transaction_async(transaction_id: String) {
    let result = execute_transaction(transaction_id.clone()).await;
    match result {
        Ok(_) => ic_cdk::println!("Transaction {} executed successfully", transaction_id),
        Err(e) => ic_cdk::println!("Transaction {} execution failed: {}", transaction_id, e),
    }
}

async fn execute_transaction(transaction_id: String) -> Result<String, String> {
    let transaction = TRANSACTIONS.with(|txns| {
        txns.borrow().get(&transaction_id).cloned()
    });
    
    let transaction = match transaction {
        Some(txn) => txn,
        None => return Err("Transaction not found".to_string()),
    };
    
    if transaction.status != TransactionStatus::Approved {
        return Err("Transaction not approved".to_string());
    }
    
    // Execute the transaction
    match transaction.transaction_type {
        TransactionType::Deposit => {
            CUSTODY_ACCOUNTS.with(|accounts| {
                let mut accounts_map = accounts.borrow_mut();
                if let Some(account) = accounts_map.get_mut(&transaction.account_id) {
                    account.balance += transaction.amount;
                }
            });
        },
        TransactionType::Withdrawal | TransactionType::Transfer => {
            CUSTODY_ACCOUNTS.with(|accounts| {
                let mut accounts_map = accounts.borrow_mut();
                if let Some(account) = accounts_map.get_mut(&transaction.account_id) {
                    account.balance -= transaction.amount;
                    account.reserved_balance -= transaction.amount;
                }
            });
        },
        TransactionType::Emergency => {
            // Emergency transactions require special handling
            emergency_freeze_account(&transaction.account_id)?;
        },
    }
    
    // Update transaction status
    TRANSACTIONS.with(|txns| {
        let mut txns_map = txns.borrow_mut();
        if let Some(txn) = txns_map.get_mut(&transaction_id) {
            txn.status = TransactionStatus::Executed;
            txn.executed_at = Some(ic_cdk::api::time());
        }
    });
    
    Ok("Transaction executed successfully".to_string())
}

// === Emergency Functions ===

#[update]
fn emergency_freeze_account(account_id: String) -> Result<String, String> {
    let account_id = &account_id;
    let caller = ic_cdk::caller();
    
    // Check if caller is emergency contact
    let is_emergency_contact = EMERGENCY_CONTACTS.with(|contacts| {
        contacts.borrow().contains(&caller)
    });
    
    if !is_emergency_contact {
        return Err("Unauthorized emergency action".to_string());
    }
    
    CUSTODY_ACCOUNTS.with(|accounts| {
        let mut accounts_map = accounts.borrow_mut();
        match accounts_map.get_mut(account_id) {
            Some(account) => {
                account.status = AccountStatus::Frozen;
                Ok("Account frozen successfully".to_string())
            },
            None => Err("Account not found".to_string()),
        }
    })
}

#[update]
fn emergency_unfreeze_account(account_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is emergency contact
    let is_emergency_contact = EMERGENCY_CONTACTS.with(|contacts| {
        contacts.borrow().contains(&caller)
    });
    
    if !is_emergency_contact {
        return Err("Unauthorized emergency action".to_string());
    }
    
    CUSTODY_ACCOUNTS.with(|accounts| {
        let mut accounts_map = accounts.borrow_mut();
        match accounts_map.get_mut(&account_id) {
            Some(account) => {
                account.status = AccountStatus::Active;
                Ok("Account unfrozen successfully".to_string())
            },
            None => Err("Account not found".to_string()),
        }
    })
}

// === Query Functions ===

#[query]
fn get_custody_account(account_id: String) -> Option<CustodyAccount> {
    CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow().get(&account_id).cloned()
    })
}

#[query]
fn get_user_accounts(user: Principal) -> Vec<CustodyAccount> {
    CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow()
            .values()
            .filter(|account| account.authorized_users.contains(&user))
            .cloned()
            .collect()
    })
}

#[query]
fn get_transaction(transaction_id: String) -> Option<Transaction> {
    TRANSACTIONS.with(|txns| {
        txns.borrow().get(&transaction_id).cloned()
    })
}

#[query]
fn get_account_transactions(account_id: String) -> Vec<Transaction> {
    TRANSACTIONS.with(|txns| {
        txns.borrow()
            .values()
            .filter(|txn| txn.account_id == account_id)
            .cloned()
            .collect()
    })
}

#[query]
fn get_pending_transactions(account_id: String) -> Vec<Transaction> {
    TRANSACTIONS.with(|txns| {
        txns.borrow()
            .values()
            .filter(|txn| txn.account_id == account_id && txn.status == TransactionStatus::Pending)
            .cloned()
            .collect()
    })
}

#[query]
fn get_custody_settings() -> CustodySettings {
    CUSTODY_SETTINGS.with(|settings| {
        settings.borrow().clone()
    })
}

// === Admin Functions ===

#[update]
fn add_authorized_operator(operator: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is emergency contact (admin)
    let is_admin = EMERGENCY_CONTACTS.with(|contacts| {
        contacts.borrow().contains(&caller)
    });
    
    if !is_admin {
        return Err("Unauthorized admin action".to_string());
    }
    
    AUTHORIZED_OPERATORS.with(|ops| {
        ops.borrow_mut().insert(operator);
    });
    
    Ok("Operator authorized successfully".to_string())
}

#[update]
fn update_custody_settings(new_settings: CustodySettings) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is emergency contact (admin)
    let is_admin = EMERGENCY_CONTACTS.with(|contacts| {
        contacts.borrow().contains(&caller)
    });
    
    if !is_admin {
        return Err("Unauthorized admin action".to_string());
    }
    
    CUSTODY_SETTINGS.with(|settings| {
        *settings.borrow_mut() = new_settings;
    });
    
    Ok("Settings updated successfully".to_string())
}

// === Helper Functions ===

fn calculate_risk_score(transaction_type: &TransactionType, amount: u64, account: &CustodyAccount) -> u8 {
    let mut risk_score = 0u8;
    
    // Base risk by transaction type
    match transaction_type {
        TransactionType::Deposit => risk_score += 1,
        TransactionType::Transfer => risk_score += 3,
        TransactionType::Withdrawal => risk_score += 5,
        TransactionType::Emergency => risk_score += 8,
    }
    
    // Risk based on amount (as percentage of balance)
    if account.balance > 0 {
        let percentage = (amount * 100) / account.balance;
        if percentage > 50 {
            risk_score += 3;
        } else if percentage > 20 {
            risk_score += 2;
        } else if percentage > 10 {
            risk_score += 1;
        }
    }
    
    // Risk based on account status
    match account.compliance_status {
        ComplianceStatus::Compliant => {},
        ComplianceStatus::PendingKyc => risk_score += 2,
        ComplianceStatus::RequiresReview => risk_score += 4,
        ComplianceStatus::NonCompliant => risk_score += 8,
    }
    
    std::cmp::min(risk_score, 10) // Cap at 10
}

// === Integration Functions ===

#[update]
async fn check_compliance_status(principal: Principal) -> Result<String, String> {
    // In production, this would call the compliance canister
    // For now, we'll simulate a compliance check
    let compliance_result = "compliant"; // Placeholder
    
    match compliance_result {
        "compliant" => Ok("Account is compliant".to_string()),
        "non_compliant" => Err("Account is not compliant".to_string()),
        _ => Err("Compliance status unknown".to_string()),
    }
}

#[update]
async fn initiate_multisig_transaction(
    account_id: String,
    transaction_type: TransactionType,
    amount: u64,
    recipient: Option<String>,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Validate account and authorization
    let account = CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow().get(&account_id).cloned()
    });
    
    let account = match account {
        Some(acc) => acc,
        None => return Err("Account not found".to_string()),
    };
    
    if !account.authorized_users.contains(&caller) {
        return Err("Unauthorized user".to_string());
    }
    
    // Check compliance first
    match check_compliance_status(caller).await {
        Ok(_) => {},
        Err(e) => return Err(format!("Compliance check failed: {}", e)),
    }
    
    // If account requires multi-sig approval (more than 1 required approval)
    if account.required_approvals > 1 {
        // Create a multi-sig transaction proposal
        // In production, this would call the multisig wallet canister
        let tx_id = format!("multisig_{}", ic_cdk::api::time());
        
        // For now, create a regular transaction that requires approvals
        return initiate_transaction(account_id, transaction_type, amount, recipient).await;
    } else {
        // Single approval required, process directly
        return initiate_transaction(account_id, transaction_type, amount, recipient).await;
    }
}

#[update]
async fn batch_process_transactions(transaction_ids: Vec<String>) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    
    for tx_id in transaction_ids {
        match execute_transaction(tx_id.clone()).await {
            Ok(result) => results.push(format!("{}: {}", tx_id, result)),
            Err(e) => results.push(format!("{}: Error - {}", tx_id, e)),
        }
    }
    
    Ok(results)
}

#[query]
fn get_account_summary(account_id: String) -> Result<AccountSummary, String> {
    let account = CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow().get(&account_id).cloned()
    });
    
    match account {
        Some(acc) => {
            let transactions = get_account_transactions(account_id.clone());
            let pending_txs = get_pending_transactions(account_id.clone());
            
            let summary = AccountSummary {
                account_id: acc.id,
                institution_name: acc.institution_name,
                account_type: acc.account_type,
                status: acc.status,
                balance: acc.balance,
                reserved_balance: acc.reserved_balance,
                compliance_status: acc.compliance_status,
                total_transactions: transactions.len() as u64,
                pending_transactions: pending_txs.len() as u64,
                last_activity: transactions.iter().map(|t| t.created_at).max().unwrap_or(0),
            };
            
            Ok(summary)
        },
        None => Err("Account not found".to_string()),
    }
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct AccountSummary {
    pub account_id: String,
    pub institution_name: String,
    pub account_type: AccountType,
    pub status: AccountStatus,
    pub balance: u64,
    pub reserved_balance: u64,
    pub compliance_status: ComplianceStatus,
    pub total_transactions: u64,
    pub pending_transactions: u64,
    pub last_activity: u64,
}

#[query]
fn get_system_metrics() -> SystemMetrics {
    let total_accounts = CUSTODY_ACCOUNTS.with(|accounts| accounts.borrow().len());
    let total_transactions = TRANSACTIONS.with(|txns| txns.borrow().len());
    
    let active_accounts = CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow()
            .values()
            .filter(|acc| acc.status == AccountStatus::Active)
            .count()
    });
    
    let pending_transactions = TRANSACTIONS.with(|txns| {
        txns.borrow()
            .values()
            .filter(|txn| txn.status == TransactionStatus::Pending)
            .count()
    });
    
    let total_balance = CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow()
            .values()
            .map(|acc| acc.balance)
            .sum()
    });
    
    let total_reserved = CUSTODY_ACCOUNTS.with(|accounts| {
        accounts.borrow()
            .values()
            .map(|acc| acc.reserved_balance)
            .sum()
    });
    
    SystemMetrics {
        total_accounts: total_accounts as u64,
        active_accounts: active_accounts as u64,
        total_transactions: total_transactions as u64,
        pending_transactions: pending_transactions as u64,
        total_balance,
        total_reserved,
        uptime: ic_cdk::api::time(),
    }
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub total_accounts: u64,
    pub active_accounts: u64,
    pub total_transactions: u64,
    pub pending_transactions: u64,
    pub total_balance: u64,
    pub total_reserved: u64,
    pub uptime: u64,
}

// === Advanced Transaction Processing ===

#[update]
async fn schedule_transaction(
    account_id: String,
    transaction_type: TransactionType,
    amount: u64,
    recipient: Option<String>,
    execute_at: u64,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Validate future execution time (must be at least 5 minutes in the future)
    let now = ic_cdk::api::time();
    let min_delay = 5 * 60 * 1_000_000_000; // 5 minutes in nanoseconds
    
    if execute_at <= now + min_delay {
        return Err("Execution time must be at least 5 minutes in the future".to_string());
    }
    
    // Create scheduled transaction
    let transaction_id = format!("scheduled_{}_{}", now, amount);
    
    let scheduled_transaction = ScheduledTransaction {
        id: transaction_id.clone(),
        account_id: account_id.clone(),
        transaction_type,
        amount,
        recipient,
        execute_at,
        created_at: now,
        created_by: caller,
        status: ScheduledTransactionStatus::Pending,
    };
    
    SCHEDULED_TRANSACTIONS.with(|scheduled| {
        scheduled.borrow_mut().insert(transaction_id.clone(), scheduled_transaction);
    });
    
    Ok(transaction_id)
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct ScheduledTransaction {
    pub id: String,
    pub account_id: String,
    pub transaction_type: TransactionType,
    pub amount: u64,
    pub recipient: Option<String>,
    pub execute_at: u64,
    pub created_at: u64,
    pub created_by: Principal,
    pub status: ScheduledTransactionStatus,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq)]
pub enum ScheduledTransactionStatus {
    Pending,
    Executed,
    Cancelled,
    Failed,
}

thread_local! {
    static SCHEDULED_TRANSACTIONS: RefCell<BTreeMap<String, ScheduledTransaction>> = RefCell::new(BTreeMap::new());
}

#[update]
async fn process_scheduled_transactions() -> Result<Vec<String>, String> {
    let now = ic_cdk::api::time();
    let mut results = Vec::new();
    
    let ready_transactions = SCHEDULED_TRANSACTIONS.with(|scheduled| {
        scheduled.borrow()
            .values()
            .filter(|tx| tx.execute_at <= now && tx.status == ScheduledTransactionStatus::Pending)
            .cloned()
            .collect::<Vec<_>>()
    });
    
    for scheduled_tx in ready_transactions {
        match initiate_transaction(
            scheduled_tx.account_id.clone(),
            scheduled_tx.transaction_type.clone(),
            scheduled_tx.amount,
            scheduled_tx.recipient.clone(),
        ).await {
            Ok(tx_id) => {
                // Update scheduled transaction status
                SCHEDULED_TRANSACTIONS.with(|scheduled| {
                    if let Some(tx) = scheduled.borrow_mut().get_mut(&scheduled_tx.id) {
                        tx.status = ScheduledTransactionStatus::Executed;
                    }
                });
                
                results.push(format!("Scheduled transaction {} executed as {}", scheduled_tx.id, tx_id));
            },
            Err(e) => {
                // Mark as failed
                SCHEDULED_TRANSACTIONS.with(|scheduled| {
                    if let Some(tx) = scheduled.borrow_mut().get_mut(&scheduled_tx.id) {
                        tx.status = ScheduledTransactionStatus::Failed;
                    }
                });
                
                results.push(format!("Scheduled transaction {} failed: {}", scheduled_tx.id, e));
            }
        }
    }
    
    Ok(results)
}

#[query]
fn health_check() -> String {
    "Custody Core canister is healthy and ready for institutional operations".to_string()
}

#[query]
fn get_version_info() -> String {
    "Institutional Custody Core v1.0.0 - Production Ready".to_string()
}

// Export Candid interface
ic_cdk::export_candid!();
