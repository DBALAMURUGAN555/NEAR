use candid::{CandidType, Deserialize};
use ic_cdk_macros::*;
use std::collections::HashMap;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct YieldStrategy {
    pub name: String,
    pub apy: f64,
    pub risk_level: u8,
    pub is_active: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct YieldPosition {
    pub strategy: String,
    pub amount: u64,
    pub start_time: u64,
    pub accumulated_yield: u64,
}

thread_local! {
    static YIELD_STRATEGIES: std::cell::RefCell<HashMap<String, YieldStrategy>> = std::cell::RefCell::new(HashMap::new());
    static USER_POSITIONS: std::cell::RefCell<HashMap<String, Vec<YieldPosition>>> = std::cell::RefCell::new(HashMap::new());
}

#[init]
fn init() {
    // Initialize default yield strategies
    let strategies = vec![
        YieldStrategy {
            name: "BTC Staking".to_string(),
            apy: 5.2,
            risk_level: 2,
            is_active: true,
        },
        YieldStrategy {
            name: "ICP Staking".to_string(),
            apy: 8.5,
            risk_level: 3,
            is_active: true,
        },
        YieldStrategy {
            name: "Stable Yield".to_string(),
            apy: 3.8,
            risk_level: 1,
            is_active: true,
        },
    ];

    YIELD_STRATEGIES.with(|s| {
        let mut strategies_map = s.borrow_mut();
        for strategy in strategies {
            strategies_map.insert(strategy.name.clone(), strategy);
        }
    });
}

#[query]
fn get_yield_strategies() -> Vec<YieldStrategy> {
    YIELD_STRATEGIES.with(|s| {
        s.borrow().values().cloned().collect()
    })
}

#[update]
fn deposit_for_yield(strategy_name: String, amount: u64) -> Result<String, String> {
    let caller = ic_cdk::caller().to_string();
    
    // Check if strategy exists
    let strategy_exists = YIELD_STRATEGIES.with(|s| {
        s.borrow().contains_key(&strategy_name)
    });

    if !strategy_exists {
        return Err("Strategy not found".to_string());
    }

    let position = YieldPosition {
        strategy: strategy_name.clone(),
        amount,
        start_time: ic_cdk::api::time(),
        accumulated_yield: 0,
    };

    USER_POSITIONS.with(|p| {
        let mut positions = p.borrow_mut();
        positions.entry(caller).or_insert(Vec::new()).push(position);
    });

    Ok(format!("Deposited {} to {}", amount, strategy_name))
}

#[query]
fn get_user_positions(user: String) -> Vec<YieldPosition> {
    USER_POSITIONS.with(|p| {
        p.borrow().get(&user).cloned().unwrap_or_default()
    })
}

#[query]
fn greet(name: String) -> String {
    format!("Hello, {}! This is the Yield Engine canister.", name)
}
