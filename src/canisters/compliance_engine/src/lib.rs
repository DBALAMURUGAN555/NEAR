use candid::{CandidType, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::cell::RefCell;
use uuid::Uuid;

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct KycProfile {
    pub id: String,
    pub principal: Principal,
    pub entity_type: EntityType,
    pub legal_name: String,
    pub jurisdiction: String,
    pub registration_number: Option<String>,
    pub verification_level: VerificationLevel,
    pub risk_level: RiskLevel,
    pub kyc_status: KycStatus,
    pub aml_status: AmlStatus,
    pub created_at: u64,
    pub last_updated: u64,
    pub documents: Vec<Document>,
    pub sanctions_check: Option<SanctionsCheck>,
    pub pep_check: Option<PepCheck>,
    pub adverse_media_check: Option<AdverseMediaCheck>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum EntityType {
    Individual,
    Corporation,
    Government,
    FinancialInstitution,
    CustodyProvider,
    TrustCompany,
    NonProfit,
    Partnership,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum VerificationLevel {
    Basic,
    Enhanced,
    Institutional,
    Government,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
    Prohibited,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum KycStatus {
    NotStarted,
    Pending,
    UnderReview,
    Approved,
    Rejected,
    Suspended,
    Expired,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum AmlStatus {
    NotChecked,
    Cleared,
    Review,
    Hit,
    Blocked,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub document_type: DocumentType,
    pub name: String,
    pub hash: String,
    pub uploaded_at: u64,
    pub verified_at: Option<u64>,
    pub verification_status: DocumentStatus,
    pub metadata: String,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum DocumentType {
    IdentityDocument,
    ProofOfAddress,
    ArticlesOfIncorporation,
    CertificateOfIncorporation,
    TaxDocument,
    BankStatement,
    ComplianceCertificate,
    LicenseDocument,
    PowerOfAttorney,
    BoardResolution,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq)]
pub enum DocumentStatus {
    Pending,
    Verified,
    Rejected,
    Expired,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SanctionsCheck {
    pub checked_at: u64,
    pub result: SanctionsResult,
    pub lists_checked: Vec<String>,
    pub matches: Vec<SanctionsMatch>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum SanctionsResult {
    Clear,
    PotentialMatch,
    DirectMatch,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SanctionsMatch {
    pub list_name: String,
    pub match_score: f64,
    pub matched_text: String,
    pub reference: String,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct PepCheck {
    pub checked_at: u64,
    pub result: PepResult,
    pub matches: Vec<PepMatch>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum PepResult {
    Clear,
    PotentialMatch,
    DirectMatch,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct PepMatch {
    pub name: String,
    pub position: String,
    pub country: String,
    pub match_score: f64,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct AdverseMediaCheck {
    pub checked_at: u64,
    pub result: AdverseMediaResult,
    pub articles: Vec<MediaArticle>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum AdverseMediaResult {
    Clear,
    MinorConcerns,
    MajorConcerns,
    Prohibited,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MediaArticle {
    pub title: String,
    pub source: String,
    pub date: u64,
    pub relevance_score: f64,
    pub sentiment: String,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct TransactionMonitoring {
    pub id: String,
    pub account_id: String,
    pub transaction_id: String,
    pub amount: u64,
    pub transaction_type: String,
    pub timestamp: u64,
    pub risk_score: u8,
    pub flags: Vec<ComplianceFlag>,
    pub status: MonitoringStatus,
    pub reviewed_by: Option<Principal>,
    pub reviewed_at: Option<u64>,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq)]
pub enum ComplianceFlag {
    LargeAmount,
    HighFrequency,
    UnusualPattern,
    SanctionedEntity,
    HighRiskJurisdiction,
    StructuredTransaction,
    RapidMovement,
    CrossBorderTransfer,
    CashIntensive,
    PoliticallyExposed,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum MonitoringStatus {
    Clear,
    Review,
    Escalated,
    SarFiled,
    Blocked,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SuspiciousActivityReport {
    pub id: String,
    pub account_id: String,
    pub reporting_entity: String,
    pub suspicious_activity: String,
    pub amount_involved: u64,
    pub time_period: String,
    pub narrative: String,
    pub filed_at: u64,
    pub filed_by: Principal,
    pub reference_number: String,
    pub status: SarStatus,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum SarStatus {
    Draft,
    Filed,
    Acknowledged,
    UnderInvestigation,
    Closed,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct ComplianceSettings {
    pub auto_kyc_enabled: bool,
    pub sanctions_screening_enabled: bool,
    pub pep_screening_enabled: bool,
    pub adverse_media_screening_enabled: bool,
    pub transaction_monitoring_enabled: bool,
    pub high_risk_threshold: u64,
    pub sar_threshold: u64,
    pub kyc_renewal_days: u32,
    pub document_retention_days: u32,
}

thread_local! {
    static KYC_PROFILES: RefCell<BTreeMap<String, KycProfile>> = RefCell::new(BTreeMap::new());
    static PRINCIPAL_TO_KYC: RefCell<BTreeMap<Principal, String>> = RefCell::new(BTreeMap::new());
    static TRANSACTION_MONITORING: RefCell<BTreeMap<String, TransactionMonitoring>> = RefCell::new(BTreeMap::new());
    static SAR_REPORTS: RefCell<BTreeMap<String, SuspiciousActivityReport>> = RefCell::new(BTreeMap::new());
    static COMPLIANCE_OFFICERS: RefCell<BTreeSet<Principal>> = RefCell::new(BTreeSet::new());
    static COMPLIANCE_SETTINGS: RefCell<ComplianceSettings> = RefCell::new(ComplianceSettings {
        auto_kyc_enabled: false,
        sanctions_screening_enabled: true,
        pep_screening_enabled: true,
        adverse_media_screening_enabled: true,
        transaction_monitoring_enabled: true,
        high_risk_threshold: 1_000_000_000, // 10 BTC
        sar_threshold: 10_000_000_000, // 100 BTC
        kyc_renewal_days: 365,
        document_retention_days: 2555, // 7 years
    });
    static SANCTIONED_ENTITIES: RefCell<BTreeSet<String>> = RefCell::new(BTreeSet::new());
    static HIGH_RISK_JURISDICTIONS: RefCell<BTreeSet<String>> = RefCell::new(BTreeSet::new());
}

#[init]
fn init() {
    ic_cdk::println!("Compliance Engine canister initialized");
    
    // Initialize with deployer as compliance officer
    COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow_mut().insert(ic_cdk::caller());
    });
    
    // Initialize high-risk jurisdictions (simplified list)
    HIGH_RISK_JURISDICTIONS.with(|jurisdictions| {
        let mut j = jurisdictions.borrow_mut();
        j.insert("North Korea".to_string());
        j.insert("Iran".to_string());
        j.insert("Syria".to_string());
        j.insert("Cuba".to_string());
        j.insert("Sudan".to_string());
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

// === KYC Management Functions ===

#[update]
fn create_kyc_profile(
    principal: Principal,
    entity_type: EntityType,
    legal_name: String,
    jurisdiction: String,
    registration_number: Option<String>,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is compliance officer
    let is_compliance_officer = COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow().contains(&caller)
    });
    
    if !is_compliance_officer {
        return Err("Only compliance officers can create KYC profiles".to_string());
    }
    
    // Check if KYC profile already exists
    let existing_kyc = PRINCIPAL_TO_KYC.with(|map| {
        map.borrow().get(&principal).cloned()
    });
    
    if existing_kyc.is_some() {
        return Err("KYC profile already exists for this principal".to_string());
    }
    
    // Validate inputs
    if legal_name.is_empty() || jurisdiction.is_empty() {
        return Err("Legal name and jurisdiction are required".to_string());
    }
    
    let kyc_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    
    // Determine initial risk level based on jurisdiction and entity type
    let risk_level = calculate_initial_risk(&jurisdiction, &entity_type);
    
    let kyc_profile = KycProfile {
        id: kyc_id.clone(),
        principal,
        entity_type,
        legal_name: legal_name.clone(),
        jurisdiction: jurisdiction.clone(),
        registration_number,
        verification_level: VerificationLevel::Basic,
        risk_level,
        kyc_status: KycStatus::Pending,
        aml_status: AmlStatus::NotChecked,
        created_at: current_time,
        last_updated: current_time,
        documents: Vec::new(),
        sanctions_check: None,
        pep_check: None,
        adverse_media_check: None,
    };
    
    KYC_PROFILES.with(|profiles| {
        profiles.borrow_mut().insert(kyc_id.clone(), kyc_profile);
    });
    
    PRINCIPAL_TO_KYC.with(|map| {
        map.borrow_mut().insert(principal, kyc_id.clone());
    });
    
    // Automatically start AML screening if enabled
    let settings = COMPLIANCE_SETTINGS.with(|s| s.borrow().clone());
    if settings.sanctions_screening_enabled {
        ic_cdk::spawn(perform_sanctions_screening_async(kyc_id.clone(), legal_name));
    }
    
    ic_cdk::println!("Created KYC profile: {}", kyc_id);
    Ok(kyc_id)
}

#[update]
fn add_kyc_document(
    kyc_id: String,
    document_type: DocumentType,
    name: String,
    hash: String,
    metadata: String,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is compliance officer
    let is_compliance_officer = COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow().contains(&caller)
    });
    
    if !is_compliance_officer {
        return Err("Only compliance officers can add documents".to_string());
    }
    
    let document_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    
    let document = Document {
        id: document_id.clone(),
        document_type,
        name,
        hash,
        uploaded_at: current_time,
        verified_at: None,
        verification_status: DocumentStatus::Pending,
        metadata,
    };
    
    KYC_PROFILES.with(|profiles| {
        let mut profiles_map = profiles.borrow_mut();
        match profiles_map.get_mut(&kyc_id) {
            Some(profile) => {
                profile.documents.push(document);
                profile.last_updated = current_time;
                Ok("Document added successfully".to_string())
            },
            None => Err("KYC profile not found".to_string()),
        }
    })
}

#[update]
fn verify_kyc_document(kyc_id: String, document_id: String, approved: bool) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is compliance officer
    let is_compliance_officer = COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow().contains(&caller)
    });
    
    if !is_compliance_officer {
        return Err("Only compliance officers can verify documents".to_string());
    }
    
    let current_time = ic_cdk::api::time();
    
    KYC_PROFILES.with(|profiles| {
        let mut profiles_map = profiles.borrow_mut();
        match profiles_map.get_mut(&kyc_id) {
            Some(profile) => {
                if let Some(document) = profile.documents.iter_mut().find(|d| d.id == document_id) {
                    document.verified_at = Some(current_time);
                    document.verification_status = if approved {
                        DocumentStatus::Verified
                    } else {
                        DocumentStatus::Rejected
                    };
                    profile.last_updated = current_time;
                    Ok("Document verification updated".to_string())
                } else {
                    Err("Document not found".to_string())
                }
            },
            None => Err("KYC profile not found".to_string()),
        }
    })
}

#[update]
fn approve_kyc_profile(kyc_id: String, verification_level: VerificationLevel) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is compliance officer
    let is_compliance_officer = COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow().contains(&caller)
    });
    
    if !is_compliance_officer {
        return Err("Only compliance officers can approve KYC profiles".to_string());
    }
    
    let current_time = ic_cdk::api::time();
    
    KYC_PROFILES.with(|profiles| {
        let mut profiles_map = profiles.borrow_mut();
        match profiles_map.get_mut(&kyc_id) {
            Some(profile) => {
                // Check if all required documents are verified
                let verified_docs = profile.documents.iter()
                    .filter(|d| d.verification_status == DocumentStatus::Verified)
                    .count();
                
                if verified_docs == 0 {
                    return Err("No verified documents found".to_string());
                }
                
                profile.kyc_status = KycStatus::Approved;
                profile.verification_level = verification_level;
                profile.last_updated = current_time;
                
                Ok("KYC profile approved successfully".to_string())
            },
            None => Err("KYC profile not found".to_string()),
        }
    })
}

// === AML Screening Functions ===

async fn perform_sanctions_screening_async(kyc_id: String, legal_name: String) {
    let result = perform_sanctions_screening(kyc_id.clone(), legal_name).await;
    match result {
        Ok(_) => ic_cdk::println!("Sanctions screening completed for KYC: {}", kyc_id),
        Err(e) => ic_cdk::println!("Sanctions screening failed for KYC {}: {}", kyc_id, e),
    }
}

async fn perform_sanctions_screening(kyc_id: String, legal_name: String) -> Result<String, String> {
    // Simplified sanctions screening (in production, integrate with external API)
    let current_time = ic_cdk::api::time();
    
    // Check against internal sanctioned entities list
    let is_sanctioned = SANCTIONED_ENTITIES.with(|entities| {
        entities.borrow().iter().any(|entity| {
            legal_name.to_lowercase().contains(&entity.to_lowercase())
        })
    });
    
    let sanctions_check = SanctionsCheck {
        checked_at: current_time,
        result: if is_sanctioned {
            SanctionsResult::DirectMatch
        } else {
            SanctionsResult::Clear
        },
        lists_checked: vec!["OFAC SDN".to_string(), "EU Sanctions".to_string()],
        matches: if is_sanctioned {
            vec![SanctionsMatch {
                list_name: "Internal Sanctions List".to_string(),
                match_score: 1.0,
                matched_text: legal_name.clone(),
                reference: "INTERNAL_001".to_string(),
            }]
        } else {
            Vec::new()
        },
    };
    
    // Update KYC profile with screening results
    KYC_PROFILES.with(|profiles| {
        let mut profiles_map = profiles.borrow_mut();
        if let Some(profile) = profiles_map.get_mut(&kyc_id) {
            profile.sanctions_check = Some(sanctions_check);
            profile.aml_status = if is_sanctioned {
                AmlStatus::Hit
            } else {
                AmlStatus::Cleared
            };
            profile.last_updated = current_time;
            
            // Update risk level if sanctions hit
            if is_sanctioned {
                profile.risk_level = RiskLevel::Prohibited;
            }
        }
    });
    
    Ok("Sanctions screening completed".to_string())
}

// === Transaction Monitoring Functions ===

#[update]
fn monitor_transaction(
    account_id: String,
    transaction_id: String,
    amount: u64,
    transaction_type: String,
) -> Result<String, String> {
    let current_time = ic_cdk::api::time();
    
    // Calculate risk score
    let risk_score = calculate_transaction_risk(&account_id, amount, &transaction_type);
    
    // Determine compliance flags
    let flags = determine_compliance_flags(&account_id, amount, &transaction_type);
    
    let monitoring_id = Uuid::new_v4().to_string();
    
    let monitoring = TransactionMonitoring {
        id: monitoring_id.clone(),
        account_id: account_id.clone(),
        transaction_id: transaction_id.clone(),
        amount,
        transaction_type,
        timestamp: current_time,
        risk_score,
        flags: flags.clone(),
        status: if risk_score >= 8 || flags.contains(&ComplianceFlag::SanctionedEntity) {
            MonitoringStatus::Escalated
        } else if risk_score >= 6 {
            MonitoringStatus::Review
        } else {
            MonitoringStatus::Clear
        },
        reviewed_by: None,
        reviewed_at: None,
        notes: None,
    };
    
    TRANSACTION_MONITORING.with(|tm| {
        tm.borrow_mut().insert(monitoring_id.clone(), monitoring);
    });
    
    // Check if SAR threshold is met
    let settings = COMPLIANCE_SETTINGS.with(|s| s.borrow().clone());
    if amount >= settings.sar_threshold || flags.contains(&ComplianceFlag::SanctionedEntity) {
        // Create draft SAR
        create_sar_draft(&account_id, &transaction_id, amount)?;
    }
    
    Ok(monitoring_id)
}

fn create_sar_draft(account_id: &str, transaction_id: &str, amount: u64) -> Result<String, String> {
    let sar_id = Uuid::new_v4().to_string();
    let current_time = ic_cdk::api::time();
    
    let sar = SuspiciousActivityReport {
        id: sar_id.clone(),
        account_id: account_id.to_string(),
        reporting_entity: "Custody Platform".to_string(),
        suspicious_activity: "Large transaction requiring review".to_string(),
        amount_involved: amount,
        time_period: "Single transaction".to_string(),
        narrative: format!("Transaction {} for account {} involves amount {} which exceeds SAR threshold", 
            transaction_id, account_id, amount),
        filed_at: current_time,
        filed_by: ic_cdk::caller(),
        reference_number: format!("SAR-{}-{}", current_time, &sar_id[..8]),
        status: SarStatus::Draft,
    };
    
    SAR_REPORTS.with(|sars| {
        sars.borrow_mut().insert(sar_id.clone(), sar);
    });
    
    Ok(sar_id)
}

#[update]
fn file_sar_report(sar_id: String, narrative: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is compliance officer
    let is_compliance_officer = COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow().contains(&caller)
    });
    
    if !is_compliance_officer {
        return Err("Only compliance officers can file SAR reports".to_string());
    }
    
    let current_time = ic_cdk::api::time();
    
    SAR_REPORTS.with(|sars| {
        let mut sars_map = sars.borrow_mut();
        match sars_map.get_mut(&sar_id) {
            Some(sar) => {
                sar.status = SarStatus::Filed;
                sar.narrative = narrative;
                sar.filed_at = current_time;
                sar.filed_by = caller;
                Ok("SAR report filed successfully".to_string())
            },
            None => Err("SAR report not found".to_string()),
        }
    })
}

// === Query Functions ===

#[query]
fn get_kyc_profile(kyc_id: String) -> Option<KycProfile> {
    KYC_PROFILES.with(|profiles| {
        profiles.borrow().get(&kyc_id).cloned()
    })
}

#[query]
fn get_kyc_by_principal(principal: Principal) -> Option<KycProfile> {
    let kyc_id = PRINCIPAL_TO_KYC.with(|map| {
        map.borrow().get(&principal).cloned()
    })?;
    
    KYC_PROFILES.with(|profiles| {
        profiles.borrow().get(&kyc_id).cloned()
    })
}

#[query]
fn check_compliance_status(principal: Principal) -> Result<String, String> {
    let kyc_id = PRINCIPAL_TO_KYC.with(|map| {
        map.borrow().get(&principal).cloned()
    });
    
    match kyc_id {
        Some(id) => {
            let profile = KYC_PROFILES.with(|profiles| {
                profiles.borrow().get(&id).cloned()
            });
            
            match profile {
                Some(p) => match p.kyc_status {
                    KycStatus::Approved => Ok("Compliant".to_string()),
                    KycStatus::Pending => Ok("Pending KYC".to_string()),
                    KycStatus::Rejected => Err("KYC Rejected".to_string()),
                    KycStatus::Suspended => Err("Account Suspended".to_string()),
                    _ => Ok("Under Review".to_string()),
                },
                None => Err("KYC profile not found".to_string()),
            }
        },
        None => Err("No KYC profile exists".to_string()),
    }
}

#[query]
fn get_transaction_monitoring(monitoring_id: String) -> Option<TransactionMonitoring> {
    TRANSACTION_MONITORING.with(|tm| {
        tm.borrow().get(&monitoring_id).cloned()
    })
}

#[query]
fn get_pending_reviews() -> Vec<TransactionMonitoring> {
    TRANSACTION_MONITORING.with(|tm| {
        tm.borrow()
            .values()
            .filter(|m| matches!(m.status, MonitoringStatus::Review | MonitoringStatus::Escalated))
            .cloned()
            .collect()
    })
}

#[query]
fn get_sar_reports() -> Vec<SuspiciousActivityReport> {
    SAR_REPORTS.with(|sars| {
        sars.borrow().values().cloned().collect()
    })
}

#[query]
fn get_compliance_settings() -> ComplianceSettings {
    COMPLIANCE_SETTINGS.with(|settings| {
        settings.borrow().clone()
    })
}

// === Admin Functions ===

#[update]
fn add_compliance_officer(officer: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is already a compliance officer
    let is_compliance_officer = COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow().contains(&caller)
    });
    
    if !is_compliance_officer {
        return Err("Only compliance officers can add new officers".to_string());
    }
    
    COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow_mut().insert(officer);
    });
    
    Ok("Compliance officer added successfully".to_string())
}

#[update]
fn update_compliance_settings(new_settings: ComplianceSettings) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is compliance officer
    let is_compliance_officer = COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow().contains(&caller)
    });
    
    if !is_compliance_officer {
        return Err("Only compliance officers can update settings".to_string());
    }
    
    COMPLIANCE_SETTINGS.with(|settings| {
        *settings.borrow_mut() = new_settings;
    });
    
    Ok("Compliance settings updated successfully".to_string())
}

