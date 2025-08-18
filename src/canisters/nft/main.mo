// NFT Canister
// Handles NFT minting and management for vault positions

import Debug "mo:base/Debug";

actor NFT {
    public func greet(name : Text) : async Text {
        "Hello, " # name # "! This is the NFT canister."
    };
}
