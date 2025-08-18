// Logging SDK - Shared library for emitting security events
// Used by all canisters to send structured events to the Events canister
// Provides type safety, batching, and async error handling

import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Buffer "mo:base/Buffer";
import Option "mo:base/Option";
import Debug "mo:base/Debug";

module LoggingSDK {

    // Re-export event types from Events canister
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

    // Events canister interface
    public type EventsCanister = actor {
        log_event: (
            EventSeverity,
            EventCategory,
            Text,          // event_type
            Text,          // actor_id
            ?Text,         // organization_id
            ?Text,         // session_id
            ?Text,         // source_ip
            ?Text,         // user_agent
            [(Text, Text)], // details
            ?Nat,          // risk_score
            ?Text          // correlation_id
        ) -> async Result.Result<Text, Text>;
        
        log_security_incident: (
            Text,          // incident_type
            Text,          // actor_id
            ?Text,         // organization_id
            [(Text, Text)], // threat_indicators
            ?Text,         // automated_response
            ?Text          // correlation_id
        ) -> async Result.Result<Text, Text>;
        
        log_compliance_event: (
            Text,          // compliance_type
            Text,          // actor_id
            ?Text,         // organization_id
            Text,          // compliance_result
            Text,          // policy_version
            [(Text, Text)] // details
        ) -> async Result.Result<Text, Text>;
    };

    // Logger configuration
    public type LoggerConfig = {
        events_canister_id: Principal;
        default_organization_id: ?Text;
        buffer_size: Nat;              // Max events to buffer before flush
        flush_interval_ns: Nat;        // Nanoseconds between forced flushes
        enable_batching: Bool;         // Whether to batch events
        retry_attempts: Nat;           // Number of retry attempts for failures
        correlation_context: ?Text;    // Default correlation context
    };

    // Logger instance state
    public type LoggerState = {
        var config: LoggerConfig;
        var event_buffer: Buffer.Buffer<PendingEvent>;
        var last_flush_time: Int;
        var failed_events: Buffer.Buffer<PendingEvent>;
        var current_correlation_id: ?Text;
    };

    public type PendingEvent = {
        severity: EventSeverity;
        category: EventCategory;
        event_type: Text;
        actor_id: Text;
        organization_id: ?Text;
        session_id: ?Text;
        source_ip: ?Text;
        user_agent: ?Text;
        details: [(Text, Text)];
        risk_score: ?Nat;
        correlation_id: ?Text;
        timestamp: Int;
        retry_count: Nat;
    };

    // Context for enriching events
    public type EventContext = {
        actor_id: ?Text;
        organization_id: ?Text;
        session_id: ?Text;
        source_ip: ?Text;
        user_agent: ?Text;
        correlation_id: ?Text;
    };

    // === Logger Initialization ===

    public func create_logger(config: LoggerConfig): LoggerState {
        {
            var config = config;
            var event_buffer = Buffer.Buffer<PendingEvent>(config.buffer_size);
            var last_flush_time = Time.now();
            var failed_events = Buffer.Buffer<PendingEvent>(100);
            var current_correlation_id = config.correlation_context;
        }
    };

    // === Core Logging Functions ===

    public func log_event(
        logger: LoggerState,
        severity: EventSeverity,
        category: EventCategory,
        event_type: Text,
        context: EventContext,
        details: [(Text, Text)],
        risk_score: ?Nat
    ): async Result.Result<Text, Text> {
        
        let event = create_pending_event(
            severity,
            category,
            event_type,
            context,
            details,
            risk_score,
            logger.current_correlation_id
        );

        if (logger.config.enable_batching) {
            // Add to buffer for batched processing
            logger.event_buffer.add(event);
            
            // Check if we need to flush
            if (should_flush(logger)) {
                let _ = await flush_events(logger);
            };
            
            #ok("event_buffered")
        } else {
            // Send immediately
            await send_single_event(logger, event)
        }
    };