#[update]
fn add_sanctioned_entity(entity: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    // Check if caller is compliance officer
    let is_compliance_officer = COMPLIANCE_OFFICERS.with(|officers| {
        officers.borrow().contains(&caller)
    });
    
    if !is_compliance_officer {
        return Err("Only compliance officers can add sanctioned entities".to_string());
    }
    
    SANCTIONED_ENTITIES.with(|entities| {
        entities.borrow_mut().insert(entity);
    });
    
    Ok("Sanctioned entity added successfully".to_string())
}

// === Helper Functions ===

fn calculate_initial_risk(jurisdiction: &str, entity_type: &EntityType) -> RiskLevel {
    // Check high-risk jurisdictions
    let is_high_risk_jurisdiction = HIGH_RISK_JURISDICTIONS.with(|jurisdictions| {
        jurisdictions.borrow().contains(jurisdiction)
    });
    
    if is_high_risk_jurisdiction {
        return RiskLevel::High;
    }
    
    // Risk based on entity type
    match entity_type {
        EntityType::Individual => RiskLevel::Low,
        EntityType::Corporation => RiskLevel::Medium,
        EntityType::Government => RiskLevel::Low,
        EntityType::FinancialInstitution => RiskLevel::Medium,
        EntityType::CustodyProvider => RiskLevel::Medium,
        EntityType::TrustCompany => RiskLevel::Medium,
        EntityType::NonProfit => RiskLevel::Low,
        EntityType::Partnership => RiskLevel::Medium,
    }
}

