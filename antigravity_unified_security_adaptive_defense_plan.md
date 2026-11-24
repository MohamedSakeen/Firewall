# Antigravity Implementation Plan — Unified Security Intelligence & Adaptive Defense

## Purpose

This is the execution specification for continuing the Smart Self-Learning Firewall from its current state.

### Already implemented

```text
Packet Capture
    ↓
Flow Engine
    ↓
Feature Engine
    ↓
Learning Mode
    ↓
Per-Asset Baselines
    ↓
Statistical Anomaly Detection
    ↓
Secure Learning / Poisoning Protection
```

### This plan implements next

```text
Behavioral Detection
        ↓
Unified Security Events
        ↓
Threat Scoring
        ↓
Event Correlation
        ↓
Incident Engine
        ↓
Attack Story / Timeline
        ↓
Adaptive Response Recommendation
        ↓
Policy Simulation
        ↓
Shadow Rules
        ↓
Safe Enforcement
        ↓
Response Verification
        ↓
Closed-Loop Learning
```

---

# 1. Mandatory Repository Audit

Before changing code, inspect the entire repository.

Identify the actual implementations of:

- packet capture
- packet normalization
- flow engine
- feature engine
- learning engine
- baseline engine
- anomaly detection
- trust gate
- poisoning protection
- firewall
- IDS
- IPS
- threat scoring
- alert management
- API
- WebSocket/Socket.IO
- frontend state
- existing security dashboards
- persistence/database layer
- existing tests

Do not assume documentation exactly matches the current code.

## Required first deliverable

Before implementation, produce a repository-specific plan containing:

```text
Current architecture
Current runtime data flow
Reusable components
Required changes
New modules
Database/schema changes
API changes
WebSocket changes
Frontend changes
Tests
Security risks
Migration strategy
Potential regressions
```

Do not rewrite working components merely to fit this document.

---

# 2. Safety Requirement

The deterministic firewall must remain operational if the intelligence layer fails.

Required behavior:

```text
Learning Engine fails
→ Firewall continues

Anomaly engine fails
→ Firewall + IDS/IPS continue

Correlation fails
→ Raw security events continue

Frontend fails
→ Backend enforcement continues
```

The intelligence layer must never become a single point of failure.

---

# 3. Target Architecture

```text
NETWORK
   ↓
PACKET CAPTURE
   ↓
NORMALIZER
   ↓
FLOW ENGINE
   ↓
FEATURE ENGINE
   ↓
┌───────────────────────┐
│ EXISTING SECURITY CORE│
│ Firewall + IDS + IPS  │
└───────────────────────┘
          +
┌───────────────────────┐
│ LEARNING INTELLIGENCE │
│ Baseline + Anomaly    │
└───────────────────────┘
          ↓
   UNIFIED EVENT
          ↓
    THREAT SCORE
          ↓
   CORRELATION
          ↓
      INCIDENT
          ↓
   ATTACK STORY
          ↓
RESPONSE RECOMMENDATION
          ↓
 POLICY SIMULATION
          ↓
    SHADOW RULE
          ↓
  SAFETY VALIDATION
          ↓
     ENFORCEMENT
          ↓
 RESPONSE VERIFICATION
          ↓
   VERIFIED OUTCOME
          ↓
  CONTROLLED LEARNING
```

---

# 4. Phase 1 — Unified Security Event

Create or extend the existing security-event abstraction.

First inspect existing alert/event classes. Reuse them where practical.

The event should support:

```text
event_id
timestamp
event_type

source_ip
destination_ip
source_port
destination_port
protocol

asset_id
flow_id
session_id

detector
severity

anomaly_score
threat_score
confidence

evidence[]
related_events[]

recommended_action
```

Optional context:

```text
network_segment
interface
direction
asset_role
asset_criticality
baseline_version
feature_schema_version
```

Supported sources:

```text
firewall
ids
ips
anomaly
behavior
threat_intelligence
manual
system
```

## Evidence must be structured

Example:

```text
type: behavioral_deviation
feature: ssh_connections_per_minute
baseline: 8
observed: 73
deviation: 11.4
explanation: connection frequency exceeded learned baseline
```

Do not store only free-form explanations when structured evidence is available.

---

# 5. Phase 2 — Integrate Behavioral Anomaly With Existing IDS

Combine:

```text
Existing IDS
+
Behavioral Anomaly
+
Firewall Events
+
Threat Intelligence
```

