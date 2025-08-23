#!/bin/bash

# =============================================================================
# ckBTC DeFi Project - Quick Deployment Script
# =============================================================================
# 
# This script deploys all canisters locally for development and testing.
# 
# Prerequisites:
# - dfx must be installed and running locally
# - Rust toolchain must be installed for the minter canister
# 
# Usage: ./scripts/quick_deploy.sh
# =============================================================================

set -e

echo "🚀 Starting ckBTC DeFi Project deployment..."

# Check if dfx is running
if ! dfx ping > /dev/null 2>&1; then
    echo "❌ Error: dfx is not running. Please start it with 'dfx start --background'"
    exit 1
fi

echo "✅ dfx is running"

# Check if we're in the project root
if [ ! -f "dfx.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

echo "📦 Installing Rust dependencies for minter canister..."
cd rs/minter
if command -v cargo &> /dev/null; then
    cargo check
    echo "✅ Rust dependencies checked"
else
    echo "⚠️  Warning: cargo not found, skipping Rust dependency check"
fi
cd ../..

echo "🔧 Building and deploying all canisters..."

# Deploy in specific order to handle dependencies
echo "📋 Deploying ICRC ledger (stub)..."
dfx deploy icrc_ledger --network local

echo "🏦 Deploying DeFi canister..."
dfx deploy defi --network local

echo "🔒 Deploying Proof-of-Reserves canister..."
dfx deploy proof_of_reserves --network local

echo "⛏️  Deploying Minter canister..."
dfx deploy minter --network local

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Canister Information:"
echo "========================"

# Display canister IDs
echo "📋 ICRC Ledger:        $(dfx canister id icrc_ledger --network local)"
echo "🏦 DeFi Canister:       $(dfx canister id defi --network local)"
echo "🔒 Proof-of-Reserves:   $(dfx canister id proof_of_reserves --network local)"
echo "⛏️  Minter:              $(dfx canister id minter --network local)"

echo ""
echo "🔗 Candid Interface URLs (for testing):"
echo "======================================="
echo "🏦 DeFi:                http://localhost:4943/?canisterId=$(dfx canister id __Candid_UI --network local)&id=$(dfx canister id defi --network local)"
echo "🔒 Proof-of-Reserves:   http://localhost:4943/?canisterId=$(dfx canister id __Candid_UI --network local)&id=$(dfx canister id proof_of_reserves --network local)"
echo "⛏️  Minter:              http://localhost:4943/?canisterId=$(dfx canister id __Candid_UI --network local)&id=$(dfx canister id minter --network local)"

echo ""
echo "📝 Next Steps:"
echo "=============="
echo "1. Open the Candid interfaces above to interact with the canisters"
echo "2. Run './scripts/test_deposit_withdraw.sh' to test the full flow"
echo "3. Check the README.md for detailed usage instructions"

echo ""
echo "✨ Happy building with ckBTC! ✨"
