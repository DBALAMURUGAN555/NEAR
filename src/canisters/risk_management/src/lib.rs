use candid::CandidType;
use ic_cdk_macros::{init, query, update};
use serde::{Deserialize, Serialize};

#[derive(CandidType, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub score: u8,
    pub factors: Vec<String>,
}

#[init]
fn init() {
    ic_cdk::println!("Risk Management canister initialized");
}

#[update]
fn assess_risk(account_id: String, amount: u64) -> RiskAssessment {
    let mut score = 0u8;
    let mut factors = Vec::new();
    
    if amount > 10_000_000_000 {
        score += 5;
        factors.push("Large amount".to_string());
    }
    
    RiskAssessment { score, factors }
}

#[query]
fn health_check() -> String {
    "Risk Management canister is healthy".to_string()
}

ic_cdk::export_candid!();
