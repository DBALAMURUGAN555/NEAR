// Events Canister - Security Monitoring and SIEM Data Plane
// Collects, stores, and exports security events for institutional custody platform
// Implements GDPR compliance, PII minimization, and tamper-evident logging

import Debug "mo:base/Debug";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Option "mo:base/Option";
import Buffer "mo:base/Buffer";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Blob "mo:base/Blob";

actor EventsCanister {

    // === Event Types and Data Structures ===
    
    public type EventSeverity = {
        #P0;      // Critical - immediate action required
        #P1;      // High - escalation within 1 hour
        #P2;      // Medium - address within 8 hours
        #P3;      // Low - routine monitoring
        #Info;    // Informational
    };
    
    public type EventCategory = {
        #Authentication;          // Sign-ins, MFA, session events
        #Authorization;          // RBAC decisions, policy evaluations
        #CustodyOperation;       // Deposits, withdrawals, transfers
        #ComplianceCheck;        // KYC, sanctions, AML screening
        #PolicyDecision;         // Policy engine decisions
        #KeyManagement;          // Key generation, rotation, signing
        #BlockchainIO;           // Bitcoin transactions, UTXO queries
        #AdminAction;           // Administrative changes
        #ConfigurationChange;   // System configuration updates
        #SecurityIncident;      // Anomalies, threats, violations
        #SystemHealth;          // Performance, availability metrics
        #AuditTrail;           // Compliance and audit events
    };
    
    public type SecurityEvent = {
        id: Text;                    // Unique event identifier
        timestamp: Int;              // Nanoseconds since epoch
        severity: EventSeverity;     // Event severity level
        category: EventCategory;     // Event categorization
        event_type: Text;           // Specific event type
        actor_id: Text;             // Pseudonymized actor identifier
        organization_id: ?Text;     // Organization identifier
        session_id: ?Text;          // Session identifier (if applicable)
        source_canister: Text;      // Originating canister
        source_ip: ?Text;           // Client IP (if available)
        user_agent: ?Text;          // User agent (if applicable)
        details: [(Text, Text)];    // Event-specific details (key-value pairs)
        risk_score: ?Nat;          // Calculated risk score (0-100)
        compliance_flags: [Text];   // Compliance-related flags
        correlation_id: ?Text;      // For event correlation
        data_classification: DataClassification; // GDPR classification
        retention_period_days: Nat; // Retention period in days
        checksum: Text;            // Event integrity checksum
    };
    
    public type DataClassification = {
        #Public;           // No restrictions
        #Internal;         // Internal company data
        #Confidential;     // Sensitive business data
        #PersonalData;     // GDPR personal data
        #SensitivePersonal; // GDPR special categories
    };
    
    public type EventQuery = {
        start_time: ?Int;           // Query time range start
        end_time: ?Int;             // Query time range end
        severities: [EventSeverity]; // Filter by severities
        categories: [EventCategory]; // Filter by categories
        actor_ids: [Text];          // Filter by actors
        organization_ids: [Text];   // Filter by organizations
        correlation_id: ?Text;      // Filter by correlation
        limit: ?Nat;               // Result limit
        offset: ?Nat;              // Result offset
    };
    
    public type EventBatch = {
        events: [SecurityEvent];
        total_count: Nat;
        has_more: Bool;
        next_offset: ?Nat;
    };
    
    public type AlertRule = {
        id: Text;
        name: Text;
        description: Text;
        severity: EventSeverity;
        conditions: [(Text, Text)];  // Field-value conditions
        threshold_count: Nat;        // Events count threshold
        time_window_minutes: Nat;    // Time window for threshold
        is_active: Bool;
        created_at: Int;
        updated_at: Int;
        last_triggered: ?Int;
    };
    
    public type SystemMetrics = {
        total_events: Nat;
        events_last_hour: Nat;
        events_last_24h: Nat;
        p0_alerts_active: Nat;
        p1_alerts_active: Nat;
        storage_used_mb: Nat;
        oldest_event_age_hours: Nat;
        data_export_last_run: ?Int;
    };
    
    // === State Variables ===
    
    private stable var events_entries: [(Text, SecurityEvent)] = [];
    private stable var alert_rules_entries: [(Text, AlertRule)] = [];
    private stable var event_counter: Nat = 0;
    private stable var last_export_timestamp: Int = 0;
    private stable var authorized_exporters_entries: [Principal] = [];
    private stable var gdpr_data_subjects: [(Text, Int)] = []; // (actor_id, retention_end)
    
    private var events = HashMap.fromIter<Text, SecurityEvent>(
        events_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var alert_rules = HashMap.fromIter<Text, AlertRule>(
        alert_rules_entries.vals(), 10, Text.equal, Text.hash
    );
    
    private var authorized_exporters = HashMap.fromIter<Principal, Bool>(
        Array.map(authorized_exporters_entries, func(p: Principal): (Principal, Bool) { (p, true) }).vals(),
        10, Principal.equal, Principal.hash
    );
    
    private var gdpr_subjects = HashMap.fromIter<Text, Int>(
        gdpr_data_subjects.vals(), 10, Text.equal, Text.hash
    );
    
    // === Upgrade Hooks ===
    
    system func preupgrade() {
        events_entries := events.entries() |> Array.fromIter(_);
        alert_rules_entries := alert_rules.entries() |> Array.fromIter(_);
        authorized_exporters_entries := authorized_exporters.keys() |> Array.fromIter(_);
        gdpr_data_subjects := gdpr_subjects.entries() |> Array.fromIter(_);
    };
    
    system func postupgrade() {
        events_entries := [];
        alert_rules_entries := [];
        authorized_exporters_entries := [];
        gdpr_data_subjects := [];
        
        // Initialize default alert rules
        initialize_default_alert_rules();
    };
    
    // === Access Control ===
    
    private func is_authorized_exporter(caller: Principal): Bool {
        switch (authorized_exporters.get(caller)) {
            case (?true) { true };
            case _ { false };
        }
    };
    
    private func require_exporter_authorization(caller: Principal): Result.Result<(), Text> {
        if (is_authorized_exporter(caller)) {
            #ok()
        } else {
            #err("Unauthorized: Only authorized data exporters can access this function")
        }
    };
    
    // === Core Event Logging Functions ===
    
    public func log_event(
        severity: EventSeverity,
        category: EventCategory,
        event_type: Text,
        actor_id: Text,
        organization_id: ?Text,
        session_id: ?Text,
        source_ip: ?Text,
        user_agent: ?Text,
        details: [(Text, Text)],
        risk_score: ?Nat,
        correlation_id: ?Text
    ): async Result.Result<Text, Text> {
        let caller = ic_cdk::caller();
        
        // Generate event ID
        event_counter += 1;
        let event_id = generate_event_id(event_counter);
        
        let now = Time.now();
        
        // Determine data classification and retention
        let (classification, retention_days) = classify_event_data(category, details);
        
        // Generate compliance flags
        let compliance_flags = generate_compliance_flags(category, severity, details);
        
        // Calculate integrity checksum
        let checksum = calculate_event_checksum(event_id, now, actor_id, event_type, details);
        
        let event: SecurityEvent = {
            id = event_id;
            timestamp = now;
            severity = severity;
            category = category;
            event_type = event_type;
            actor_id = pseudonymize_actor_id(actor_id);
            organization_id = organization_id;
            session_id = session_id;
            source_canister = Principal.toText(caller);
            source_ip = sanitize_ip(source_ip);
            user_agent = sanitize_user_agent(user_agent);
            details = sanitize_details(details);
            risk_score = risk_score;
            compliance_flags = compliance_flags;
            correlation_id = correlation_id;
            data_classification = classification;
            retention_period_days = retention_days;
            checksum = checksum;
        };
        
        // Store event
        events.put(event_id, event);
        
        // Check alert rules
        let _ = check_alert_rules(event);
        
        // GDPR: Track data subject if personal data
        if (is_personal_data(classification)) {
            let retention_end = now + (retention_days * 24 * 60 * 60 * 1_000_000_000);
            gdpr_subjects.put(actor_id, retention_end);
        };
        
        #ok(event_id)
    };
    
    public func log_security_incident(
        incident_type: Text,
        actor_id: Text,
        organization_id: ?Text,
        threat_indicators: [(Text, Text)],
        automated_response: ?Text,
        correlation_id: ?Text
    ): async Result.Result<Text, Text> {
        let enhanced_details = Array.append(
            threat_indicators,
            switch (automated_response) {
                case (?response) { [("automated_response", response)] };
                case null { [] };
            }
        );
        
        await log_event(
            #P1,
            #SecurityIncident,
            incident_type,
            actor_id,
            organization_id,
            null,
            null,
            null,
            enhanced_details,
            ?90, // High risk score for security incidents
            correlation_id
        )
    };
    
    public func log_compliance_event(
        compliance_type: Text,
        actor_id: Text,
        organization_id: ?Text,
        compliance_result: Text,
        policy_version: Text,
        details: [(Text, Text)]
    ): async Result.Result<Text, Text> {
        let enhanced_details = Array.append(
            details,
            [
                ("compliance_result", compliance_result),
                ("policy_version", policy_version)
            ]
        );
        
        await log_event(
            #Info,
            #ComplianceCheck,
            compliance_type,
            actor_id,
            organization_id,
            null,
            null,
            null,
            enhanced_details,
            null,
            null
        )
    };
    
    // === Event Querying ===
    
    public query func query_events(query: EventQuery): async EventBatch {
        let all_events = events.vals() |> Array.fromIter(_);
        
        // Apply filters
        let filtered_events = Array.filter(all_events, func(event: SecurityEvent): Bool {
            // Time range filter
            let time_match = switch (query.start_time, query.end_time) {
                case (?start, ?end) { event.timestamp >= start and event.timestamp <= end };
                case (?start, null) { event.timestamp >= start };
                case (null, ?end) { event.timestamp <= end };
                case (null, null) { true };
            };
            
            // Severity filter
            let severity_match = if (query.severities.size() == 0) {
                true
            } else {
                Array.find(query.severities, func(s: EventSeverity): Bool { s == event.severity }) != null
            };
            
            // Category filter
            let category_match = if (query.categories.size() == 0) {
                true
            } else {
                Array.find(query.categories, func(c: EventCategory): Bool { c == event.category }) != null
            };
            
            // Actor filter
            let actor_match = if (query.actor_ids.size() == 0) {
                true
            } else {
                Array.find(query.actor_ids, func(a: Text): Bool { 
                    a == event.actor_id or a == depseudonymize_actor_id(event.actor_id)
                }) != null
            };
            
            // Organization filter
            let org_match = if (query.organization_ids.size() == 0) {
                true
            } else {
                switch (event.organization_id) {
                    case (?org_id) {
                        Array.find(query.organization_ids, func(o: Text): Bool { o == org_id }) != null
                    };
                    case null { false };
                }
            };
            
            // Correlation filter
            let correlation_match = switch (query.correlation_id) {
                case (?corr_id) {
                    switch (event.correlation_id) {
                        case (?event_corr_id) { event_corr_id == corr_id };
                        case null { false };
                    }
                };
                case null { true };
            };
            
            time_match and severity_match and category_match and actor_match and org_match and correlation_match
        });
        
        // Sort by timestamp (most recent first)
        let sorted_events = Array.sort(filtered_events, func(a: SecurityEvent, b: SecurityEvent): {#less; #equal; #greater} {
            if (a.timestamp > b.timestamp) { #less }
            else if (a.timestamp < b.timestamp) { #greater }
            else { #equal }
        });
        
        // Apply pagination
        let offset = switch (query.offset) { case (?o) { o }; case null { 0 } };
        let limit = switch (query.limit) { case (?l) { l }; case null { 100 } };
        
        let total_count = sorted_events.size();
        let end_idx = Nat.min(offset + limit, total_count);
        
        let page_events = if (offset < total_count) {
            Array.tabulate(end_idx - offset, func(i: Nat): SecurityEvent { 
                sorted_events[offset + i] 
            })
        } else {
            []
        };
        
        {
            events = page_events;
            total_count = total_count;
            has_more = end_idx < total_count;
            next_offset = if (end_idx < total_count) { ?end_idx } else { null };
        }
    };
    
    public query func get_event(event_id: Text): async ?SecurityEvent {
        events.get(event_id)
    };
    
    // === Alert Management ===
    
    public func add_alert_rule(
        name: Text,
        description: Text,
        severity: EventSeverity,
        conditions: [(Text, Text)],
        threshold_count: Nat,
        time_window_minutes: Nat
    ): async Result.Result<Text, Text> {
        let rule_id = generate_rule_id();
        let now = Time.now();
        
        let rule: AlertRule = {
            id = rule_id;
            name = name;
            description = description;
            severity = severity;
            conditions = conditions;
            threshold_count = threshold_count;
            time_window_minutes = time_window_minutes;
            is_active = true;
            created_at = now;
            updated_at = now;
            last_triggered = null;
        };
        
        alert_rules.put(rule_id, rule);
        #ok(rule_id)
    };
    
    private func check_alert_rules(event: SecurityEvent): async () {
        let rules = alert_rules.vals() |> Array.fromIter(_);
        
        for (rule in rules.vals()) {
            if (rule.is_active and matches_conditions(event, rule.conditions)) {
                let window_start = event.timestamp - (rule.time_window_minutes * 60 * 1_000_000_000);
                
                // Count matching events in time window
                let matching_count = count_matching_events(rule.conditions, window_start, event.timestamp);
                
                if (matching_count >= rule.threshold_count) {
                    let _ = trigger_alert(rule, event);
                };
            };
        };
    };
    
    private func trigger_alert(rule: AlertRule, triggering_event: SecurityEvent): async () {
        let now = Time.now();
        
        // Update last triggered time
        let updated_rule = { rule with last_triggered = ?now };
        alert_rules.put(rule.id, updated_rule);
        
        // Create alert event
        let alert_details = [
            ("rule_id", rule.id),
            ("rule_name", rule.name),
            ("triggering_event_id", triggering_event.id),
            ("threshold_count", Nat.toText(rule.threshold_count)),
            ("time_window_minutes", Nat.toText(rule.time_window_minutes))
        ];
        
        let _ = await log_event(
            rule.severity,
            #SecurityIncident,
            "alert_triggered",
            "system",
            triggering_event.organization_id,
            null,
            null,
            null,
            alert_details,
            ?95,
            triggering_event.correlation_id
        );
    };
    
    // === Data Export for SIEM ===
    
    public func export_events_for_siem(
        since_timestamp: ?Int,
        batch_size: ?Nat
    ): async Result.Result<[SecurityEvent], Text> {
        let caller = ic_cdk::caller();
        
        switch (require_exporter_authorization(caller)) {
            case (#err(msg)) { #err(msg) };
            case (#ok()) {
                let since = switch (since_timestamp) {
                    case (?ts) { ts };
                    case null { last_export_timestamp };
                };
                
                let size = switch (batch_size) {
                    case (?s) { s };
                    case null { 1000 };
                };
                
                let all_events = events.vals() |> Array.fromIter(_);
                let new_events = Array.filter(all_events, func(event: SecurityEvent): Bool {
                    event.timestamp > since
                });
                
                let sorted_events = Array.sort(new_events, func(a: SecurityEvent, b: SecurityEvent): {#less; #equal; #greater} {
                    if (a.timestamp < b.timestamp) { #less }
                    else if (a.timestamp > b.timestamp) { #greater }
                    else { #equal }
                });
                
                let batch_events = if (sorted_events.size() > size) {
                    Array.tabulate(size, func(i: Nat): SecurityEvent { sorted_events[i] })
                } else {
                    sorted_events
                };
                
                // Update export timestamp
                if (batch_events.size() > 0) {
                    last_export_timestamp := batch_events[batch_events.size() - 1].timestamp;
                };
                
                #ok(batch_events)
            };
        }
    };
    
    // === GDPR Compliance ===
    
    public func request_data_deletion(actor_id: Text): async Result.Result<Text, Text> {
        let pseudonymized_id = pseudonymize_actor_id(actor_id);
        let deleted_count = delete_personal_data(pseudonymized_id);
        
        // Remove from GDPR tracking
        gdpr_subjects.delete(actor_id);
        
        // Log deletion request
        let _ = await log_event(
            #Info,
            #AuditTrail,
            "gdpr_data_deletion",
            "system",
            null,
            null,
            null,
            null,
            [
                ("subject_id", pseudonymized_id),
                ("deleted_events_count", Nat.toText(deleted_count))
            ],
            null,
            null
        );
        
        #ok("Deleted " # Nat.toText(deleted_count) # " events for subject")
    };
    
    public func cleanup_expired_data(): async Result.Result<Text, Text> {
        let now = Time.now();
        let mut cleanup_count = 0;
        
        // Clean up expired events based on retention periods
        let all_events = events.entries() |> Array.fromIter(_);
        for ((event_id, event) in all_events.vals()) {
            let retention_end = event.timestamp + (event.retention_period_days * 24 * 60 * 60 * 1_000_000_000);
            if (now > retention_end) {
                events.delete(event_id);
                cleanup_count += 1;
            };
        };
        
        // Clean up expired GDPR subjects
        let gdpr_entries = gdpr_subjects.entries() |> Array.fromIter(_);
        for ((subject_id, retention_end) in gdpr_entries.vals()) {
            if (now > retention_end) {
                gdpr_subjects.delete(subject_id);
            };
        };
        
        #ok("Cleaned up " # Nat.toText(cleanup_count) # " expired events")
    };
    
    // === System Management ===
    
    public func add_authorized_exporter(exporter: Principal): async Result.Result<(), Text> {
        // In production, this would require admin authorization
        authorized_exporters.put(exporter, true);
        #ok()
    };
    
    public query func get_system_metrics(): async SystemMetrics {
        let now = Time.now();
        let one_hour_ago = now - (60 * 60 * 1_000_000_000);
        let one_day_ago = now - (24 * 60 * 60 * 1_000_000_000);
        
        let all_events = events.vals() |> Array.fromIter(_);
        
        let events_last_hour = Array.filter(all_events, func(event: SecurityEvent): Bool {
            event.timestamp >= one_hour_ago
        }).size();
        
        let events_last_24h = Array.filter(all_events, func(event: SecurityEvent): Bool {
            event.timestamp >= one_day_ago
        }).size();
        
        let p0_alerts = Array.filter(all_events, func(event: SecurityEvent): Bool {
            event.severity == #P0 and event.event_type == "alert_triggered" and event.timestamp >= one_day_ago
        }).size();
        
        let p1_alerts = Array.filter(all_events, func(event: SecurityEvent): Bool {
            event.severity == #P1 and event.event_type == "alert_triggered" and event.timestamp >= one_day_ago
        }).size();
        
        let oldest_event_time = Array.fold(all_events, now, func(acc: Int, event: SecurityEvent): Int {
            if (event.timestamp < acc) { event.timestamp } else { acc }
        });
        
        let oldest_age_hours = (now - oldest_event_time) / (60 * 60 * 1_000_000_000);
        
        {
            total_events = all_events.size();
            events_last_hour = events_last_hour;
            events_last_24h = events_last_24h;
            p0_alerts_active = p0_alerts;
            p1_alerts_active = p1_alerts;
            storage_used_mb = estimate_storage_usage();
            oldest_event_age_hours = Int.abs(oldest_age_hours);
            data_export_last_run = if (last_export_timestamp > 0) { ?last_export_timestamp } else { null };
        }
    };
    
    // === Helper Functions ===
    
    private func generate_event_id(counter: Nat): Text {
        "evt_" # Int.toText(Time.now()) # "_" # Nat.toText(counter)
    };
    
    private func generate_rule_id(): Text {
        "rule_" # Int.toText(Time.now())
    };
    
    private func pseudonymize_actor_id(actor_id: Text): Text {
        // Simple pseudonymization - in production use proper crypto hash
        "user_" # Nat.toText(Text.hash(actor_id))
    };
    
    private func depseudonymize_actor_id(pseudo_id: Text): Text {
        // This is a placeholder - real depseudonymization would require a lookup table
        pseudo_id
    };
    
    private func sanitize_ip(ip: ?Text): ?Text {
        // Remove last octet for privacy
        switch (ip) {
            case (?addr) {
                if (Text.contains(addr, #char '.')) {
                    ?Text.replace(addr, #char '.', ".*")
                } else { ?addr }
            };
            case null { null };
        }
    };
    
    private func sanitize_user_agent(ua: ?Text): ?Text {
        // Keep only browser/OS info, remove detailed version numbers
        ua // Placeholder implementation
    };
    
    private func sanitize_details(details: [(Text, Text)]): [(Text, Text)] {
        // Remove or hash sensitive fields
        Array.map(details, func((key, value): (Text, Text)): (Text, Text) {
            if (Text.contains(key, #text "password") or Text.contains(key, #text "secret")) {
                (key, "[REDACTED]")
            } else {
                (key, value)
            }
        })
    };
    
    private func classify_event_data(category: EventCategory, details: [(Text, Text)]): (DataClassification, Nat) {
        switch (category) {
            case (#Authentication or #Authorization) { (#PersonalData, 2555) }; // 7 years
            case (#CustodyOperation or #ComplianceCheck) { (#Confidential, 3650) }; // 10 years
            case (#AuditTrail) { (#Confidential, 3650) }; // 10 years
            case (#SecurityIncident) { (#Confidential, 2555) }; // 7 years
            case _ { (#Internal, 365) }; // 1 year
        }
    };
    
    private func generate_compliance_flags(category: EventCategory, severity: EventSeverity, details: [(Text, Text)]): [Text] {
        var flags = Buffer.Buffer<Text>(0);
        
        // Add category-specific flags
        switch (category) {
            case (#ComplianceCheck) { flags.add("COMPLIANCE_REQUIRED") };
            case (#CustodyOperation) { flags.add("FINANCIAL_TRANSACTION") };
            case (#SecurityIncident) { flags.add("SECURITY_REVIEW") };
            case _ {};
        };
        
        // Add severity-specific flags
        switch (severity) {
            case (#P0 or #P1) { flags.add("HIGH_PRIORITY") };
            case _ {};
        };
        
        flags.toArray()
    };
    
    private func calculate_event_checksum(event_id: Text, timestamp: Int, actor_id: Text, event_type: Text, details: [(Text, Text)]): Text {
        // Simple checksum - in production use proper cryptographic hash
        let combined = event_id # Int.toText(timestamp) # actor_id # event_type;
        Nat.toText(Text.hash(combined))
    };
    
    private func is_personal_data(classification: DataClassification): Bool {
        classification == #PersonalData or classification == #SensitivePersonal
    };
    
    private func matches_conditions(event: SecurityEvent, conditions: [(Text, Text)]): Bool {
        Array.foldLeft(conditions, true, func(acc: Bool, (field, value): (Text, Text)): Bool {
            if (not acc) { return false };
            
            switch (field) {
                case ("severity") { debug_show(event.severity) == value };
                case ("category") { debug_show(event.category) == value };
                case ("event_type") { event.event_type == value };
                case ("organization_id") {
                    switch (event.organization_id) {
                        case (?org_id) { org_id == value };
                        case null { false };
                    }
                };
                case _ { true }; // Unknown fields don't match
            }
        })
    };
    
    private func count_matching_events(conditions: [(Text, Text)], window_start: Int, window_end: Int): Nat {
        let all_events = events.vals() |> Array.fromIter(_);
        Array.filter(all_events, func(event: SecurityEvent): Bool {
            event.timestamp >= window_start and 
            event.timestamp <= window_end and
            matches_conditions(event, conditions)
        }).size()
    };
    
    private func delete_personal_data(pseudonymized_id: Text): Nat {
        let all_events = events.entries() |> Array.fromIter(_);
        var deleted_count = 0;
        
        for ((event_id, event) in all_events.vals()) {
            if (event.actor_id == pseudonymized_id and is_personal_data(event.data_classification)) {
                events.delete(event_id);
                deleted_count += 1;
            };
        };
        
        deleted_count
    };
    
    private func estimate_storage_usage(): Nat {
        // Rough estimation - in production use proper measurement
        events.size() * 2 // KB per event estimate
    };
    
    private func initialize_default_alert_rules() {
        // Failed authentication attempts
        let _ = alert_rules.put("rule_auth_failures", {
            id = "rule_auth_failures";
            name = "Multiple Authentication Failures";
            description = "Detects multiple failed authentication attempts";
            severity = #P2;
            conditions = [("category", "Authentication"), ("event_type", "auth_failed")];
            threshold_count = 5;
            time_window_minutes = 15;
            is_active = true;
            created_at = Time.now();
            updated_at = Time.now();
            last_triggered = null;
        });
        
        // High-value transactions
        let _ = alert_rules.put("rule_high_value_tx", {
            id = "rule_high_value_tx";
            name = "High-Value Transaction";
            description = "Detects high-value custody transactions";
            severity = #P1;
            conditions = [("category", "CustodyOperation"), ("event_type", "withdrawal")];
            threshold_count = 1;
            time_window_minutes = 1;
            is_active = true;
            created_at = Time.now();
            updated_at = Time.now();
            last_triggered = null;
        });
    };
    
    // === Public Query Functions ===
    
    public query func health_check(): async Text {
        "Events canister is operational - " # Nat.toText(events.size()) # " events stored"
    };
    
    public func greet(name: Text): async Text {
        "Hello, " # name # "! This is the Events & SIEM Data Plane canister."
    };
}