    public func log_authentication_event(
        logger: LoggerState,
        event_type: Text,
        user_id: Text,
        session_id: ?Text,
        source_ip: ?Text,
        success: Bool,
        details: [(Text, Text)]
    ): async Result.Result<Text, Text> {
        
        let severity = if (success) { #Info } else { #P2 };
        let enhanced_details = Array.append(
            details,
            [
                ("success", if (success) { "true" } else { "false" }),
                ("timestamp", Int.toText(Time.now()))
            ]
        );
        
        let context: EventContext = {
            actor_id = ?user_id;
            organization_id = logger.config.default_organization_id;
            session_id = session_id;
            source_ip = source_ip;
            user_agent = null;
            correlation_id = logger.current_correlation_id;
        };

        await log_event(
            logger,
            severity,
            #Authentication,
            event_type,
            context,
            enhanced_details,
            if (success) { ?10 } else { ?60 }
        )
    };

    public func log_custody_operation(
        logger: LoggerState,
        operation_type: Text,
        user_id: Text,
        account_id: Text,
        amount: ?Text,
        currency: ?Text,
        transaction_id: ?Text,
        details: [(Text, Text)]
    ): async Result.Result<Text, Text> {
        
        let enhanced_details = Array.append(
            details,
            Array.catMaybes([
                ?("account_id", account_id),
                Option.map(amount, func(a: Text): (Text, Text) { ("amount", a) }),
                Option.map(currency, func(c: Text): (Text, Text) { ("currency", c) }),
                Option.map(transaction_id, func(t: Text): (Text, Text) { ("transaction_id", t) })
            ])
        );

        let risk_score = calculate_operation_risk_score(operation_type, amount);
        let severity = if (risk_score > 80) { #P1 } else if (risk_score > 50) { #P2 } else { #Info };

        let context: EventContext = {
            actor_id = ?user_id;
            organization_id = logger.config.default_organization_id;
            session_id = null;
            source_ip = null;
            user_agent = null;
            correlation_id = logger.current_correlation_id;
        };

        await log_event(
            logger,
            severity,
            #CustodyOperation,
            operation_type,
            context,
            enhanced_details,
            ?risk_score
        )
    };

    public func log_compliance_check(
        logger: LoggerState,
        check_type: Text,
        user_id: Text,
        result: Text,
        policy_version: Text,
        details: [(Text, Text)]
    ): async Result.Result<Text, Text> {
        
        let events_canister: EventsCanister = actor(Principal.toText(logger.config.events_canister_id));
        
        try {
            await events_canister.log_compliance_event(
                check_type,
                user_id,
                logger.config.default_organization_id,
                result,
                policy_version,
                details
            )
        } catch (error) {
            // Fallback to regular event logging if specialized function fails
            let context: EventContext = {
                actor_id = ?user_id;
                organization_id = logger.config.default_organization_id;
                session_id = null;
                source_ip = null;
                user_agent = null;
                correlation_id = logger.current_correlation_id;
            };

            let enhanced_details = Array.append(
                details,
                [
                    ("compliance_result", result),
                    ("policy_version", policy_version)
                ]
            );

            await log_event(
                logger,
                #Info,
                #ComplianceCheck,
                check_type,
                context,
                enhanced_details,
                null
            )
        }
    };

    public func log_security_incident(
        logger: LoggerState,
        incident_type: Text,
        user_id: Text,
        threat_indicators: [(Text, Text)],
        automated_response: ?Text
    ): async Result.Result<Text, Text> {
        
        let events_canister: EventsCanister = actor(Principal.toText(logger.config.events_canister_id));
        
        try {
            await events_canister.log_security_incident(
                incident_type,
                user_id,
                logger.config.default_organization_id,
                threat_indicators,
                automated_response,
                logger.current_correlation_id
            )
        } catch (error) {
            #err("Failed to log security incident: " # Error.message(error))
        }
    };

    public func log_policy_decision(
        logger: LoggerState,
        policy_name: Text,
        user_id: Text,
        decision: Text,
        rule_triggered: ?Text,
        details: [(Text, Text)]
    ): async Result.Result<Text, Text> {
        
        let enhanced_details = Array.append(
            details,
            Array.catMaybes([
                ?("decision", decision),
                Option.map(rule_triggered, func(r: Text): (Text, Text) { ("rule_triggered", r) })
            ])
        );

        let context: EventContext = {
            actor_id = ?user_id;
            organization_id = logger.config.default_organization_id;
            session_id = null;
            source_ip = null;
            user_agent = null;
            correlation_id = logger.current_correlation_id;
        };

        await log_event(
            logger,
            #Info,
            #PolicyDecision,
            policy_name,
            context,
            enhanced_details,
            null
        )
    };

    public func log_system_health(
        logger: LoggerState,
        metric_name: Text,
        value: Text,
        status: Text,
        details: [(Text, Text)]
    ): async Result.Result<Text, Text> {
        
        let severity = switch (status) {
            case ("critical") { #P0 };
            case ("warning") { #P2 };
            case ("healthy") { #Info };
            case _ { #P3 };
        };

        let enhanced_details = Array.append(
            details,
            [
                ("metric_value", value),
                ("status", status)
            ]
        );

        let context: EventContext = {
            actor_id = ?"system";
            organization_id = logger.config.default_organization_id;
            session_id = null;
            source_ip = null;
            user_agent = null;
            correlation_id = logger.current_correlation_id;
        };

        await log_event(
            logger,
            severity,
            #SystemHealth,
            metric_name,
            context,
            enhanced_details,
            null
        )
    };

    // === Context Management ===

    public func set_correlation_id(logger: LoggerState, correlation_id: ?Text) {
        logger.current_correlation_id := correlation_id;
    };

    public func get_correlation_id(logger: LoggerState): ?Text {
        logger.current_correlation_id
    };

    public func generate_correlation_id(): Text {
        "corr_" # Int.toText(Time.now()) # "_" # Nat.toText(Text.hash("random"))
    };

    // === Batch Processing ===

    public func flush_events(logger: LoggerState): async Result.Result<Text, Text> {
        if (logger.event_buffer.size() == 0) {
            return #ok("no_events_to_flush");
        };

        let events_to_send = Buffer.toArray(logger.event_buffer);
        logger.event_buffer.clear();
        logger.last_flush_time := Time.now();

        var success_count = 0;
        var error_count = 0;

        for (event in events_to_send.vals()) {
            switch (await send_single_event(logger, event)) {
                case (#ok(_)) { success_count += 1 };
                case (#err(_)) { 
                    error_count += 1;
                    if (event.retry_count < logger.config.retry_attempts) {
                        let retry_event = { event with retry_count = event.retry_count + 1 };
                        logger.failed_events.add(retry_event);
                    };
                };
            };
        };

        #ok("Flushed " # Nat.toText(success_count) # " events, " # Nat.toText(error_count) # " failed")
    };

    public func retry_failed_events(logger: LoggerState): async Result.Result<Text, Text> {
        if (logger.failed_events.size() == 0) {
            return #ok("no_failed_events");
        };

        let failed_events = Buffer.toArray(logger.failed_events);
        logger.failed_events.clear();

        var retry_success = 0;
        var retry_failed = 0;

        for (event in failed_events.vals()) {
            switch (await send_single_event(logger, event)) {
                case (#ok(_)) { retry_success += 1 };
                case (#err(_)) { 
                    retry_failed += 1;
                    if (event.retry_count < logger.config.retry_attempts) {
                        let retry_event = { event with retry_count = event.retry_count + 1 };
                        logger.failed_events.add(retry_event);
                    };
                };
            };
        };

        #ok("Retried " # Nat.toText(retry_success) # " events successfully, " # Nat.toText(retry_failed) # " still failing")
    };

    // === Helper Functions ===

    private func create_pending_event(
        severity: EventSeverity,
        category: EventCategory,
        event_type: Text,
        context: EventContext,
        details: [(Text, Text)],
        risk_score: ?Nat,
        correlation_id: ?Text
    ): PendingEvent {
        {
            severity = severity;
            category = category;
            event_type = event_type;
            actor_id = Option.get(context.actor_id, "anonymous");
            organization_id = context.organization_id;
            session_id = context.session_id;
            source_ip = context.source_ip;
            user_agent = context.user_agent;
            details = details;
            risk_score = risk_score;
            correlation_id = correlation_id;
            timestamp = Time.now();
            retry_count = 0;
        }
    };

    private func should_flush(logger: LoggerState): Bool {
        let now = Time.now();
        let time_since_flush = now - logger.last_flush_time;
        
        logger.event_buffer.size() >= logger.config.buffer_size or
        time_since_flush >= logger.config.flush_interval_ns
    };

    private func send_single_event(logger: LoggerState, event: PendingEvent): async Result.Result<Text, Text> {
        let events_canister: EventsCanister = actor(Principal.toText(logger.config.events_canister_id));
        
        try {
            await events_canister.log_event(
                event.severity,
                event.category,
                event.event_type,
                event.actor_id,
                event.organization_id,
                event.session_id,
                event.source_ip,
                event.user_agent,
                event.details,
                event.risk_score,
                event.correlation_id
            )
        } catch (error) {
            #err("Failed to send event: " # Error.message(error))
        }
    };

    private func calculate_operation_risk_score(operation_type: Text, amount: ?Text): Nat {
        let base_risk = switch (operation_type) {
            case ("withdrawal") { 60 };
            case ("transfer") { 40 };
            case ("deposit") { 20 };
            case _ { 30 };
        };

        switch (amount) {
            case (?amt) {
                // Parse amount and adjust risk (simplified)
                if (Text.contains(amt, #text "1000000")) { // $1M+
                    base_risk + 30
                } else if (Text.contains(amt, #text "100000")) { // $100K+
                    base_risk + 20
                } else if (Text.contains(amt, #text "10000")) { // $10K+
                    base_risk + 10
                } else {
                    base_risk
                }
            };
            case null { base_risk };
        }
    };

    // === Configuration Management ===

    public func update_config(logger: LoggerState, new_config: LoggerConfig) {
        logger.config := new_config;
    };

    public func get_buffer_size(logger: LoggerState): Nat {
        logger.event_buffer.size()
    };

    public func get_failed_events_count(logger: LoggerState): Nat {
        logger.failed_events.size()
    };

    // === Utility Functions ===

    public module Arrays = {
        public func catMaybes<T>(arr: [?T]): [T] {
            let buffer = Buffer.Buffer<T>(arr.size());
            for (item in arr.vals()) {
                switch (item) {
                    case (?value) { buffer.add(value) };
                    case null {};
                };
            };
            buffer.toArray()
        };
    };
}
