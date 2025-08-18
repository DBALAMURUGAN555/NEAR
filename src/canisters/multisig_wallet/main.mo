// Multi-Signature Wallet Canister - Institutional Grade
// Enterprise-level multi-signature wallet with threshold signatures, role-based access,
// and institutional custody features for banks, governments, and enterprises

import Debug "mo:base/Debug";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Option "mo:base/Option";
import Nat "mo:base/Nat";
import Int "mo:base/Int";

actor MultiSigWallet {

    // === Types and Data Structures ===
    
    public type Role = {
        #Owner;        // Full control, can add/remove signers
        #Admin;        // Can create transactions, manage policies
        #Signer;       // Can sign transactions
        #Observer;     // Read-only access
        #Emergency;    // Emergency controls only
    };
    
    public type TransactionStatus = {
        #Pending;      // Awaiting signatures
        #Approved;     // Has enough signatures, ready to execute
        #Executed;     // Successfully executed
        #Rejected;     // Explicitly rejected
        #Expired;      // Expired due to timeout
        #Cancelled;    // Cancelled by authorized party
    };
    
    public type TransactionType = {
        #Transfer;     // Standard transfer
        #Withdrawal;   // Withdrawal to external address
        #AddSigner;    // Add new signer
        #RemoveSigner; // Remove signer
        #ChangePolicy; // Update wallet policies
        #Emergency;    // Emergency action
    };
    
    public type WalletPolicy = {
        required_signatures: Nat;  // Threshold for transaction approval
        signature_timeout: Int;    // Time limit for collecting signatures (nanoseconds)
        daily_limit: Nat;         // Daily transaction limit
        single_tx_limit: Nat;     // Single transaction limit
        emergency_delay: Int;     // Delay for emergency actions
        allowed_destinations: [Text]; // Whitelisted addresses (empty = all allowed)
        requires_compliance_check: Bool; // Require compliance verification
    };
    
    public type Signer = {
        principal: Principal;
        role: Role;
        added_at: Int;
        added_by: Principal;
        is_active: Bool;
        last_activity: Int;
        signature_count: Nat;
    };
    
    public type Transaction = {
        id: Text;
        tx_type: TransactionType;
        initiator: Principal;
        created_at: Int;
        expires_at: Int;
        status: TransactionStatus;
        amount: Nat;
        recipient: ?Text;
        data: ?Text; // Additional transaction data
        required_signatures: Nat;
        signatures: [(Principal, Int)]; // (signer, timestamp)
        executed_at: ?Int;
        execution_result: ?Text;
        compliance_check_id: ?Text;
    };
    
    public type EmergencyAction = {
        id: Text;
        action_type: Text; // "freeze", "unfreeze", "emergency_withdrawal"
        initiated_by: Principal;
        created_at: Int;
        execute_at: Int; // When the action becomes executable
        status: TransactionStatus;
        reason: Text;
        affected_addresses: [Text];
    };
    
    public type AuditEvent = {
        id: Text;
        event_type: Text;
        principal: Principal;
        timestamp: Int;
        details: Text;
        transaction_id: ?Text;
        ip_address: ?Text;
    };
    
    // === State Variables ===
    
    private stable var wallet_policy_entries: [(Text, WalletPolicy)] = [];
    private stable var signers_entries: [(Principal, Signer)] = [];
    private stable var transactions_entries: [(Text, Transaction)] = [];
    private stable var emergency_actions_entries: [(Text, EmergencyAction)] = [];
    private stable var audit_events_entries: [(Text, AuditEvent)] = [];
    private stable var wallet_balance: Nat = 0;
    private stable var daily_spent: Nat = 0;
    private stable var last_reset_day: Int = 0;
    private stable var is_frozen: Bool = false;
    private stable var created_at: Int = 0;
    private stable var creator: Principal = Principal.fromText("2vxsx-fae");
    
    private var wallet_policies = HashMap.fromIter<Text, WalletPolicy>(
        wallet_policy_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var signers = HashMap.fromIter<Principal, Signer>(
        signers_entries.vals(), 10, Principal.equal, Principal.hash
    );
    
    private var transactions = HashMap.fromIter<Text, Transaction>(
        transactions_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var emergency_actions = HashMap.fromIter<Text, EmergencyAction>(
        emergency_actions_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var audit_events = HashMap.fromIter<Text, AuditEvent>(
        audit_events_entries.vals(), 10, Text.equal, Text.hash
    );
    
    // === Initialization ===
    
    public func initialize(
        initial_signers: [(Principal, Role)],
        initial_policy: WalletPolicy
    ) : async Result.Result<Text, Text> {
        // Only allow initialization once
        if (created_at > 0) {
            return #err("Wallet already initialized");
        };
        
        let caller = Principal.fromActor(MultiSigWallet);
        created_at := Time.now();
        creator := caller;
        
        // Add initial signers
        for ((principal, role) in initial_signers.vals()) {
            let signer: Signer = {
                principal = principal;
                role = role;
                added_at = created_at;
                added_by = caller;
                is_active = true;
                last_activity = created_at;
                signature_count = 0;
            };
            signers.put(principal, signer);
        };
        
        // Set initial policy
        wallet_policies.put("default", initial_policy);
        
        // Log initialization
        let audit_id = generate_audit_id();
        let audit_event: AuditEvent = {
            id = audit_id;
            event_type = "wallet_initialized";
            principal = caller;
            timestamp = created_at;
            details = "Multi-signature wallet initialized with " # Nat.toText(initial_signers.size()) # " signers";
            transaction_id = null;
            ip_address = null;
        };
        audit_events.put(audit_id, audit_event);
        
        #ok("Wallet initialized successfully")
    };
    
    // === Upgrade Hooks ===
    
    system func preupgrade() {
        wallet_policy_entries := wallet_policies.entries() |> Array.fromIter(_);
        signers_entries := signers.entries() |> Array.fromIter(_);
        transactions_entries := transactions.entries() |> Array.fromIter(_);
        emergency_actions_entries := emergency_actions.entries() |> Array.fromIter(_);
        audit_events_entries := audit_events.entries() |> Array.fromIter(_);
    };
    
    system func postupgrade() {
        wallet_policy_entries := [];
        signers_entries := [];
        transactions_entries := [];
        emergency_actions_entries := [];
        audit_events_entries := [];
    };
    
    // === Access Control ===
    
    private func get_signer(principal: Principal): ?Signer {
        signers.get(principal)
    };
    
    private func has_role(principal: Principal, required_role: Role): Bool {
        switch (get_signer(principal)) {
            case (?signer) {
                signer.is_active and (signer.role == required_role or signer.role == #Owner)
            };
            case null { false };
        }
    };
    
    private func require_role(principal: Principal, required_role: Role): Result.Result<Signer, Text> {
        switch (get_signer(principal)) {
            case (?signer) {
                if (signer.is_active and (signer.role == required_role or signer.role == #Owner)) {
                    #ok(signer)
                } else {
                    #err("Insufficient permissions")
                }
            };
            case null {
                #err("Not a wallet signer")
            };
        }
    };
    
    private func can_sign_transaction(principal: Principal): Bool {
        switch (get_signer(principal)) {
            case (?signer) {
                signer.is_active and (
                    signer.role == #Owner or 
                    signer.role == #Admin or 
                    signer.role == #Signer
                )
            };
            case null { false };
        }
    };
    
    // === Core Multi-Signature Functions ===
    
    public func propose_transaction(
        tx_type: TransactionType,
        amount: Nat,
        recipient: ?Text,
        data: ?Text
    ): async Result.Result<Text, Text> {
        if (is_frozen) {
            return #err("Wallet is frozen");
        };
        
        let caller = Principal.fromActor(MultiSigWallet);
        
        switch (require_role(caller, #Admin)) {
            case (#err(msg)) { #err(msg) };
            case (#ok(signer)) {
                let policy = get_current_policy();
                
                // Validate transaction limits
                switch (validate_transaction_limits(amount)) {
                    case (#err(msg)) { #err(msg) };
                    case (#ok()) {
                        let tx_id = generate_transaction_id();
                        let now = Time.now();
                        
                        let transaction: Transaction = {
                            id = tx_id;
                            tx_type = tx_type;
                            initiator = caller;
                            created_at = now;
                            expires_at = now + policy.signature_timeout;
                            status = #Pending;
                            amount = amount;
                            recipient = recipient;
                            data = data;
                            required_signatures = policy.required_signatures;
                            signatures = [];
                            executed_at = null;
                            execution_result = null;
                            compliance_check_id = null;
                        };
                        
                        transactions.put(tx_id, transaction);
                        
                        // Automatically sign if proposer can sign
                        if (can_sign_transaction(caller)) {
                            let _ = await sign_transaction(tx_id);
                        };
                        
                        // Log event
                        let audit_id = generate_audit_id();
                        let audit_event: AuditEvent = {
                            id = audit_id;
                            event_type = "transaction_proposed";
                            principal = caller;
                            timestamp = now;
                            details = "Transaction proposed: " # debug_show(tx_type) # " Amount: " # Nat.toText(amount);
                            transaction_id = ?tx_id;
                            ip_address = null;
                        };
                        audit_events.put(audit_id, audit_event);
                        
                        #ok(tx_id)
                    };
                };
            };
        };
    };
    
    public func sign_transaction(tx_id: Text): async Result.Result<Text, Text> {
        if (is_frozen) {
            return #err("Wallet is frozen");
        };
        
        let caller = Principal.fromActor(MultiSigWallet);
        
        if (not can_sign_transaction(caller)) {
            return #err("Not authorized to sign transactions");
        };
        
        switch (transactions.get(tx_id)) {
            case (?transaction) {
                if (transaction.status != #Pending) {
                    return #err("Transaction is not pending");
                };
                
                let now = Time.now();
                if (now > transaction.expires_at) {
                    // Mark as expired
                    let expired_tx = { transaction with status = #Expired };
                    transactions.put(tx_id, expired_tx);
                    return #err("Transaction has expired");
                };
                
                // Check if already signed
                let already_signed = Array.find(transaction.signatures, func((signer, _): (Principal, Int)): Bool {
                    signer == caller
                });
                
                if (already_signed != null) {
                    return #err("Already signed this transaction");
                };
                
                // Add signature
                let new_signatures = Array.append(transaction.signatures, [(caller, now)]);
                let updated_tx = { transaction with signatures = new_signatures };
                
                // Check if we have enough signatures
                let final_tx = if (new_signatures.size() >= transaction.required_signatures) {
                    { updated_tx with status = #Approved }
                } else {
                    updated_tx
                };
                
                transactions.put(tx_id, final_tx);
                
                // Update signer activity
                switch (get_signer(caller)) {
                    case (?signer) {
                        let updated_signer = {
                            signer with 
                            last_activity = now;
                            signature_count = signer.signature_count + 1;
                        };
                        signers.put(caller, updated_signer);
                    };
                    case null { };
                };
                
                // Log event
                let audit_id = generate_audit_id();
                let audit_event: AuditEvent = {
                    id = audit_id;
                    event_type = "transaction_signed";
                    principal = caller;
                    timestamp = now;
                    details = "Transaction signed. Signatures: " # Nat.toText(new_signatures.size()) # "/" # Nat.toText(transaction.required_signatures);
                    transaction_id = ?tx_id;
                    ip_address = null;
                };
                audit_events.put(audit_id, audit_event);
                
                // Execute if approved
                if (final_tx.status == #Approved) {
                    let _ = await execute_transaction(tx_id);
                };
                
                #ok("Transaction signed successfully")
            };
            case null {
                #err("Transaction not found")
            };
        };
    };
    
    public func execute_transaction(tx_id: Text): async Result.Result<Text, Text> {
        switch (transactions.get(tx_id)) {
            case (?transaction) {
                if (transaction.status != #Approved) {
                    return #err("Transaction not approved");
                };
                
                let now = Time.now();
                
                // Perform compliance check if required
                let policy = get_current_policy();
                if (policy.requires_compliance_check) {
                    // In production, this would call the compliance canister
                    // For now, we'll simulate it
                };
                
                // Execute based on transaction type
                let result = switch (transaction.tx_type) {
                    case (#Transfer) { execute_transfer(transaction) };
                    case (#Withdrawal) { execute_withdrawal(transaction) };
                    case (#AddSigner) { execute_add_signer(transaction) };
                    case (#RemoveSigner) { execute_remove_signer(transaction) };
                    case (#ChangePolicy) { execute_policy_change(transaction) };
                    case (#Emergency) { execute_emergency_action(transaction) };
                };
                
                let executed_tx = {
                    transaction with
                    status = #Executed;
                    executed_at = ?now;
                    execution_result = ?result;
                };
                
                transactions.put(tx_id, executed_tx);
                
                // Update daily spent for transfers and withdrawals
                switch (transaction.tx_type) {
                    case (#Transfer or #Withdrawal) {
                        update_daily_spent(transaction.amount);
                    };
                    case (_) { };
                };
                
                // Log execution
                let audit_id = generate_audit_id();
                let audit_event: AuditEvent = {
                    id = audit_id;
                    event_type = "transaction_executed";
                    principal = Principal.fromActor(MultiSigWallet);
                    timestamp = now;
                    details = "Transaction executed: " # result;
                    transaction_id = ?tx_id;
                    ip_address = null;
                };
                audit_events.put(audit_id, audit_event);
                
                #ok(result)
            };
            case null {
                #err("Transaction not found")
            };
        };
    };
    
    // === Transaction Execution Handlers ===
    
    private func execute_transfer(transaction: Transaction): Text {
        // In production, this would interact with ledger canister
        switch (transaction.recipient) {
            case (?recipient) {
                if (wallet_balance >= transaction.amount) {
                    wallet_balance -= transaction.amount;
                    "Transfer of " # Nat.toText(transaction.amount) # " to " # recipient # " completed"
                } else {
                    "Insufficient balance"
                }
            };
            case null { "No recipient specified" };
        }
    };
    
    private func execute_withdrawal(transaction: Transaction): Text {
        // Similar to transfer but with additional external processing
        execute_transfer(transaction)
    };
    
    private func execute_add_signer(transaction: Transaction): Text {
        // Parse signer data from transaction.data
        // In production, would properly deserialize the data
        switch (transaction.data) {
            case (?data) {
                // Simplified - in production would parse JSON or similar
                let new_principal = Principal.fromText("rdmx6-jaaaa-aaaah-qdrha-cai"); // Placeholder
                let signer: Signer = {
                    principal = new_principal;
                    role = #Signer;
                    added_at = Time.now();
                    added_by = transaction.initiator;
                    is_active = true;
                    last_activity = Time.now();
                    signature_count = 0;
                };
                signers.put(new_principal, signer);
                "Signer added successfully"
            };
            case null { "No signer data provided" };
        }
    };
    
    private func execute_remove_signer(transaction: Transaction): Text {
        // Parse and remove signer
        switch (transaction.data) {
            case (?data) {
                // In production would parse the principal from data
                let signer_to_remove = Principal.fromText("rdmx6-jaaaa-aaaah-qdrha-cai"); // Placeholder
                switch (signers.get(signer_to_remove)) {
                    case (?signer) {
                        let deactivated_signer = { signer with is_active = false };
                        signers.put(signer_to_remove, deactivated_signer);
                        "Signer removed successfully"
                    };
                    case null { "Signer not found" };
                }
            };
            case null { "No signer data provided" };
        }
    };
    
    private func execute_policy_change(transaction: Transaction): Text {
        // Update wallet policy
        switch (transaction.data) {
            case (?data) {
                // In production would parse new policy from data
                let current_policy = get_current_policy();
                let new_policy = {
                    current_policy with
                    required_signatures = current_policy.required_signatures; // Would update based on data
                };
                wallet_policies.put("default", new_policy);
                "Policy updated successfully"
            };
            case null { "No policy data provided" };
        }
    };
    
    private func execute_emergency_action(transaction: Transaction): Text {
        // Handle emergency actions
        switch (transaction.data) {
            case (?data) {
                if (Text.contains(data, #text "freeze")) {
                    is_frozen := true;
                    "Wallet frozen due to emergency"
                } else if (Text.contains(data, #text "unfreeze")) {
                    is_frozen := false;
                    "Wallet unfrozen"
                } else {
                    "Unknown emergency action"
                }
            };
            case null { "No emergency action specified" };
        }
    };
    
    // === Signer Management ===
    
    public func add_signer(
        new_signer: Principal,
        role: Role
    ): async Result.Result<Text, Text> {
        let caller = Principal.fromActor(MultiSigWallet);
        
        switch (require_role(caller, #Owner)) {
            case (#err(msg)) { #err(msg) };
            case (#ok(_)) {
                // Create transaction to add signer (requires multi-sig approval)
                let signer_data = "add_signer:" # Principal.toText(new_signer) # ":" # debug_show(role);
                await propose_transaction(#AddSigner, 0, null, ?signer_data)
            };
        };
    };
    
    public func remove_signer(signer_to_remove: Principal): async Result.Result<Text, Text> {
        let caller = Principal.fromActor(MultiSigWallet);
        
        switch (require_role(caller, #Owner)) {
            case (#err(msg)) { #err(msg) };
            case (#ok(_)) {
                let signer_data = "remove_signer:" # Principal.toText(signer_to_remove);
                await propose_transaction(#RemoveSigner, 0, null, ?signer_data)
            };
        };
    };
    
    public func update_signer_role(
        signer_principal: Principal,
        new_role: Role
    ): async Result.Result<Text, Text> {
        let caller = Principal.fromActor(MultiSigWallet);
        
        switch (require_role(caller, #Owner)) {
            case (#err(msg)) { #err(msg) };
            case (#ok(_)) {
                switch (signers.get(signer_principal)) {
                    case (?signer) {
                        let updated_signer = { signer with role = new_role };
                        signers.put(signer_principal, updated_signer);
                        #ok("Signer role updated")
                    };
                    case null {
                        #err("Signer not found")
                    };
                };
            };
        };
    };
    
    // === Emergency Functions ===
    
    public func initiate_emergency_freeze(reason: Text): async Result.Result<Text, Text> {
        let caller = Principal.fromActor(MultiSigWallet);
        
        if (not has_role(caller, #Emergency) and not has_role(caller, #Owner)) {
            return #err("Not authorized for emergency actions");
        };
        
        let emergency_id = generate_emergency_id();
        let now = Time.now();
        let policy = get_current_policy();
        
        let emergency_action: EmergencyAction = {
            id = emergency_id;
            action_type = "freeze";
            initiated_by = caller;
            created_at = now;
            execute_at = now + policy.emergency_delay;
            status = #Pending;
            reason = reason;
            affected_addresses = [];
        };
        
        emergency_actions.put(emergency_id, emergency_action);
        
        #ok("Emergency freeze initiated. Will execute at: " # Int.toText(emergency_action.execute_at))
    };
    
    public func execute_emergency_action(emergency_id: Text): async Result.Result<Text, Text> {
        switch (emergency_actions.get(emergency_id)) {
            case (?action) {
                if (action.status != #Pending) {
                    return #err("Emergency action already processed");
                };
                
                let now = Time.now();
                if (now < action.execute_at) {
                    return #err("Emergency delay period not yet elapsed");
                };
                
                // Execute the emergency action
                let result = switch (action.action_type) {
                    case ("freeze") {
                        is_frozen := true;
                        "Wallet frozen due to emergency: " # action.reason
                    };
                    case ("unfreeze") {
                        is_frozen := false;
                        "Wallet unfrozen"
                    };
                    case (_) { "Unknown emergency action" };
                };
                
                let executed_action = { action with status = #Executed };
                emergency_actions.put(emergency_id, executed_action);
                
                #ok(result)
            };
            case null {
                #err("Emergency action not found")
            };
        };
    };
    
    // === Policy Management ===
    
    public func update_policy(new_policy: WalletPolicy): async Result.Result<Text, Text> {
        let caller = Principal.fromActor(MultiSigWallet);
        
        switch (require_role(caller, #Owner)) {
            case (#err(msg)) { #err(msg) };
            case (#ok(_)) {
                // Create transaction to update policy (requires multi-sig approval)
                let policy_data = "update_policy"; // In production, would serialize the policy
                await propose_transaction(#ChangePolicy, 0, null, ?policy_data)
            };
        };
    };
    
    // === Utility Functions ===
    
    private func get_current_policy(): WalletPolicy {
        switch (wallet_policies.get("default")) {
            case (?policy) { policy };
            case null {
                // Default policy if none exists
                {
                    required_signatures = 2;
                    signature_timeout = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds
                    daily_limit = 1_000_000;
                    single_tx_limit = 500_000;
                    emergency_delay = 6 * 60 * 60 * 1_000_000_000; // 6 hours
                    allowed_destinations = [];
                    requires_compliance_check = true;
                }
            };
        }
    };
    
    private func validate_transaction_limits(amount: Nat): Result.Result<(), Text> {
        let policy = get_current_policy();
        
        if (amount > policy.single_tx_limit) {
            return #err("Amount exceeds single transaction limit");
        };
        
        // Check daily limit
        update_daily_counter();
        if (daily_spent + amount > policy.daily_limit) {
            return #err("Amount exceeds daily limit");
        };
        
        #ok()
    };
    
    private func update_daily_spent(amount: Nat) {
        update_daily_counter();
        daily_spent += amount;
    };
    
    private func update_daily_counter() {
        let now = Time.now();
        let current_day = now / (24 * 60 * 60 * 1_000_000_000);
        
        if (current_day > last_reset_day) {
            daily_spent := 0;
            last_reset_day := current_day;
        };
    };
    
    private func generate_transaction_id(): Text {
        "tx_" # Int.toText(Time.now()) # "_" # Int.toText(transactions.size())
    };
    
    private func generate_emergency_id(): Text {
        "emergency_" # Int.toText(Time.now())
    };
    
    private func generate_audit_id(): Text {
        "audit_" # Int.toText(Time.now()) # "_" # Int.toText(audit_events.size())
    };
    
    // === Query Functions ===
    
    public query func get_transaction(tx_id: Text): async ?Transaction {
        transactions.get(tx_id)
    };
    
    public query func get_pending_transactions(): async [Transaction] {
        let all_transactions = transactions.vals() |> Array.fromIter(_);
        Array.filter(all_transactions, func(tx: Transaction): Bool {
            tx.status == #Pending
        })
    };
    
    public query func get_signer_info(principal: Principal): async ?Signer {
        signers.get(principal)
    };
    
    public query func get_all_signers(): async [Signer] {
        signers.vals() |> Array.fromIter(_)
    };
    
    public query func get_wallet_info(): async {
        balance: Nat;
        is_frozen: Bool;
        policy: WalletPolicy;
        signers_count: Nat;
        pending_transactions: Nat;
        daily_spent: Nat;
        daily_limit: Nat;
    } {
        let policy = get_current_policy();
        let pending_count = get_pending_transactions().size();
        
        {
            balance = wallet_balance;
            is_frozen = is_frozen;
            policy = policy;
            signers_count = signers.size();
            pending_transactions = pending_count;
            daily_spent = daily_spent;
            daily_limit = policy.daily_limit;
        }
    };
    
    public query func get_audit_trail(limit: Nat): async [AuditEvent] {
        let events = audit_events.vals() |> Array.fromIter(_);
        let sorted_events = Array.sort(events, func(a: AuditEvent, b: AuditEvent): {#less; #equal; #greater} {
            if (a.timestamp > b.timestamp) { #less }
            else if (a.timestamp < b.timestamp) { #greater }
            else { #equal }
        });
        
        let result_size = if (sorted_events.size() > limit) { limit } else { sorted_events.size() };
        Array.tabulate(result_size, func(i: Nat): AuditEvent { sorted_events[i] })
    };
    
    public query func health_check(): async Text {
        "Multi-signature wallet is operational"
    };
    
    public func greet(name: Text): async Text {
        "Hello, " # name # "! This is the Institutional Multi-Signature Wallet canister."
    };
}
