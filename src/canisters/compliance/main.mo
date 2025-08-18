// Compliance Canister
// Handles KYC and regulatory compliance

import Debug "mo:base/Debug";

actor Compliance {
    public func greet(name : Text) : async Text {
        "Hello, " # name # "! This is the Compliance canister."
    };
}
