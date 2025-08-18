// Liquidator Canister
// Handles liquidation of undercollateralized positions

import Debug "mo:base/Debug";

actor Liquidator {
    public func greet(name : Text) : async Text {
        "Hello, " # name # "! This is the Liquidator canister."
    };
}
