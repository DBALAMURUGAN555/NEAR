use candid::{CandidType, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::cell::RefCell;
use uuid::Uuid;
use sha2::{Sha256, Digest};

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: u64,
    pub event_type: EventType,
    pub actor: Principal,
    pub resource_type: ResourceType,
    pub resource_id: String,
    pub action: String,
    pub details: String,
    pub metadata: AuditMetadata,
    pub hash: String,
    pub previous_hash: Option<String>,
    pub compliance_relevant: bool,
    pub retention_until: Option<u64>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum EventType {
    AccountCreation,
    AccountModification,
    AccountClosure,
    TransactionInitiated,
    TransactionApproved,
    TransactionExecuted,
    TransactionRejected,
    ComplianceCheck,
    KycUpdate,
    RiskAssessment,
    EmergencyAction,
    SystemConfiguration,
    UserAuthentication,
    AccessGranted,
    AccessDenied,
    DataExport,
    DataModification,
    PolicyUpdate,
    AuditAccess,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum ResourceType {
    CustodyAccount,
    MultisigWallet,
    Transaction,
    KycProfile,
    ComplianceReport,
    User,
    System,
    Document,
    Policy,
    AuditLog,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct AuditMetadata {
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub session_id: Option<String>,
    pub request_id: Option<String>,
    pub canister_id: Option<String>,
    pub method_name: Option<String>,
    pub before_state: Option<String>,
    pub after_state: Option<String>,
    pub error_code: Option<String>,
    pub additional_context: BTreeMap<String, String>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct AuditQuery {
    pub event_types: Option<Vec<EventType>>,
    pub resource_types: Option<Vec<ResourceType>>,
    pub actors: Option<Vec<Principal>>,
    pub resource_ids: Option<Vec<String>>,
    pub start_time: Option<u64>,
    pub end_time: Option<u64>,
    pub compliance_relevant_only: bool,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct ComplianceReport {
    pub id: String,
    pub report_type: ReportType,
    pub period_start: u64,
    pub period_end: u64,
    pub generated_at: u64,
    pub generated_by: Principal,
    pub entries_count: u32,
    pub summary: String,
    pub hash: String,
    pub digital_signature: Option<String>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum ReportType {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Annual,
    OnDemand,
    Regulatory,
    Internal,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct AuditSettings {
    pub retention_days: u32,
    pub auto_archive_enabled: bool,
    pub compliance_reporting_enabled: bool,
    pub real_time_alerts_enabled: bool,
    pub hash_verification_enabled: bool,
    pub digital_signatures_enabled: bool,
    pub audit_access_logging: bool,
}

thread_local! {
    static AUDIT_ENTRIES: RefCell<BTreeMap<String, AuditEntry>> = RefCell::new(BTreeMap::new());
    static COMPLIANCE_REPORTS: RefCell<BTreeMap<String, ComplianceReport>> = RefCell::new(BTreeMap::new());
    static LAST_ENTRY_HASH: RefCell<Option<String>> = RefCell::new(None);
    static AUDIT_SETTINGS: RefCell<AuditSettings> = RefCell::new(AuditSettings {
        retention_days: 2555, // 7 years
        auto_archive_enabled: true,
        compliance_reporting_enabled: true,
        real_time_alerts_enabled: true,
        hash_verification_enabled: true,
        digital_signatures_enabled: false,
        audit_access_logging: true,
    });
    static AUDITORS: RefCell<BTreeMap<Principal, String>> = RefCell::new(BTreeMap::new());
    static ENTRY_COUNTER: RefCell<u64> = RefCell::new(0);
}

#[init]
fn init() {
    ic_cdk::println!("Audit Trail canister initialized");
    
    // Add deployer as initial auditor
    AUDITORS.with(|auditors| {
        auditors.borrow_mut().insert(ic_cdk::caller(), "System Administrator".to_string());
    });
    
    // Log initialization
    let init_entry = create_audit_entry(
        EventType::SystemConfiguration,
        ic_cdk::caller(),
        ResourceType::System,
        "audit_trail_canister".to_string(),
        "initialization".to_string(),
        "Audit Trail canister initialized".to_string(),
        AuditMetadata::default(),
        true,
    );
    
    AUDIT_ENTRIES.with(|entries| {
        entries.borrow_mut().insert(init_entry.id.clone(), init_entry);
    });
}

impl Default for AuditMetadata {
    fn default() -> Self {
        AuditMetadata {
            ip_address: None,
            user_agent: None,
            session_id: None,
            request_id: None,
            canister_id: None,
            method_name: None,
            before_state: None,
            after_state: None,
            error_code: None,
            additional_context: BTreeMap::new(),
        }
    }
}

#[pre_upgrade]
fn pre_upgrade() {
    // Log upgrade start
    let upgrade_entry = create_audit_entry(
        EventType::SystemConfiguration,
        ic_cdk::caller(),
        ResourceType::System,
        "audit_trail_canister".to_string(),
        "pre_upgrade".to_string(),
        "Canister upgrade initiated".to_string(),
        AuditMetadata::default(),
        true,
    );
    
    AUDIT_ENTRIES.with(|entries| {
        entries.borrow_mut().insert(upgrade_entry.id.clone(), upgrade_entry);
    });
}

#[post_upgrade]
fn post_upgrade() {
    // Log upgrade completion
    let upgrade_entry = create_audit_entry(
        EventType::SystemConfiguration,
        ic_cdk::caller(),
        ResourceType::System,
        "audit_trail_canister".to_string(),
        "post_upgrade".to_string(),
        "Canister upgrade completed".to_string(),
        AuditMetadata::default(),
        true,
    );
    
    AUDIT_ENTRIES.with(|entries| {
        entries.borrow_mut().insert(upgrade_entry.id.clone(), upgrade_entry);
    });
}

// === Core Audit Functions ===

#[update]
pub fn log_audit_event(
    event_type: EventType,
    resource_type: ResourceType,
    resource_id: String,
    action: String,
    details: String,
    metadata: Option<AuditMetadata>,
    compliance_relevant: bool,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    let audit_metadata = metadata.unwrap_or_default();
    
    let entry = create_audit_entry(
        event_type,
        caller,
        resource_type,
        resource_id,
        action,
        details,
        audit_metadata,
        compliance_relevant,
    );
    
    let entry_id = entry.id.clone();
    
    AUDIT_ENTRIES.with(|entries| {
        entries.borrow_mut().insert(entry_id.clone(), entry);
    });
    
    // Log the audit access if enabled
    let settings = AUDIT_SETTINGS.with(|s| s.borrow().clone());
    if settings.audit_access_logging {
        log_audit_access(caller, "log_audit_event", entry_id.clone());
    }
    
    Ok(entry_id)
}

fn create_audit_entry(
    event_type: EventType,
    actor: Principal,
    resource_type: ResourceType,
    resource_id: String,
    action: String,
    details: String,
    metadata: AuditMetadata,
    compliance_relevant: bool,
) -> AuditEntry {
    let entry_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    
    // Get previous hash for chain integrity
    let previous_hash = LAST_ENTRY_HASH.with(|hash| hash.borrow().clone());
    
    // Create entry hash
    let entry_hash = calculate_entry_hash(
        &entry_id,
        current_time,
        &event_type,
        &actor,
        &resource_type,
        &resource_id,
        &action,
        &details,
        &previous_hash,
    );
    
    // Update last entry hash
    LAST_ENTRY_HASH.with(|hash| {
        *hash.borrow_mut() = Some(entry_hash.clone());
    });
    
    // Calculate retention period
    let retention_until = if compliance_relevant {
        let settings = AUDIT_SETTINGS.with(|s| s.borrow().clone());
        Some(current_time + (settings.retention_days as u64 * 24 * 60 * 60 * 1_000_000_000))
    } else {
        None
    };
    
    // Increment counter
    ENTRY_COUNTER.with(|counter| {
        *counter.borrow_mut() += 1;
    });
    
    AuditEntry {
        id: entry_id,
        timestamp: current_time,
        event_type,
        actor,
        resource_type,
        resource_id,
        action,
        details,
        metadata,
        hash: entry_hash,
        previous_hash,
        compliance_relevant,
        retention_until,
    }
}

fn calculate_entry_hash(
    entry_id: &str,
    timestamp: u64,
    event_type: &EventType,
    actor: &Principal,
    resource_type: &ResourceType,
    resource_id: &str,
    action: &str,
    details: &str,
    previous_hash: &Option<String>,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(entry_id.as_bytes());
    hasher.update(timestamp.to_be_bytes());
    hasher.update(format!("{:?}", event_type).as_bytes());
    hasher.update(actor.to_string().as_bytes());
    hasher.update(format!("{:?}", resource_type).as_bytes());
    hasher.update(resource_id.as_bytes());
    hasher.update(action.as_bytes());
    hasher.update(details.as_bytes());
    
    if let Some(prev_hash) = previous_hash {
        hasher.update(prev_hash.as_bytes());
    }
    
    let result = hasher.finalize();
    format!("{:x}", result)
}

// === Query Functions ===

#[query]
fn query_audit_entries(query: AuditQuery) -> Vec<AuditEntry> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        ic_cdk::println!("Unauthorized audit query attempt from: {}", caller);
        return Vec::new();
    }
    
    // Log audit access
    log_audit_access(caller, "query_audit_entries", "multiple".to_string());
    
    AUDIT_ENTRIES.with(|entries| {
        let entries_map = entries.borrow();
        let mut results: Vec<AuditEntry> = entries_map
            .values()
            .filter(|entry| matches_query(entry, &query))
            .cloned()
            .collect();
        
        // Sort by timestamp (newest first)
        results.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // Apply limit and offset
        if let Some(offset) = query.offset {
            if offset as usize >= results.len() {
                return Vec::new();
            }
            results = results.into_iter().skip(offset as usize).collect();
        }
        
        if let Some(limit) = query.limit {
            results.truncate(limit as usize);
        }
        
        results
    })
}

fn matches_query(entry: &AuditEntry, query: &AuditQuery) -> bool {
    // Filter by event types
    if let Some(ref event_types) = query.event_types {
        if !event_types.contains(&entry.event_type) {
            return false;
        }
    }
    
    // Filter by resource types
    if let Some(ref resource_types) = query.resource_types {
        if !resource_types.contains(&entry.resource_type) {
            return false;
        }
    }
    
    // Filter by actors
    if let Some(ref actors) = query.actors {
        if !actors.contains(&entry.actor) {
            return false;
        }
    }
    
    // Filter by resource IDs
    if let Some(ref resource_ids) = query.resource_ids {
        if !resource_ids.contains(&entry.resource_id) {
            return false;
        }
    }
    
    // Filter by time range
    if let Some(start_time) = query.start_time {
        if entry.timestamp < start_time {
            return false;
        }
    }
    
    if let Some(end_time) = query.end_time {
        if entry.timestamp > end_time {
            return false;
        }
    }
    
    // Filter by compliance relevance
    if query.compliance_relevant_only && !entry.compliance_relevant {
        return false;
    }
    
    true
}

#[query]
fn get_audit_entry(entry_id: String) -> Option<AuditEntry> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        ic_cdk::println!("Unauthorized audit entry access attempt from: {}", caller);
        return None;
    }
    
    // Log audit access
    log_audit_access(caller, "get_audit_entry", entry_id.clone());
    
    AUDIT_ENTRIES.with(|entries| {
        entries.borrow().get(&entry_id).cloned()
    })
}

#[query]
fn verify_audit_chain() -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        return Err("Unauthorized access".to_string());
    }
    
    // Log audit access
    log_audit_access(caller, "verify_audit_chain", "chain_verification".to_string());
    
    AUDIT_ENTRIES.with(|entries| {
        let entries_map = entries.borrow();
        let mut entries_vec: Vec<&AuditEntry> = entries_map.values().collect();
        
        // Sort by timestamp
        entries_vec.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        
        let mut previous_hash: Option<String> = None;
        
        for entry in entries_vec {
            // Verify hash integrity
            let calculated_hash = calculate_entry_hash(
                &entry.id,
                entry.timestamp,
                &entry.event_type,
                &entry.actor,
                &entry.resource_type,
                &entry.resource_id,
                &entry.action,
                &entry.details,
                &previous_hash,
            );
            
            if calculated_hash != entry.hash {
                return Err(format!("Hash mismatch in entry: {}", entry.id));
            }
            
            // Verify chain integrity
            if entry.previous_hash != previous_hash {
                return Err(format!("Chain integrity broken at entry: {}", entry.id));
            }
            
            previous_hash = Some(entry.hash.clone());
        }
        
        Ok("Audit chain verification successful".to_string())
    })
}

// === Compliance Reporting Functions ===

#[update]
fn generate_compliance_report(
    report_type: ReportType,
    period_start: u64,
    period_end: u64,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        return Err("Unauthorized access".to_string());
    }
    
    let report_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    
    // Query compliance-relevant entries in the period
    let query = AuditQuery {
        event_types: None,
        resource_types: None,
        actors: None,
        resource_ids: None,
        start_time: Some(period_start),
        end_time: Some(period_end),
        compliance_relevant_only: true,
        limit: None,
        offset: None,
    };
    
    let entries = query_audit_entries(query);
    let entries_count = entries.len() as u32;
    
    // Generate summary
    let summary = format!(
        "Compliance report covering period {} to {} with {} relevant entries",
        period_start, period_end, entries_count
    );
    
    // Calculate report hash
    let mut hasher = Sha256::new();
    hasher.update(report_id.as_bytes());
    hasher.update(current_time.to_be_bytes());
    hasher.update(summary.as_bytes());
    hasher.update(entries_count.to_be_bytes());
    let report_hash = format!("{:x}", hasher.finalize());
    
    let report = ComplianceReport {
        id: report_id.clone(),
        report_type,
        period_start,
        period_end,
        generated_at: current_time,
        generated_by: caller,
        entries_count,
        summary,
        hash: report_hash,
        digital_signature: None, // Would implement digital signatures in production
    };
    
    COMPLIANCE_REPORTS.with(|reports| {
        reports.borrow_mut().insert(report_id.clone(), report);
    });
    
    // Log report generation
    let _audit_entry = log_audit_event(
        EventType::ComplianceCheck,
        ResourceType::ComplianceReport,
        report_id.clone(),
        "generate_report".to_string(),
        format!("Generated {} compliance report for period {} to {}", 
            format!("{:?}", report.report_type), period_start, period_end),
        None,
        true,
    )?;
    
    Ok(report_id)
}