fn calculate_transaction_risk(account_id: &str, amount: u64, transaction_type: &str) -> u8 {
    let mut risk_score = 0u8;
    
    // Risk based on amount
    if amount > 10_000_000_000 { // > 100 BTC
        risk_score += 5;
    } else if amount > 1_000_000_000 { // > 10 BTC
        risk_score += 3;
    } else if amount > 100_000_000 { // > 1 BTC
        risk_score += 1;
    }
    
    // Risk based on transaction type
    match transaction_type {
        "withdrawal" => risk_score += 2,
        "transfer" => risk_score += 1,
        _ => {}
    }
    
    // Check account KYC status (simplified)
    // In practice, you'd look up the account's KYC profile
    
    std::cmp::min(risk_score, 10)
}

fn determine_compliance_flags(account_id: &str, amount: u64, transaction_type: &str) -> Vec<ComplianceFlag> {
    let mut flags = Vec::new();
    
    if amount > 10_000_000_000 { // 100 BTC
        flags.push(ComplianceFlag::LargeAmount);
    }
    
    if transaction_type == "withdrawal" && amount > 1_000_000_000 {
        flags.push(ComplianceFlag::UnusualPattern);
    }
    
    // Add more sophisticated pattern detection here
    
    flags
}

#[query]
fn health_check() -> String {
    "Compliance Engine canister is healthy".to_string()
}

// Export Candid interface
ic_cdk::export_candid!();