into the unified security-event pipeline.

Example:

```text
Port scan detected
Behavior anomaly = 0.91
Failed SSH connections = high
Source reputation = suspicious
```

The existing IDS/IPS behavior must remain compatible.

Do not allow anomaly detection to bypass existing enforcement policy.

Preserve detector provenance.

Avoid duplicate alerts where safe correlation can merge them.

---

# 6. Phase 3 — Explainable Threat Scoring

Extend the current scoring engine instead of blindly replacing it.

Example:

```text
THREAT SCORE: 88 / 100

+25 Port scan
+20 Failed SSH authentication
+18 Behavioral anomaly
+15 Suspicious source
+10 Critical asset
```

Store:

```text
score
score_components[]
confidence
scoring_version
```

Each score component should include:

```text
source
weight
reason
evidence_reference
```

Existing scoring behavior must be regression-tested.

---

# 7. Phase 4 — Event Correlation

Transform multiple related alerts:

```text
Port Scan
SSH Discovery
Failed SSH Attempts
Behavioral Anomaly
```

into:

```text
INCIDENT #1042
```

Correlation signals:

```text
same source
same target
same asset
time proximity
same service
related ports
related protocol
shared indicators
attack-stage relationship
```

Do not rely only on source IP.

Correlation must be:

- deterministic where possible
- testable
- bounded in memory
- resistant to duplicate events
- resistant to event storms

---

# 8. Phase 5 — Correlation Windows

Make the correlation window configurable.

Possible defaults:

```text
30 seconds
1 minute
5 minutes
15 minutes
```

Do not hard-code time windows throughout the code.

The implementation must prevent unbounded event accumulation.

---

# 9. Phase 6 — Incident Engine

Create or extend:

```text
incident.py
incident_manager.py
incident_state.py
incident_lifecycle.py
```

Lifecycle:

```text
OPEN
 ↓
INVESTIGATING
 ↓
CONTAINED
 ↓
RESOLVED
 ↓
LEARNED
```

Incident should contain:

```text
incident_id
start_time
end_time

source_entities[]
target_entities[]

events[]
severity
threat_score
confidence

attack_stage

recommended_actions[]
executed_actions[]

response_result
```

Reuse existing incident concepts if present.

---

# 10. Phase 7 — Incident Timeline

Generate an evidence-backed timeline.

Example:

```text
19:31:02  Recon detected
19:31:05  SSH discovered
19:31:09  Authentication failures increased
19:31:15  Behavioral anomaly = 0.91
19:31:20  Threat score = 87
19:31:21  Temporary block executed
19:31:25  Traffic reduced by 98%
```

Every timeline item must reference its underlying security event.

Do not invent events.

---

# 11. Phase 8 — Attack Story

Create a structured, human-readable incident explanation.

Example:

```text
Stage 1
Reconnaissance
Evidence: port scan

Stage 2
Service discovery
Evidence: SSH enumeration

Stage 3
Credential attack
Evidence: repeated authentication failures

Stage 4
Behavioral deviation
Evidence: connection rate exceeded baseline
```

Clearly distinguish:

```text
OBSERVED
```

from:

```text
INFERRED
```

For example:

```text
Observed: port scan
Inferred: possible reconnaissance
```

Never present an inference as confirmed fact.

---

# 12. Phase 9 — Adaptive Response Recommendation

Build or extend:

```text
recommendation_engine
response_policy
safety_validator
action_catalog
```

Supported actions:

```text
MONITOR
LOG_MORE
RATE_LIMIT
TEMPORARY_BLOCK
TERMINATE_SESSION
QUARANTINE
```

Recommendation inputs:

```text
threat score
confidence
asset criticality
attack stage
current firewall policy
historical response effectiveness
availability impact
scope
duration
```

Example:

```text
Threat Score: 92
Confidence: 0.94
Target: Critical database

Recommendation:
TEMPORARY_BLOCK
Duration:
10 minutes
```

---

# 13. Phase 10 — Response Safety Validator

Never implement:

```text
AI → firewall
```

Use:

```text
Recommendation
 ↓
Safety Validator
 ↓
Policy Check
 ↓
Simulation
 ↓
Automation Permission
 ↓
Enforcement
```

Validate:

```text
scope
duration
asset criticality
whitelist conflicts
existing rules
policy conflicts
availability risk
simulation result
automation permissions
```

