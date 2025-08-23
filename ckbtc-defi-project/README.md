# ckBTC DeFi Platform - ICP Demo Project

A comprehensive Internet Computer Platform (ICP) project demonstrating ckBTC ⇄ DeFi integration with proof-of-reserves functionality.

## 🚀 Project Overview

This project scaffolds a small but complete ckBTC DeFi platform with the following components:

- **DeFi Canister** (Motoko): Handles deposit notifications and withdrawals using ICRC-1 standard
- **Proof-of-Reserves Canister** (Motoko): Stores Merkle roots and auditor signatures for transparency
- **Minter Canister** (Rust): Skeleton implementation with references to official ckBTC minter code
- **ICRC-1 Ledger Stub**: Local testing interface for token operations

## 📁 Project Structure

```
ckbtc-defi-project/
├── src/
│   ├── DeFi.mo                    # Main DeFi canister with deposit/withdraw logic
│   └── ProofOfReserves.mo         # Proof-of-reserves transparency canister
├── rs/
│   └── minter/
│       ├── src/lib.rs             # Rust minter skeleton with official references
│       ├── Cargo.toml             # Rust dependencies
│       └── minter.did             # Minter canister interface
├── scripts/
│   ├── quick_deploy.sh            # One-command local deployment
│   └── test_deposit_withdraw.sh   # End-to-end testing script
├── dfx.json                       # DFX project configuration
├── canister_ids.json              # Local canister ID mappings
├── icrc_ledger.did                # ICRC-1 ledger interface for testing
└── README.md                      # This file
```

## 🏗️ Architecture

### DeFi Canister (`src/DeFi.mo`)
- **`notify_deposit()`**: Processes user deposit notifications with memo verification
- **`withdraw()`**: Handles ckBTC withdrawals to user-specified accounts  
- **`my_internal_balance()`**: Returns user's current DeFi platform balance
- Uses ICRC-1 standard for all token operations
- Includes comprehensive TODO comments for production implementation

### Proof-of-Reserves Canister (`src/ProofOfReserves.mo`)
- Stores published Merkle roots representing user balance snapshots
- Manages authorized auditor signatures
- Provides solvency checking and reserve ratio calculations
- Transparent audit trail for platform reserves

### Minter Canister (`rs/minter/src/lib.rs`)
- **Skeleton implementation only** - references official ckBTC minter
- Placeholder functions for `request_mint()` and `request_burn()`
- Includes detailed TODOs pointing to official DFINITY implementation
- **DO NOT USE IN PRODUCTION** without proper implementation

## 🛠️ Prerequisites

