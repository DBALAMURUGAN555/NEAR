// Admin Canister
// Administrative functions for the Bitcoin Yield Vaults

import Debug "mo:base/Debug";

actor Admin {
    public func greet(name : Text) : async Text {
        "Hello, " # name # "! This is the Admin canister."
    };
}