Unsafe actions must be rejected or escalated for human approval.

---

# 14. Phase 11 — Policy Simulator

Before enforcing an adaptive rule, simulate it.

Example:

```text
Candidate:
BLOCK 10.0.0.23 TCP/445
```

Return:

```text
flows_analyzed
matches
known_malicious_matches
known_legitimate_matches
estimated_false_positive_rate
availability_impact
risk_level
recommendation
```

Risk levels:

```text
SAFE
CAUTION
HIGH_RISK
```

The simulation must be deterministic/reproducible for the same policy and dataset version.

---

# 15. Phase 12 — Shadow Rules

Candidate rules first enter:

```text
SHADOW
```

Shadow mode means:

```text
Evaluate
Record
Do NOT block
```

Lifecycle:

```text
PROPOSED
 ↓
SIMULATED
 ↓
SHADOW
 ↓
VALIDATED
 ↓
ACTIVE
```

Failure path:

```text
PROPOSED
 ↓
SIMULATED
 ↓
HIGH_RISK
 ↓
REJECTED
```

Every transition must be audited.

---

# 16. Phase 13 — Controlled Enforcement

Automated enforcement is allowed only when explicit policy conditions pass.

Example:

```text
threat_score > threshold
AND confidence > threshold
AND simulation = SAFE
AND asset impact = acceptable
AND automation permission = enabled
```

Otherwise:

```text
Recommendation
→ Human Approval
```

Record:

```text
action_id
incident_id
policy_id
reason
evidence
scope
duration
created_at
approved_by
executed_at
rollback_information
```

Every automated action must be reversible.

---

# 17. Phase 14 — Response Verification

Never assume an action worked.

Example:

```text
BEFORE
823 packets/sec

BLOCK

AFTER
4 packets/sec

Effectiveness
99.5%

Outcome
SUCCESS
```

Possible outcomes:

```text
SUCCESS
PARTIAL_SUCCESS
FAILED
FALSE_POSITIVE
BENIGN
UNKNOWN
```

Verification signals should depend on the action:

```text
traffic volume
flow count
connection attempts
packet rate
alert frequency
new source behavior
new destination behavior
```

---

# 18. Phase 15 — Failed Response Detection

Example:

```text
Before:
823 packets/sec

After:
790 packets/sec
```

Mark:

```text
RESPONSE INEFFECTIVE
```

Provide investigation hints where evidence supports them:

```text
alternate source
alternate destination
alternate port
rule mismatch
bypass path
attacker behavior changed
```

Do not assert the cause unless telemetry supports it.

---

# 19. Phase 16 — Closed-Loop Learning

Connect verified outcomes back to the learning system.

Final loop:

```text
DETECT
 ↓
DECIDE
 ↓
SIMULATE
 ↓
RESPOND
 ↓
VERIFY
 ↓
OUTCOME
 ↓
CONTROLLED LEARNING
 ↓
IMPROVE
```

Only verified outcomes enter future learning.

Never:

```text
raw response event → immediate model update
```

Use:

```text
Verified Outcome
 ↓
Validated Dataset
 ↓
Candidate Baseline/Model
 ↓
Evaluation
 ↓
Promotion
```

---

# 20. Phase 17 — Human Feedback

Support:

```text
TRUE_POSITIVE
FALSE_POSITIVE
BENIGN
MALICIOUS
UNKNOWN
```

Store:

```text
feedback_id
event_id
incident_id
label
reason
analyst
timestamp
```

Do not retrain production directly from a single analyst label.

Use:

```text
Feedback
 ↓
Validated Dataset
 ↓
Candidate Model/Baseline
 ↓
Evaluation
 ↓
Promotion
```

---

# 21. Phase 18 — Concept Drift

After the closed-loop pipeline is stable:

```text
Current Behavior
 ↓
Baseline Comparison
 ↓
Drift Detector
 ↓
Candidate Baseline
 ↓
Stability Observation
 ↓
Validation
 ↓
Promotion
```

The system must distinguish legitimate network changes from attacks.

---

# 22. Persistence / Database

Before creating new tables, inspect the existing persistence architecture.

Reuse existing models where possible.

Logical entities required:

```text
SecurityEvent
ThreatScore
Incident
IncidentEvent
ResponseRecommendation
PolicySimulation
ShadowRule
ResponseAction
ResponseVerification
Feedback
BaselineVersion
LearningAudit
```