#[query]
fn get_compliance_report(report_id: String) -> Option<ComplianceReport> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        ic_cdk::println!("Unauthorized compliance report access attempt from: {}", caller);
        return None;
    }
    
    // Log audit access
    log_audit_access(caller, "get_compliance_report", report_id.clone());
    
    COMPLIANCE_REPORTS.with(|reports| {
        reports.borrow().get(&report_id).cloned()
    })
}

#[query]
fn list_compliance_reports() -> Vec<ComplianceReport> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        ic_cdk::println!("Unauthorized compliance reports list access attempt from: {}", caller);
        return Vec::new();
    }
    
    // Log audit access
    log_audit_access(caller, "list_compliance_reports", "all_reports".to_string());
    
    COMPLIANCE_REPORTS.with(|reports| {
        reports.borrow().values().cloned().collect()
    })
}

// === Administrative Functions ===

#[update]
fn add_auditor(auditor: Principal, name: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        return Err("Unauthorized access".to_string());
    }
    
    AUDITORS.with(|auditors| {
        auditors.borrow_mut().insert(auditor, name.clone());
    });
    
    // Log auditor addition
    let _audit_entry = log_audit_event(
        EventType::SystemConfiguration,
        ResourceType::User,
        auditor.to_string(),
        "add_auditor".to_string(),
        format!("Added auditor: {}", name),
        None,
        true,
    )?;
    
    Ok("Auditor added successfully".to_string())
}

