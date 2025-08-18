// Oracle Canister
// Provides price feeds and external data

import Debug "mo:base/Debug";

actor Oracle {
    public func greet(name : Text) : async Text {
        "Hello, " # name # "! This is the Oracle canister."
    };
}
