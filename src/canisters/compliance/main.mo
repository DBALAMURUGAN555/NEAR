// Compliance Canister - Institutional Grade KYC/AML and Regulatory Compliance
// Built for custody providers, government organizations, and financial institutions

import Debug "mo:base/Debug";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Option "mo:base/Option";

actor Compliance {

    // === Types and Data Structures ===
    
    public type ComplianceStatus = {
        #Compliant;
        #PendingKyc;
        #RequiresReview;
        #NonCompliant;
        #Sanctioned;
    };
    
    public type KycLevel = {
        #Basic;      // Individual verification
        #Enhanced;   // Enhanced due diligence
        #Corporate;  // Corporate KYC
        #Government; // Government entity verification
    };
    
    public type RiskRating = {
        #Low;     // 1-3
        #Medium;  // 4-6
        #High;    // 7-8
        #Critical; // 9-10
    };
    
    public type ComplianceRecord = {
        principal: Principal;
        institution_name: Text;
        jurisdiction: Text;
        kyc_level: KycLevel;
        status: ComplianceStatus;
        risk_rating: RiskRating;
        verified_at: Int;
        verified_by: Principal;
        documents_hash: Text; // IPFS hash of KYC documents
        sanctions_check_at: Int;
        aml_score: Nat;
        notes: Text;
    };
    
    public type SanctionsRecord = {
        entity_id: Text;
        entity_type: Text; // "individual", "corporate", "government"
        sanctioned_by: [Text]; // ["OFAC", "UN", "EU", etc.]
        added_at: Int;
        reason: Text;
        severity: RiskRating;
    };
    
    public type AuditEvent = {
        id: Text;
        event_type: Text; // "kyc_verified", "sanctions_check", "compliance_update"
        principal: Principal;
        timestamp: Int;
        details: Text;
        performed_by: Principal;
        ip_address: ?Text;
        user_agent: ?Text;
    };
    
    public type PolicyRule = {
        id: Text;
        name: Text;
        description: Text;
        rule_type: Text; // "transaction_limit", "jurisdiction_block", "risk_threshold"
        parameters: [(Text, Text)];
        is_active: Bool;
        created_at: Int;
        updated_at: Int;
    };
    
    public type ComplianceReport = {
        report_id: Text;
        report_type: Text; // "monthly_sar", "quarterly_compliance", "annual_audit"
        period_start: Int;
        period_end: Int;
        total_accounts: Nat;
        high_risk_accounts: Nat;
        sanctions_alerts: Nat;
        kyc_completions: Nat;
        generated_at: Int;
        generated_by: Principal;
        data_hash: Text;
    };
    
    // === State Variables ===
    
    private stable var compliance_records_entries : [(Principal, ComplianceRecord)] = [];
    private stable var sanctions_entries : [(Text, SanctionsRecord)] = [];
    private stable var audit_events_entries : [(Text, AuditEvent)] = [];
    private stable var policy_rules_entries : [(Text, PolicyRule)] = [];
    private stable var compliance_reports_entries : [(Text, ComplianceReport)] = [];
    private stable var authorized_officers_entries : [Principal] = [];
    private stable var system_settings_entries : [(Text, Text)] = [];
    
    private var compliance_records = HashMap.fromIter<Principal, ComplianceRecord>(
        compliance_records_entries.vals(), 10, Principal.equal, Principal.hash
    );
    
    private var sanctions_list = HashMap.fromIter<Text, SanctionsRecord>(
        sanctions_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var audit_events = HashMap.fromIter<Text, AuditEvent>(
        audit_events_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var policy_rules = HashMap.fromIter<Text, PolicyRule>(
        policy_rules_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var compliance_reports = HashMap.fromIter<Text, ComplianceReport>(
        compliance_reports_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var authorized_officers = HashMap.fromIter<Principal, Bool>(
        Array.map(authorized_officers_entries, func(p: Principal): (Principal, Bool) { (p, true) }).vals(),
        10, Principal.equal, Principal.hash
    );
    
    private var system_settings = HashMap.fromIter<Text, Text>(
        system_settings_entries.vals(), 10, Text.equal, Text.hash
    );
    
    // === Upgrade Hooks ===
    
    system func preupgrade() {
        compliance_records_entries := compliance_records.entries() |> Array.fromIter(_);
        sanctions_entries := sanctions_list.entries() |> Array.fromIter(_);
        audit_events_entries := audit_events.entries() |> Array.fromIter(_);
        policy_rules_entries := policy_rules.entries() |> Array.fromIter(_);
        compliance_reports_entries := compliance_reports.entries() |> Array.fromIter(_);
        authorized_officers_entries := authorized_officers.keys() |> Array.fromIter(_);
        system_settings_entries := system_settings.entries() |> Array.fromIter(_);
    };
    
    system func postupgrade() {
        compliance_records_entries := [];
        sanctions_entries := [];
        audit_events_entries := [];
        policy_rules_entries := [];
        compliance_reports_entries := [];
        authorized_officers_entries := [];
        system_settings_entries := [];
    };
    
    // === Access Control ===
    
    private func is_authorized_officer(caller: Principal) : Bool {
        switch (authorized_officers.get(caller)) {
            case (?true) { true };
            case _ { false };
        };
    };
    
    private func require_authorization(caller: Principal) : Result.Result<(), Text> {
        if (is_authorized_officer(caller)) {
            #ok()
        } else {
            #err("Unauthorized: Only compliance officers can perform this action")
        }
    };
    
    // === Core Compliance Functions ===
    
    public func verify_kyc(
        subject: Principal,
        institution_name: Text,
        jurisdiction: Text,
        kyc_level: KycLevel,
        documents_hash: Text,
        aml_score: Nat
    ) : async Result.Result<ComplianceRecord, Text> {
        let caller = Principal.fromActor(Compliance);
        
        switch (require_authorization(caller)) {
            case (#err(msg)) { #err(msg) };
            case (#ok()) {
                let now = Time.now();
                let risk_rating = calculate_risk_rating(aml_score, jurisdiction, kyc_level);
                
                let record : ComplianceRecord = {
                    principal = subject;
                    institution_name = institution_name;
                    jurisdiction = jurisdiction;
                    kyc_level = kyc_level;
                    status = #Compliant;
                    risk_rating = risk_rating;
                    verified_at = now;
                    verified_by = caller;
                    documents_hash = documents_hash;
                    sanctions_check_at = now;
                    aml_score = aml_score;
                    notes = "KYC verification completed";
                };
                
                compliance_records.put(subject, record);
                
                // Log audit event
                let audit_id = generate_audit_id();
                let audit_event : AuditEvent = {
                    id = audit_id;
                    event_type = "kyc_verified";
                    principal = subject;
                    timestamp = now;
                    details = "KYC verified for " # institution_name # " in " # jurisdiction;
                    performed_by = caller;
                    ip_address = null;
                    user_agent = null;
                };
                
                audit_events.put(audit_id, audit_event);
                
                #ok(record)
            };
        };
    };
    
    public func check_sanctions(entity_id: Text) : async Result.Result<Bool, Text> {
        switch (sanctions_list.get(entity_id)) {
            case (?sanctions_record) {
                // Entity is sanctioned
                let now = Time.now();
                let audit_id = generate_audit_id();
                let caller = Principal.fromActor(Compliance);
                
                let audit_event : AuditEvent = {
                    id = audit_id;
                    event_type = "sanctions_alert";
                    principal = caller;
                    timestamp = now;
                    details = "Sanctions match found for entity: " # entity_id;
                    performed_by = caller;
                    ip_address = null;
                    user_agent = null;
                };
                
                audit_events.put(audit_id, audit_event);
                
                #ok(true)
            };
            case null {
                #ok(false)
            };
        };
    };
    
    public func update_compliance_status(
        subject: Principal,
        new_status: ComplianceStatus,
        reason: Text
    ) : async Result.Result<(), Text> {
        let caller = Principal.fromActor(Compliance);
        
        switch (require_authorization(caller)) {
            case (#err(msg)) { #err(msg) };
            case (#ok()) {
                switch (compliance_records.get(subject)) {
                    case (?record) {
                        let updated_record = {
                            record with
                            status = new_status;
                            notes = reason;
                        };
                        
                        compliance_records.put(subject, updated_record);
                        
                        // Log audit event
                        let audit_id = generate_audit_id();
                        let audit_event : AuditEvent = {
                            id = audit_id;
                            event_type = "compliance_status_updated";
                            principal = subject;
                            timestamp = Time.now();
                            details = "Status updated to: " # debug_show(new_status) # " Reason: " # reason;
                            performed_by = caller;
                            ip_address = null;
                            user_agent = null;
                        };
                        
                        audit_events.put(audit_id, audit_event);
                        
                        #ok(())
                    };
                    case null {
                        #err("Compliance record not found")
                    };
                };
            };
        };
    };
    
    public func get_compliance_status(subject: Principal) : async ?ComplianceStatus {
        switch (compliance_records.get(subject)) {
            case (?record) { ?record.status };
            case null { null };
        };
    };
    
    public func get_compliance_record(subject: Principal) : async ?ComplianceRecord {
        compliance_records.get(subject)
    };
    
    // === Policy Engine ===
    
    public func add_policy_rule(
        name: Text,
        description: Text,
        rule_type: Text,
        parameters: [(Text, Text)]
    ) : async Result.Result<Text, Text> {
        let caller = Principal.fromActor(Compliance);
        
        switch (require_authorization(caller)) {
            case (#err(msg)) { #err(msg) };
            case (#ok()) {
                let rule_id = generate_rule_id();
                let now = Time.now();
                
                let rule : PolicyRule = {
                    id = rule_id;
                    name = name;
                    description = description;
                    rule_type = rule_type;
                    parameters = parameters;
                    is_active = true;
                    created_at = now;
                    updated_at = now;
                };
                
                policy_rules.put(rule_id, rule);
                
                #ok(rule_id)
            };
        };
    };
    
    public func evaluate_transaction_compliance(
        principal: Principal,
        amount: Nat,
        recipient: ?Text,
        transaction_type: Text
    ) : async Result.Result<Bool, Text> {
        // Get compliance record
        switch (compliance_records.get(principal)) {
            case (?record) {
                // Check if account is compliant
                switch (record.status) {
                    case (#NonCompliant or #Sanctioned) { #ok(false) };
                    case (#PendingKyc or #RequiresReview) {
                        // Allow small transactions for pending accounts
                        if (amount <= 10000) { #ok(true) } else { #ok(false) }
                    };
                    case (#Compliant) {
                        // Apply policy rules
                        let compliance_result = await apply_policy_rules(record, amount, recipient, transaction_type);
                        #ok(compliance_result)
                    };
                };
            };
            case null {
                #err("No compliance record found")
            };
        };
    };
    
    private func apply_policy_rules(
        record: ComplianceRecord,
        amount: Nat,
        recipient: ?Text,
        transaction_type: Text
    ) : async Bool {
        // Simplified policy evaluation
        // In production, this would be more sophisticated
        
        // Check transaction limits based on risk rating
        let max_amount = switch (record.risk_rating) {
            case (#Low) { 1000000 }; // 1M
            case (#Medium) { 500000 }; // 500K
            case (#High) { 100000 }; // 100K
            case (#Critical) { 10000 }; // 10K
        };
        
        if (amount > max_amount) {
            return false;
        };
        
        // Check sanctions for recipient if provided
        switch (recipient) {
            case (?addr) {
                let sanctions_result = await check_sanctions(addr);
                switch (sanctions_result) {
                    case (#ok(is_sanctioned)) {
                        if (is_sanctioned) { return false; };
                    };
                    case (#err(_)) { return false; };
                };
            };
            case null { };
        };
        
        true
    };
    
    // === Audit and Reporting ===
    
    public func generate_compliance_report(
        report_type: Text,
        period_start: Int,
        period_end: Int
    ) : async Result.Result<ComplianceReport, Text> {
        let caller = Principal.fromActor(Compliance);
        
        switch (require_authorization(caller)) {
            case (#err(msg)) { #err(msg) };
            case (#ok()) {
                let report_id = generate_report_id();
                let now = Time.now();
                
                // Calculate statistics
                let stats = calculate_compliance_stats(period_start, period_end);
                
                let report : ComplianceReport = {
                    report_id = report_id;
                    report_type = report_type;
                    period_start = period_start;
                    period_end = period_end;
                    total_accounts = stats.total_accounts;
                    high_risk_accounts = stats.high_risk_accounts;
                    sanctions_alerts = stats.sanctions_alerts;
                    kyc_completions = stats.kyc_completions;
                    generated_at = now;
                    generated_by = caller;
                    data_hash = "hash_placeholder"; // In production, would be actual hash
                };
                
                compliance_reports.put(report_id, report);
                
                #ok(report)
            };
        };
    };
    
    public func get_audit_trail(principal: ?Principal, limit: Nat) : async [AuditEvent] {
        let events = audit_events.vals() |> Array.fromIter(_);
        
        let filtered_events = switch (principal) {
            case (?p) {
                Array.filter(events, func(event: AuditEvent) : Bool {
                    event.principal == p
                });
            };
            case null { events };
        };
        
        // Sort by timestamp (most recent first) and limit
        let sorted_events = Array.sort(filtered_events, func(a: AuditEvent, b: AuditEvent) : {#less; #equal; #greater} {
            if (a.timestamp > b.timestamp) { #less }
            else if (a.timestamp < b.timestamp) { #greater }
            else { #equal }
        });
        
        let result_size = if (sorted_events.size() > limit) { limit } else { sorted_events.size() };
        Array.tabulate(result_size, func(i: Nat) : AuditEvent { sorted_events[i] })
    };
    
    // === Administrative Functions ===
    
    public func add_authorized_officer(officer: Principal) : async Result.Result<(), Text> {
        let caller = Principal.fromActor(Compliance);
        
        // For now, allow any caller to add officers (in production, would require admin role)
        authorized_officers.put(officer, true);
        
        let audit_id = generate_audit_id();
        let audit_event : AuditEvent = {
            id = audit_id;
            event_type = "officer_added";
            principal = officer;
            timestamp = Time.now();
            details = "Compliance officer authorized";
            performed_by = caller;
            ip_address = null;
            user_agent = null;
        };
        
        audit_events.put(audit_id, audit_event);
        
        #ok(())
    };
    
    public func add_sanctions_entry(
        entity_id: Text,
        entity_type: Text,
        sanctioned_by: [Text],
        reason: Text,
        severity: RiskRating
    ) : async Result.Result<(), Text> {
        let caller = Principal.fromActor(Compliance);
        
        switch (require_authorization(caller)) {
            case (#err(msg)) { #err(msg) };
            case (#ok()) {
                let sanctions_record : SanctionsRecord = {
                    entity_id = entity_id;
                    entity_type = entity_type;
                    sanctioned_by = sanctioned_by;
                    added_at = Time.now();
                    reason = reason;
                    severity = severity;
                };
                
                sanctions_list.put(entity_id, sanctions_record);
                
                #ok(())
            };
        };
    };
    
    // === Helper Functions ===
    
    private func calculate_risk_rating(aml_score: Nat, jurisdiction: Text, kyc_level: KycLevel) : RiskRating {
        var score = 0;
        
        // AML score contribution
        if (aml_score > 80) { score += 1 }
        else if (aml_score > 60) { score += 2 }
        else if (aml_score > 40) { score += 3 }
        else { score += 4 };
        
        // Jurisdiction risk (simplified)
        if (Text.contains(jurisdiction, #text "US") or Text.contains(jurisdiction, #text "EU")) {
            score += 1;
        } else {
            score += 3;
        };
        
        // KYC level contribution
        switch (kyc_level) {
            case (#Government) { score += 0 };
            case (#Corporate) { score += 1 };
            case (#Enhanced) { score += 2 };
            case (#Basic) { score += 3 };
        };
        
        if (score <= 3) { #Low }
        else if (score <= 6) { #Medium }
        else if (score <= 8) { #High }
        else { #Critical }
    };
    
    private func generate_audit_id() : Text {
        "audit_" # Int.toText(Time.now())
    };
    
    private func generate_rule_id() : Text {
        "rule_" # Int.toText(Time.now())
    };
    
    private func generate_report_id() : Text {
        "report_" # Int.toText(Time.now())
    };
    
    private func calculate_compliance_stats(period_start: Int, period_end: Int) : {
        total_accounts: Nat;
        high_risk_accounts: Nat;
        sanctions_alerts: Nat;
        kyc_completions: Nat;
    } {
        let records = compliance_records.vals() |> Array.fromIter(_);
        let events = audit_events.vals() |> Array.fromIter(_);
        
        let total_accounts = records.size();
        let high_risk_accounts = Array.filter(records, func(r: ComplianceRecord) : Bool {
            switch (r.risk_rating) {
                case (#High or #Critical) { true };
                case _ { false };
            }
        }).size();
        
        let period_events = Array.filter(events, func(e: AuditEvent) : Bool {
            e.timestamp >= period_start and e.timestamp <= period_end
        });
        
        let sanctions_alerts = Array.filter(period_events, func(e: AuditEvent) : Bool {
            e.event_type == "sanctions_alert"
        }).size();
        
        let kyc_completions = Array.filter(period_events, func(e: AuditEvent) : Bool {
            e.event_type == "kyc_verified"
        }).size();
        
        {
            total_accounts = total_accounts;
            high_risk_accounts = high_risk_accounts;
            sanctions_alerts = sanctions_alerts;
            kyc_completions = kyc_completions;
        }
    };
    
    // === Public Query Functions ===
    
    public query func health_check() : async Text {
        "Compliance canister is operational"
    };
    
    public query func get_system_stats() : async {
        total_compliance_records: Nat;
        total_sanctions_entries: Nat;
        total_audit_events: Nat;
        total_policy_rules: Nat;
        authorized_officers_count: Nat;
    } {
        {
            total_compliance_records = compliance_records.size();
            total_sanctions_entries = sanctions_list.size();
            total_audit_events = audit_events.size();
            total_policy_rules = policy_rules.size();
            authorized_officers_count = authorized_officers.size();
        }
    };
    
    public func greet(name : Text) : async Text {
        "Hello, " # name # "! This is the Institutional-Grade Compliance canister."
    };
}