#[update]
fn update_audit_settings(new_settings: AuditSettings) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        return Err("Unauthorized access".to_string());
    }
    
    AUDIT_SETTINGS.with(|settings| {
        *settings.borrow_mut() = new_settings;
    });
    
    // Log settings update
    let _audit_entry = log_audit_event(
        EventType::SystemConfiguration,
        ResourceType::System,
        "audit_settings".to_string(),
        "update_settings".to_string(),
        "Updated audit trail settings".to_string(),
        None,
        true,
    )?;
    
    Ok("Audit settings updated successfully".to_string())
}

#[query]
fn get_audit_settings() -> AuditSettings {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        ic_cdk::println!("Unauthorized audit settings access attempt from: {}", caller);
        return AuditSettings {
            retention_days: 0,
            auto_archive_enabled: false,
            compliance_reporting_enabled: false,
            real_time_alerts_enabled: false,
            hash_verification_enabled: false,
            digital_signatures_enabled: false,
            audit_access_logging: false,
        };
    }
    
    AUDIT_SETTINGS.with(|settings| {
        settings.borrow().clone()
    })
}

#[query]
fn get_audit_statistics() -> BTreeMap<String, u64> {
    let caller = ic_cdk::caller();
    
    // Check if caller is authorized auditor
    if !is_authorized_auditor(&caller) {
        ic_cdk::println!("Unauthorized audit statistics access attempt from: {}", caller);
        return BTreeMap::new();
    }
    
    // Log audit access
    log_audit_access(caller, "get_audit_statistics", "statistics".to_string());
    
    let mut stats = BTreeMap::new();
    
    AUDIT_ENTRIES.with(|entries| {
        let entries_map = entries.borrow();
        stats.insert("total_entries".to_string(), entries_map.len() as u64);
        
        let compliance_entries = entries_map.values()
            .filter(|e| e.compliance_relevant)
            .count();
        stats.insert("compliance_entries".to_string(), compliance_entries as u64);
        
        // Count by event type
        let mut event_type_counts = BTreeMap::new();
        for entry in entries_map.values() {
            let event_type_str = format!("{:?}", entry.event_type);
            *event_type_counts.entry(event_type_str).or_insert(0) += 1;
        }
        
        for (event_type, count) in event_type_counts {
            stats.insert(format!("event_type_{}", event_type), count);
        }
    });
    
    COMPLIANCE_REPORTS.with(|reports| {
        stats.insert("compliance_reports".to_string(), reports.borrow().len() as u64);
    });
    
    stats
}

// === Helper Functions ===

fn is_authorized_auditor(principal: &Principal) -> bool {
    AUDITORS.with(|auditors| {
        auditors.borrow().contains_key(principal)
    })
}

fn log_audit_access(actor: Principal, method: &str, resource_id: String) {
    let access_entry = create_audit_entry(
        EventType::AuditAccess,
        actor,
        ResourceType::AuditLog,
        resource_id,
        method.to_string(),
        format!("Audit access via method: {}", method),
        AuditMetadata::default(),
        true,
    );
    
    AUDIT_ENTRIES.with(|entries| {
        entries.borrow_mut().insert(access_entry.id.clone(), access_entry);
    });
}

#[query]
fn health_check() -> String {
    "Audit Trail canister is healthy".to_string()
}

// Export Candid interface
ic_cdk::export_candid!();
