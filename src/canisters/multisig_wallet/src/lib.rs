use candid::{CandidType, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::cell::RefCell;
use uuid::Uuid;
use sha2::{Sha256, Digest};

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MultisigWallet {
    pub id: String,
    pub name: String,
    pub owners: BTreeSet<Principal>,
    pub threshold: u8,
    pub balance: u64,
    pub created_at: u64,
    pub wallet_type: WalletType,
    pub status: WalletStatus,
    pub daily_limit: u64,
    pub daily_spent: u64,
    pub last_reset_day: u64,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum WalletType {
    CorporateOperational,
    CorporateTreasury,
    GovernmentOperational,
    GovernmentEmergency,
    InstitutionalCold,
    InstitutionalHot,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum WalletStatus {
    Active,
    Frozen,
    Archived,
    Compromised,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MultisigTransaction {
    pub id: String,
    pub wallet_id: String,
    pub to: String,
    pub amount: u64,
    pub data: Vec<u8>,
    pub confirmations: BTreeSet<Principal>,
    pub rejections: BTreeSet<Principal>,
    pub executed: bool,
    pub rejected: bool,
    pub created_at: u64,
    pub executed_at: Option<u64>,
    pub transaction_hash: Option<String>,
    pub gas_price: Option<u64>,
    pub gas_limit: Option<u64>,
    pub nonce: Option<u64>,
    pub priority: TransactionPriority,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum TransactionPriority {
    Low,
    Normal,
    High,
    Emergency,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct WalletPolicy {
    pub require_confirmation_delay: bool,
    pub confirmation_delay_hours: u32,
    pub max_single_transaction: u64,
    pub require_dual_approval_above: u64,
    pub emergency_freeze_threshold: u64,
    pub allowed_destinations: Option<BTreeSet<String>>,
    pub restricted_destinations: BTreeSet<String>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct WalletAuditLog {
    pub id: String,
    pub wallet_id: String,
    pub action: AuditAction,
    pub actor: Principal,
    pub timestamp: u64,
    pub details: String,
    pub transaction_id: Option<String>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum AuditAction {
    WalletCreated,
    OwnerAdded,
    OwnerRemoved,
    ThresholdChanged,
    TransactionSubmitted,
    TransactionConfirmed,
    TransactionRejected,
    TransactionExecuted,
    WalletFrozen,
    WalletUnfrozen,
    PolicyUpdated,
    EmergencyAction,
}

thread_local! {
    static WALLETS: RefCell<BTreeMap<String, MultisigWallet>> = RefCell::new(BTreeMap::new());
    static TRANSACTIONS: RefCell<BTreeMap<String, MultisigTransaction>> = RefCell::new(BTreeMap::new());
    static WALLET_POLICIES: RefCell<BTreeMap<String, WalletPolicy>> = RefCell::new(BTreeMap::new());
    static AUDIT_LOGS: RefCell<BTreeMap<String, WalletAuditLog>> = RefCell::new(BTreeMap::new());
    static EMERGENCY_CONTACTS: RefCell<BTreeSet<Principal>> = RefCell::new(BTreeSet::new());
    static GLOBAL_FROZEN: RefCell<bool> = RefCell::new(false);
}

#[init]
fn init() {
    ic_cdk::println!("Multisig Wallet canister initialized");
    
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

// === Wallet Management Functions ===

#[update]
fn create_multisig_wallet(
    name: String,
    owners: Vec<Principal>,
    threshold: u8,
    wallet_type: WalletType,
    daily_limit: u64,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Validate inputs
    if name.is_empty() {
        return Err("Wallet name cannot be empty".to_string());
    }
    
    if owners.is_empty() || owners.len() > 20 {
        return Err("Must have 1-20 owners".to_string());
    }
    
    if threshold == 0 || threshold as usize > owners.len() {
        return Err("Invalid threshold".to_string());
    }
    
    let owners_set: BTreeSet<Principal> = owners.into_iter().collect();
    if !owners_set.contains(&caller) {
        return Err("Creator must be an owner".to_string());
    }
    
    let wallet_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    let current_day = current_time / (24 * 60 * 60 * 1_000_000_000);
    
    let wallet = MultisigWallet {
        id: wallet_id.clone(),
        name: name.clone(),
        owners: owners_set,
        threshold,
        balance: 0,
        created_at: current_time,
        wallet_type: wallet_type.clone(),
        status: WalletStatus::Active,
        daily_limit,
        daily_spent: 0,
        last_reset_day: current_day,
    };
    
    // Create default policy
    let policy = WalletPolicy {
        require_confirmation_delay: matches!(wallet_type, WalletType::CorporateTreasury | WalletType::InstitutionalCold),
        confirmation_delay_hours: match wallet_type {
            WalletType::CorporateTreasury | WalletType::InstitutionalCold => 24,
            WalletType::GovernmentEmergency => 1,
            _ => 0,
        },
        max_single_transaction: match wallet_type {
            WalletType::InstitutionalHot => 1_000_000_000, // 10 BTC
            WalletType::CorporateOperational => 500_000_000, // 5 BTC
            _ => 10_000_000_000, // 100 BTC
        },
        require_dual_approval_above: daily_limit / 10,
        emergency_freeze_threshold: daily_limit * 2,
        allowed_destinations: None,
        restricted_destinations: BTreeSet::new(),
    };
    
    WALLETS.with(|wallets| {
        wallets.borrow_mut().insert(wallet_id.clone(), wallet);
    });
    
    WALLET_POLICIES.with(|policies| {
        policies.borrow_mut().insert(wallet_id.clone(), policy);
    });
    
    // Log wallet creation
    let audit_id = Uuid::new_v4().to_string();
    let audit_log = WalletAuditLog {
        id: audit_id.clone(),
        wallet_id: wallet_id.clone(),
        action: AuditAction::WalletCreated,
        actor: caller,
        timestamp: current_time,
        details: format!("Wallet '{}' created with {} owners, threshold {}", name, owners_set.len(), threshold),
        transaction_id: None,
    };
    
    AUDIT_LOGS.with(|logs| {
        logs.borrow_mut().insert(audit_id, audit_log);
    });
    
    ic_cdk::println!("Created multisig wallet: {}", wallet_id);
    Ok(wallet_id)
}

#[update]
fn add_wallet_owner(wallet_id: String, new_owner: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    WALLETS.with(|wallets| {
        let mut wallets_map = wallets.borrow_mut();
        match wallets_map.get_mut(&wallet_id) {
            Some(wallet) => {
                if !wallet.owners.contains(&caller) {
                    return Err("Only owners can add new owners".to_string());
                }
                
                if wallet.owners.len() >= 20 {
                    return Err("Maximum 20 owners allowed".to_string());
                }
                
                if wallet.owners.contains(&new_owner) {
                    return Err("Principal is already an owner".to_string());
                }
                
                wallet.owners.insert(new_owner);
                
                // Log the action
                log_audit_action(&wallet_id, AuditAction::OwnerAdded, caller, 
                    format!("Added owner: {}", new_owner), None);
                
                Ok("Owner added successfully".to_string())
            },
            None => Err("Wallet not found".to_string()),
        }
    })
}

#[update]
fn remove_wallet_owner(wallet_id: String, owner_to_remove: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    WALLETS.with(|wallets| {
        let mut wallets_map = wallets.borrow_mut();
        match wallets_map.get_mut(&wallet_id) {
            Some(wallet) => {
                if !wallet.owners.contains(&caller) {
                    return Err("Only owners can remove owners".to_string());
                }
                
                if !wallet.owners.contains(&owner_to_remove) {
                    return Err("Principal is not an owner".to_string());
                }
                
                if wallet.owners.len() <= wallet.threshold as usize {
                    return Err("Cannot remove owner below threshold".to_string());
                }
                
                wallet.owners.remove(&owner_to_remove);
                
                // Log the action
                log_audit_action(&wallet_id, AuditAction::OwnerRemoved, caller, 
                    format!("Removed owner: {}", owner_to_remove), None);
                
                Ok("Owner removed successfully".to_string())
            },
            None => Err("Wallet not found".to_string()),
        }
    })
}

#[update]
fn change_threshold(wallet_id: String, new_threshold: u8) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    WALLETS.with(|wallets| {
        let mut wallets_map = wallets.borrow_mut();
        match wallets_map.get_mut(&wallet_id) {
            Some(wallet) => {
                if !wallet.owners.contains(&caller) {
                    return Err("Only owners can change threshold".to_string());
                }
                
                if new_threshold == 0 || new_threshold as usize > wallet.owners.len() {
                    return Err("Invalid threshold".to_string());
                }
                
                let old_threshold = wallet.threshold;
                wallet.threshold = new_threshold;
                
                // Log the action
                log_audit_action(&wallet_id, AuditAction::ThresholdChanged, caller, 
                    format!("Changed threshold from {} to {}", old_threshold, new_threshold), None);
                
                Ok("Threshold changed successfully".to_string())
            },
            None => Err("Wallet not found".to_string()),
        }
    })
}

// === Transaction Functions ===

#[update]
fn submit_transaction(
    wallet_id: String,
    to: String,
    amount: u64,
    data: Vec<u8>,
    priority: TransactionPriority,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check global freeze
    let is_frozen = GLOBAL_FROZEN.with(|frozen| *frozen.borrow());
    if is_frozen {
        return Err("Global freeze is active".to_string());
    }
    
    // Validate wallet and ownership
    let wallet = WALLETS.with(|wallets| {
        wallets.borrow().get(&wallet_id).cloned()
    });
    
    let wallet = match wallet {
        Some(w) => w,
        None => return Err("Wallet not found".to_string()),
    };
    
    if !wallet.owners.contains(&caller) {
        return Err("Only wallet owners can submit transactions".to_string());
    }
    
    if wallet.status != WalletStatus::Active {
        return Err("Wallet is not active".to_string());
    }
    
    // Check wallet policy
    let policy = WALLET_POLICIES.with(|policies| {
        policies.borrow().get(&wallet_id).cloned()
    });
    
    if let Some(policy) = policy {
        if amount > policy.max_single_transaction {
            return Err("Transaction exceeds maximum allowed amount".to_string());
        }
        
        if policy.restricted_destinations.contains(&to) {
            return Err("Destination is restricted".to_string());
        }
        
        if let Some(ref allowed) = policy.allowed_destinations {
            if !allowed.contains(&to) {
                return Err("Destination is not in allowed list".to_string());
            }
        }
    }
    
    // Check daily limit
    let current_day = ic_cdk::api::time() / (24 * 60 * 60 * 1_000_000_000);
    let updated_wallet = WALLETS.with(|wallets| {
        let mut wallets_map = wallets.borrow_mut();
        if let Some(wallet) = wallets_map.get_mut(&wallet_id) {
            if wallet.last_reset_day < current_day {
                wallet.daily_spent = 0;
                wallet.last_reset_day = current_day;
            }
            
            if wallet.daily_spent + amount > wallet.daily_limit {
                return Err("Transaction exceeds daily limit".to_string());
            }
            
            Ok(wallet.clone())
        } else {
            Err("Wallet not found".to_string())
        }
    })?;
    
    let transaction_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    
    let transaction = MultisigTransaction {
        id: transaction_id.clone(),
        wallet_id: wallet_id.clone(),
        to,
        amount,
        data,
        confirmations: BTreeSet::from([caller]),
        rejections: BTreeSet::new(),
        executed: false,
        rejected: false,
        created_at: current_time,
        executed_at: None,
        transaction_hash: None,
        gas_price: None,
        gas_limit: None,
        nonce: None,
        priority,
    };
    
    TRANSACTIONS.with(|txns| {
        txns.borrow_mut().insert(transaction_id.clone(), transaction);
    });
    
    // Log the action
    log_audit_action(&wallet_id, AuditAction::TransactionSubmitted, caller, 
        format!("Submitted transaction for {} satoshis", amount), Some(transaction_id.clone()));
    
    // Check if transaction can be auto-executed
    if updated_wallet.threshold == 1 {
        ic_cdk::spawn(execute_transaction_async(transaction_id.clone()));
    }
    
    ic_cdk::println!("Transaction submitted: {}", transaction_id);
    Ok(transaction_id)
}

#[update]
fn confirm_transaction(transaction_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    let result = TRANSACTIONS.with(|txns| {
        let mut txns_map = txns.borrow_mut();
        match txns_map.get_mut(&transaction_id) {
            Some(transaction) => {
                if transaction.executed || transaction.rejected {
                    return Err("Transaction already finalized".to_string());
                }
                
                // Check if caller is owner of the wallet
                let wallet = WALLETS.with(|wallets| {
                    wallets.borrow().get(&transaction.wallet_id).cloned()
                });
                
                let wallet = match wallet {
                    Some(w) => w,
                    None => return Err("Wallet not found".to_string()),
                };
                
                if !wallet.owners.contains(&caller) {
                    return Err("Only wallet owners can confirm transactions".to_string());
                }
                
                if transaction.rejections.contains(&caller) {
                    return Err("Cannot confirm after rejecting".to_string());
                }
                
                transaction.confirmations.insert(caller);
                
                // Check if we have enough confirmations
                let threshold_met = transaction.confirmations.len() >= wallet.threshold as usize;
                
                // Log the action
                log_audit_action(&transaction.wallet_id, AuditAction::TransactionConfirmed, caller, 
                    format!("Confirmed transaction {}", transaction_id), Some(transaction_id.clone()));
                
                if threshold_met {
                    ic_cdk::spawn(execute_transaction_async(transaction_id.clone()));
                    Ok("Transaction confirmed and will be executed".to_string())
                } else {
                    Ok(format!("Transaction confirmed ({}/{})", transaction.confirmations.len(), wallet.threshold))
                }
            },
            None => Err("Transaction not found".to_string()),
        }
    });
    
    result
}

#[update]
fn reject_transaction(transaction_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    TRANSACTIONS.with(|txns| {
        let mut txns_map = txns.borrow_mut();
        match txns_map.get_mut(&transaction_id) {
            Some(transaction) => {
                if transaction.executed || transaction.rejected {
                    return Err("Transaction already finalized".to_string());
                }
                
                // Check if caller is owner of the wallet
                let wallet = WALLETS.with(|wallets| {
                    wallets.borrow().get(&transaction.wallet_id).cloned()
                });
                
                let wallet = match wallet {
                    Some(w) => w,
                    None => return Err("Wallet not found".to_string()),
                };
                
                if !wallet.owners.contains(&caller) {
                    return Err("Only wallet owners can reject transactions".to_string());
                }
                
                transaction.rejections.insert(caller);
                transaction.confirmations.remove(&caller);
                
                // Check if transaction should be rejected
                let max_rejections = wallet.owners.len() - wallet.threshold as usize + 1;
                if transaction.rejections.len() >= max_rejections {
                    transaction.rejected = true;
                }
                
                // Log the action
                log_audit_action(&transaction.wallet_id, AuditAction::TransactionRejected, caller, 
                    format!("Rejected transaction {}", transaction_id), Some(transaction_id.clone()));
                
                Ok("Transaction rejected".to_string())
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
    
    let mut transaction = match transaction {
        Some(txn) => txn,
        None => return Err("Transaction not found".to_string()),
    };
    
    if transaction.executed || transaction.rejected {
        return Err("Transaction already finalized".to_string());
    }
    
    // Get wallet info
    let wallet = WALLETS.with(|wallets| {
        wallets.borrow().get(&transaction.wallet_id).cloned()
    });
    
    let wallet = match wallet {
        Some(w) => w,
        None => return Err("Wallet not found".to_string()),
    };
    
    if transaction.confirmations.len() < wallet.threshold as usize {
        return Err("Insufficient confirmations".to_string());
    }
    
    // Check wallet balance
    if wallet.balance < transaction.amount {
        return Err("Insufficient wallet balance".to_string());
    }
    
    // Update wallet balance and daily spent
    WALLETS.with(|wallets| {
        let mut wallets_map = wallets.borrow_mut();
        if let Some(wallet) = wallets_map.get_mut(&transaction.wallet_id) {
            wallet.balance -= transaction.amount;
            wallet.daily_spent += transaction.amount;
        }
    });
    
    // Mark transaction as executed
    transaction.executed = true;
    transaction.executed_at = Some(ic_cdk::api::time());
    
    // Generate transaction hash (simplified)
    let mut hasher = Sha256::new();
    hasher.update(format!("{}{}{}", transaction.to, transaction.amount, transaction.created_at));
    let hash_result = hasher.finalize();
    transaction.transaction_hash = Some(format!("{:x}", hash_result));
    
    TRANSACTIONS.with(|txns| {
        txns.borrow_mut().insert(transaction_id.clone(), transaction);
    });
    
    // Log execution
    log_audit_action(&wallet.id, AuditAction::TransactionExecuted, ic_cdk::caller(), 
        format!("Executed transaction for {} satoshis", transaction.amount), Some(transaction_id));
    
    Ok("Transaction executed successfully".to_string())
}

// === Emergency Functions ===

#[update]
fn emergency_freeze_wallet(wallet_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is emergency contact
    let is_emergency_contact = EMERGENCY_CONTACTS.with(|contacts| {
        contacts.borrow().contains(&caller)
    });
    
    let is_wallet_owner = WALLETS.with(|wallets| {
        if let Some(wallet) = wallets.borrow().get(&wallet_id) {
            wallet.owners.contains(&caller)
        } else {
            false
        }
    });
    
    if !is_emergency_contact && !is_wallet_owner {
        return Err("Unauthorized emergency action".to_string());
    }
    
    WALLETS.with(|wallets| {
        let mut wallets_map = wallets.borrow_mut();
        match wallets_map.get_mut(&wallet_id) {
            Some(wallet) => {
                wallet.status = WalletStatus::Frozen;
                
                // Log emergency action
                log_audit_action(&wallet_id, AuditAction::WalletFrozen, caller, 
                    "Emergency freeze activated".to_string(), None);
                
                Ok("Wallet frozen successfully".to_string())
            },
            None => Err("Wallet not found".to_string()),
        }
    })
}

#[update]
fn emergency_unfreeze_wallet(wallet_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is emergency contact
    let is_emergency_contact = EMERGENCY_CONTACTS.with(|contacts| {
        contacts.borrow().contains(&caller)
    });
    
    if !is_emergency_contact {
        return Err("Only emergency contacts can unfreeze wallets".to_string());
    }
    
    WALLETS.with(|wallets| {
        let mut wallets_map = wallets.borrow_mut();
        match wallets_map.get_mut(&wallet_id) {
            Some(wallet) => {
                wallet.status = WalletStatus::Active;
                
                // Log emergency action
                log_audit_action(&wallet_id, AuditAction::WalletUnfrozen, caller, 
                    "Emergency unfreeze activated".to_string(), None);
                
                Ok("Wallet unfrozen successfully".to_string())
            },
            None => Err("Wallet not found".to_string()),
        }
    })
}

#[update]
fn global_emergency_freeze() -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is emergency contact
    let is_emergency_contact = EMERGENCY_CONTACTS.with(|contacts| {
        contacts.borrow().contains(&caller)
    });
    
    if !is_emergency_contact {
        return Err("Unauthorized emergency action".to_string());
    }
    
    GLOBAL_FROZEN.with(|frozen| {
        *frozen.borrow_mut() = true;
    });
    
    Ok("Global emergency freeze activated".to_string())
}

// === Query Functions ===

#[query]
fn get_wallet(wallet_id: String) -> Option<MultisigWallet> {
    WALLETS.with(|wallets| {
        wallets.borrow().get(&wallet_id).cloned()
    })
}

#[query]
fn get_user_wallets(user: Principal) -> Vec<MultisigWallet> {
    WALLETS.with(|wallets| {
        wallets.borrow()
            .values()
            .filter(|wallet| wallet.owners.contains(&user))
            .cloned()
            .collect()
    })
}

#[query]
fn get_transaction(transaction_id: String) -> Option<MultisigTransaction> {
    TRANSACTIONS.with(|txns| {
        txns.borrow().get(&transaction_id).cloned()
    })
}

#[query]
fn get_wallet_transactions(wallet_id: String) -> Vec<MultisigTransaction> {
    TRANSACTIONS.with(|txns| {
        txns.borrow()
            .values()
            .filter(|txn| txn.wallet_id == wallet_id)
            .cloned()
            .collect()
    })
}

#[query]
fn get_pending_transactions(wallet_id: String) -> Vec<MultisigTransaction> {
    TRANSACTIONS.with(|txns| {
        txns.borrow()
            .values()
            .filter(|txn| txn.wallet_id == wallet_id && !txn.executed && !txn.rejected)
            .cloned()
            .collect()
    })
}

#[query]
fn get_wallet_policy(wallet_id: String) -> Option<WalletPolicy> {
    WALLET_POLICIES.with(|policies| {
        policies.borrow().get(&wallet_id).cloned()
    })
}

#[query]
fn get_audit_logs(wallet_id: String) -> Vec<WalletAuditLog> {
    AUDIT_LOGS.with(|logs| {
        logs.borrow()
            .values()
            .filter(|log| log.wallet_id == wallet_id)
            .cloned()
            .collect()
    })
}

// === Helper Functions ===

fn log_audit_action(
    wallet_id: &str,
    action: AuditAction,
    actor: Principal,
    details: String,
    transaction_id: Option<String>,
) {
    let audit_id = Uuid::new_v4().to_string();
    let audit_log = WalletAuditLog {
        id: audit_id.clone(),
        wallet_id: wallet_id.to_string(),
        action,
        actor,
        timestamp: ic_cdk::api::time(),
        details,
        transaction_id,
    };
    
    AUDIT_LOGS.with(|logs| {
        logs.borrow_mut().insert(audit_id, audit_log);
    });
}

#[query]
fn health_check() -> String {
    "Multisig Wallet canister is healthy".to_string()
}

// Export Candid interface
ic_cdk::export_candid!();