- [DFX](https://internetcomputer.org/docs/current/developer-docs/setup/install/) 0.18.0+
- [Rust](https://rustup.rs/) toolchain
- [Node.js](https://nodejs.org/) (optional, for frontend development)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
cd ckbtc-defi-project
```

### 2. Start Local IC Network
```bash
dfx start --background
```

### 3. Deploy All Canisters
```bash
./scripts/quick_deploy.sh
```

### 4. Run End-to-End Tests
```bash
./scripts/test_deposit_withdraw.sh
```

## 🔧 Manual Deployment

If you prefer step-by-step deployment:

```bash
# Deploy ICRC ledger stub
dfx deploy icrc_ledger --network local

# Deploy DeFi canister
dfx deploy defi --network local

# Deploy Proof-of-Reserves
dfx deploy proof_of_reserves --network local

# Deploy Minter skeleton  
dfx deploy minter --network local
```

## 🧪 Testing & Development

### Using Candid UI
After deployment, access the Candid interfaces at:
- DeFi: `http://localhost:4943/?canisterId=<candid_ui_id>&id=<defi_canister_id>`
- Proof-of-Reserves: `http://localhost:4943/?canisterId=<candid_ui_id>&id=<por_canister_id>`

### Example DeFi Operations

1. **Set Test Balance** (development only):
```bash
dfx canister call defi debug_set_balance '(principal "your-principal-id", 100000000 : nat)' --network local
```

2. **Notify Deposit**:
```bash
dfx canister call defi notify_deposit '(blob "memo123", principal "your-principal-id", 50000000 : nat)' --network local
```

3. **Withdraw**:
```bash
dfx canister call defi withdraw '(25000000 : nat, null)' --network local
```

4. **Check Balance**:
```bash
dfx canister call defi my_internal_balance --network local
```

## 📊 Frontend Integration Guide

### Deposit Flow
1. User calls `icrc1_transfer` to send ckBTC to DeFi canister
2. Frontend captures transaction memo/ID
3. Frontend calls `notify_deposit` with memo and amount
4. DeFi canister verifies and credits balance

### Withdraw Flow  
1. User specifies amount and destination subaccount
2. Frontend calls `withdraw` method
3. DeFi canister transfers via ICRC-1 and updates balance

### Subaccount Usage
- Each user gets a unique subaccount derived from their principal
- Frontend must include transaction memo for proper deposit tracking
- Withdrawals can specify custom destination subaccounts

## 🔒 Security Considerations

### Current Implementation (Development Only)
- Uses `debug_set_balance()` for testing - **REMOVE IN PRODUCTION**
- Simplified transaction verification - needs indexer integration
- Mock auditor signatures - requires proper cryptographic verification
- Basic access controls - implement proper role-based security

### Production Checklist
- [ ] Replace HashMap with StableHashMap for upgrade persistence  
- [ ] Implement proper indexer integration for transaction verification
- [ ] Add comprehensive authentication and authorization
- [ ] Implement proper error handling and logging
- [ ] Add rate limiting and spam protection
- [ ] Integrate real Bitcoin network monitoring (minter)
- [ ] Add proper cryptographic signature verification (PoR)

## 📚 References & Citations

### ICRC-1 Standard
- **Specification**: https://internetcomputer.org/docs/references/icrc1-standard
- Used for all token operations and account management

### ckBTC Documentation  
- **Overview**: https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview
- **Using ckBTC in dapps**: https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/using-ckbtc-in-dapps

### Official ckBTC Minter Implementation
- **Repository**: https://github.com/dfinity/ic
- **Minter Code**: https://github.com/dfinity/ic/tree/master/rs/bitcoin/ckbtc/minter  
- **Candid Interface**: https://github.com/dfinity/ic/blob/master/rs/bitcoin/ckbtc/minter/ckbtc_minter.did

## 🔗 Key Files Explanation

| File | Description |
|------|-------------|
| `src/DeFi.mo` | Main DeFi canister implementing ICRC-1 deposit/withdraw with comprehensive comments |
| `src/ProofOfReserves.mo` | Transparency canister for storing audit proofs and Merkle roots |
| `rs/minter/src/lib.rs` | Rust minter skeleton with TODOs pointing to official implementation |
| `icrc_ledger.did` | ICRC-1 candid interface for local ledger testing |
| `scripts/quick_deploy.sh` | One-command deployment with status reporting |
| `scripts/test_deposit_withdraw.sh` | Complete end-to-end test suite |

## 🤝 Contributing

This is a demonstration project. For production use:

1. Implement all TODO items marked in the code
2. Replace skeleton implementations with proper functionality  
3. Add comprehensive testing beyond the included demos
4. Implement proper security measures and access controls
5. Add frontend components for user interaction

## ⚠️ Disclaimers

- **This is a development scaffold only** - not suitable for production use
- The minter is a skeleton pointing to official implementation references
- Debug functions are included for testing - remove before production
- Simplified security model - implement proper authentication for production

## 📄 License

This project is provided as-is for educational and development purposes.

---

**🎉 Ready to build the future of Bitcoin DeFi on ICP!**

For questions or issues, refer to the [Internet Computer Forum](https://forum.dfinity.org/) or [ICP Developer Discord](https://discord.gg/cA7y6ezyE2).