All schema changes require:

- migration
- indexes
- timestamps
- relationships
- retention/cleanup strategy

Do not create duplicate entities for concepts that already exist.

---

# 23. API

Extend the existing API conventions.

Required capabilities:

```text
GET  /api/security-events
GET  /api/security-events/<id>

GET  /api/incidents
GET  /api/incidents/<id>
GET  /api/incidents/<id>/timeline

POST /api/feedback

POST /api/policies/simulate
POST /api/policies/shadow
POST /api/policies/promote

GET  /api/responses
GET  /api/responses/<id>/verification

GET  /api/learning/status
GET  /api/learning/audit
GET  /api/drift
```

If the project uses different route conventions, follow the existing architecture instead of blindly creating these exact paths.

Sensitive endpoints require:

```text
authentication
authorization
validation
audit logging
rate limiting
```

---

# 24. WebSocket / Socket.IO

Extend the existing real-time architecture.

Events should cover:

```text
security_event.created

incident.created
incident.updated

response.recommended
response.simulated
response.shadowed
response.executed
response.verified

baseline.updated
baseline.promoted
baseline.rollback

learning.observation
learning.rejected

drift.detected
```

Do not create duplicate channels when existing events can be extended.

---

# 25. Frontend

Do not redesign the entire application.

Extend the existing SOC UI.

Add/improve:

```text
Security Events
Incidents
Incident Detail
Incident Timeline
Learning Center
Adaptive Defense
Policy Simulator
Response Verification
```

## Security Event

Show:

```text
Event
Source
Target
Detector
Anomaly
Threat Score
Confidence
Evidence
```

## Incident

Show:

```text
Incident ID
Severity
Threat Score
Confidence
Source
Target
Attack Stage
Timeline
Evidence
Recommended Action
Response Status
```

## Adaptive Defense

Show:

```text
Recommended Action
Why
Simulation Result
Risk
Shadow Status

[SIMULATE]
[ENTER SHADOW]
[APPROVE]
[REJECT]
```

## Verification

Show:

```text
Before
Action
After
Effectiveness
Outcome
```

---

# 26. Testing

## Unit tests

Add/extend tests for:

```text
UnifiedSecurityEvent
Evidence
ThreatScoring
Correlation
Incident
Recommendation
SafetyValidator
PolicySimulator
ShadowRule
ResponseVerifier
Feedback
```

## End-to-end integration test

Must exercise:

```text
Packet
 ↓
Flow
 ↓
Feature
 ↓
Baseline
 ↓
Anomaly
 ↓
IDS
 ↓
Unified Event
 ↓
Threat Score
 ↓
Correlation
 ↓
Incident
 ↓
Recommendation
 ↓
Simulation
 ↓
Shadow
 ↓
Response
 ↓
Verification
```

---

# 27. Security Test Cases

### Test 1 — Normal traffic

Expected:

```text
Low severity
Learning allowed where appropriate
No adaptive response
```

### Test 2 — Suspicious traffic

Expected:

```text
Detection = YES
Learning = NO
```

### Test 3 — Multi-stage attack

Expected:

```text
Multiple alerts
→ one correlated incident
```

### Test 4 — Unsafe rule

Expected:

```text
Simulation = HIGH_RISK
Response = rejected or human approval
```

### Test 5 — Failed response

Expected:

```text
Verification = FAILED
Incident remains active/escalated
```

### Test 6 — Intelligence failure

Expected:

```text
Learning/anomaly unavailable
BUT
deterministic firewall remains operational
```

---

# 28. Performance

Do not perform expensive processing per packet.

Prefer:

```text
Packets
 ↓
Flows
 ↓
Behavioral Windows
 ↓
Security Events
 ↓
Correlation
```

Measure:

```text
packets/sec
flows/sec
events/sec
CPU
RAM
packet loss
detection latency
correlation latency
response latency
verification latency
```

Use bounded queues and prevent unbounded event memory.

---

# 29. Audit Logging

Audit:

```text
event creation
score calculation
correlation
incident creation
recommendation
simulation
shadow transition
approval
enforcement
verification
feedback
baseline promotion
rollback
```

Do not unnecessarily log secrets or sensitive data.

---

# 30. Exact Implementation Order

Unless repository dependencies require a controlled adjustment, implement in this order:

```text
1. Unified Security Event
2. Behavioral Anomaly → Security Event
3. Threat Score Integration
4. Evidence / Explainability
5. Event Correlation
6. Incident Engine
7. Incident Timeline
8. Attack Story
9. Response Recommendation
10. Safety Validator
11. Policy Simulator
12. Shadow Rules
13. Controlled Enforcement
14. Response Verification
15. Closed-Loop Outcome Learning
16. Human Feedback
17. Drift Detection
```

Do not jump to attack prediction or advanced ML.

---

# 31. Development Discipline

For every phase:

```text
Inspect
 ↓
Plan
 ↓
Implement
 ↓
Test
 ↓
Review
 ↓
Run existing tests
 ↓
Run new tests
 ↓
Manual verification
 ↓
Document
```

Do not make one giant unreviewable change.

Keep changes logically separated.

---

# 32. Regression Protection

Before every phase:

```text
Run existing test suite
```

After every phase:

```text
Existing tests
+
New tests
```

Verify:

```text
Firewall works
IDS works
IPS works
Packet capture works
Learning works
Dashboard works
```

---

# 33. Required End-to-End Demonstration

Do not declare this implementation complete until this scenario works:

```text
1. Normal traffic is observed.
2. Baseline remains healthy.
3. Suspicious behavior occurs.
4. Behavioral anomaly is generated.
5. Existing IDS generates additional evidence.
6. Events become unified security events.
7. Threat score combines evidence.
8. Related events are correlated.
9. One incident is created.
10. Incident timeline is generated.
11. Attack story is generated from evidence.
12. Response is recommended.
13. Candidate policy is simulated.
14. Candidate rule enters shadow mode.
15. Approved response is enforced.
16. Traffic changes after enforcement.
17. Response verifier measures the change.
18. Outcome becomes SUCCESS or FAILED.
19. Outcome is stored.
20. Only verified outcome enters controlled learning.
21. Deterministic firewall remains functional throughout.
```

---

# 34. Completion Checklist

Do not mark complete until:

```text
- [x] Unified security events
- [x] Behavioral anomaly integration
- [x] Threat score integration
- [x] Explainable scoring
- [x] Event correlation
- [x] Incident engine
- [x] Incident timeline
- [x] Attack story
- [x] Response recommendation
- [x] Safety validation
- [x] Policy simulation
- [x] Shadow rules
- [x] Controlled enforcement
- [x] Response verification
- [x] Failed-response detection
- [x] Feedback
- [x] Closed-loop learning
- [x] Drift detection
- [x] API tests
- [x] WebSocket tests
- [x] Frontend tests
- [x] Existing firewall tests
- [x] Existing IDS/IPS tests
- [x] Security tests
- [x] Performance measurements
- [x] Documentation
```

---

# 35. Do Not Implement Yet

Do not implement these until this plan is stable:

```text
Reinforcement Learning
Large Language Model decision-making
Deep-learning-heavy architecture
Unrestricted autonomous blocking
Attack prediction
Graph Neural Networks
Large distributed infrastructure
```

The next advanced layer depends on reliable incidents and verified outcomes.

---

# 36. Final Instruction to Antigravity

Treat this document as an implementation specification.

Before coding:

1. Audit the actual repository.
2. Produce a repository-specific implementation plan.
3. Reuse existing components.
4. Identify conflicts.
5. Implement one phase at a time.
6. Test every phase.
7. Preserve deterministic firewall behavior.
8. Keep adaptive actions explainable.
9. Keep adaptive actions reversible.
10. Protect learning from poisoning.
11. Avoid unnecessary infrastructure.
12. Do not introduce advanced ML before the deterministic intelligence pipeline is stable.
13. Do not claim completion without acceptance tests.

At the end, report:

```text
Files created
Files modified
Files removed
Database changes
API changes
WebSocket changes
Frontend changes
Tests added
Tests passed
Manual verification
Known limitations
Next recommended phase
```

## Core target

```text
DETECT
  ↓
UNDERSTAND
  ↓
DECIDE
  ↓
SIMULATE
  ↓
RESPOND
  ↓
VERIFY
  ↓
LEARN
  ↓
IMPROVE
```

The objective is not to add AI for the sake of AI.

The objective is to make the firewall progressively better at:

```text
detecting abnormal behavior
understanding related events
choosing safer responses
verifying defensive effectiveness
learning from verified outcomes
```
