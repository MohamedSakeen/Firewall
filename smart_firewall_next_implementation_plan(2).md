# Smart Self-Learning Firewall — Next Implementation Plan

## Phase 7 → Phase 14

**Purpose:** Continue implementation after completing the initial Smart-Learning foundation.

**Assumption:** The following components are already implemented and working:

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
```

The next objective is to transform the learned behavioral intelligence into a **secure, explainable, correlated security system** and then into a controlled adaptive-defense system.

---

# 1. Current State

The current system should already be capable of:

- capturing network traffic
- reconstructing packets into flows
- extracting behavioral features
- learning normal behavior
- maintaining per-asset baselines
- identifying behavioral deviations
- producing anomaly scores

The next phase must answer:

> **How do we safely use these learned anomalies together with the existing Firewall + IDS + IPS system?**

The target pipeline is:

```text
                    NEW TRAFFIC
                         ↓
                    FLOW ENGINE
                         ↓
                   FEATURE ENGINE
                         ↓
                ┌────────┴────────┐
                ↓                 ↓
          BASELINE CHECK      EXISTING IDS
                ↓                 ↓
          ANOMALY SCORE       DETECTION
                └────────┬────────┘
                         ↓
                 UNIFIED EVENT
                         ↓
                 THREAT SCORING
                         ↓
                  EVENT CORRELATION
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
                SAFE ENFORCEMENT
                         ↓
              RESPONSE VERIFICATION
                         ↓
                VERIFIED OUTCOME
                         ↓
                 CONTROLLED LEARNING
```

---

# 2. Phase 7 — Secure Learning Gate

## Objective

Prevent attackers from poisoning the learned baseline.

The firewall must never blindly learn from all observed traffic.

### Required pipeline

```text
New Observation
      ↓
Learning Trust Gate
      ↓
       ┌───────────────┐
       │ Is it trusted?│
       └───────┬───────┘
          YES  │  NO
           ↓  │   ↓
       Learn  │ Detect Only
```

## 2.1 Trust conditions

An observation should normally be eligible for learning only when:

```text
anomaly is low
AND
no active incident exists
AND
source is not quarantined
AND
source is not known malicious
AND
behavior is sufficiently stable
```

## 2.2 Create

```text
backend/engine/learning/security/
├── __init__.py
├── trust_gate.py
├── observation_validator.py
└── poisoning_guard.py
```

## 2.3 Trust decision

The gate should return something similar to:

```text
TRUSTED
SUSPICIOUS
MALICIOUS
UNKNOWN
```

and:

```text
learn_allowed = true/false
reason = ...
```

## 2.4 Important rule

A suspicious observation can still be detected.

It simply must not modify the trusted baseline.

Example:

```text
Attack traffic
     ↓
Anomaly = 0.94
     ↓
Trust Gate
     ↓
NOT ELIGIBLE FOR LEARNING
     ↓
IDS / Threat Scoring
```

---

# 3. Phase 7.1 — Baseline Poisoning Protection

## Objective

Protect against slow behavioral manipulation.

Example attack:

```text
Normal:
10 connections/min

Attacker gradually creates:

20
25
30
40
50
60
70
```

If every observation updates the baseline, the firewall may eventually consider:

```text
70 connections/min = normal
```

That must not happen.

## Required controls

Implement:

```text
bounded baseline updates
candidate baselines
baseline versioning
confidence thresholds
stability requirements
rollback
```

## Safe process

```text
Current Baseline
      ↓
Candidate Change
      ↓
Stability Check
      ↓
Validation
      ↓
Promotion
```

Never:

```text
Observation → immediate production baseline replacement
```

---

# 4. Phase 7.2 — Baseline Versioning

Every baseline must have a version.

Example:

```text
Asset: SERVER-01

Baseline v1
Baseline v2
Baseline v3
```

Store:

```text
baseline_id
asset_id
version
feature_schema_version
statistics
sample_count
confidence
created_at
promoted_at
previous_version
promotion_reason
```

Support:

```text
ROLLBACK
```

Example:

```text
v3
 ↓
bad behavior discovered
 ↓
rollback
 ↓
v2
```

---

# 5. Phase 7.3 — Add Learning Audit Logs

Every learning decision should be auditable.

Record:

```text
timestamp
asset
flow
observation
anomaly score
trust decision
learning decision
reason
baseline version
```

Example:

```text
2026-08-15 22:31

Asset: SERVER-01
Anomaly: 0.12
Trust: TRUSTED
Learn: YES
Baseline: v4
```

Suspicious example:

```text
Asset: SERVER-01
Anomaly: 0.94
Trust: SUSPICIOUS
Learn: NO
Reason: high behavioral deviation
```

---

# 6. Phase 8 — Integrate Behavioral Detection With Existing IDS

## Objective

Do not create a separate detection island.

Combine:

```text
Existing IDS
+
Behavioral Anomaly Engine
+
Existing Threat Intelligence
```

into one security event pipeline.

## Example

Existing IDS:

```text
Port scan detected
```

Behavioral engine:

```text
Connection pattern anomaly = 0.91
```

Threat intelligence:

```text
Source reputation = suspicious
```

Combined:

```text
Security Event
```

---

# 7. Phase 8.1 — Unified Security Event

Create a common event structure.

Suggested fields:

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

## Event sources

Support:

```text
firewall
IDS
IPS
anomaly
threat_intelligence
behavior
manual
```

---

# 8. Phase 8.2 — Detection Evidence

Every event should explain itself.

Example:

```text
EVENT #1042

Type:
Behavioral Anomaly

Asset:
SERVER-01

Anomaly:
0.94

Evidence:

- SSH connections 11.4× above baseline
- Destination count increased 8×
- Failed connection ratio increased
- Existing IDS detected reconnaissance
```

This is important for both analysts and future model evaluation.

---

# 9. Phase 8.3 — Integrate With Existing Threat Scoring

The current threat-scoring system should consume the new behavioral signal.

Example:

```text
Port scan                    +25
Behavioral anomaly           +18
Failed SSH connections       +20
Suspicious source            +15
Critical asset               +10
────────────────────────────────
Threat Score                  88
```

Do not replace the existing scoring logic blindly.

Extend it.

---

# 10. Phase 9 — Event Correlation

## Objective

Transform isolated alerts into meaningful security incidents.

Current:

```text
Alert
Alert
Alert
Alert
```

Target:

```text
             INCIDENT #1042
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
   Port Scan   SSH Failure   Anomaly
       │            │            │
       └────────────┼────────────┘
                    ↓
              Threat Score
```

---

# 11. Phase 9.1 — Correlation Rules

Correlate events using:

```text
same source
same target
same asset
time proximity
same service
related ports
related protocol
related indicators
attack-stage relationship
```

Example:

```text
19:31:02 Port scan
19:31:05 SSH discovery
19:31:09 Failed SSH attempts
19:31:15 Behavioral anomaly
```

These should become one incident rather than four unrelated alerts.

---

# 12. Phase 9.2 — Correlation Window

Create configurable time windows.

Example:

```text
30 seconds
1 minute
5 minutes
15 minutes
```

Avoid hard-coding one window.

Different attack patterns may require different windows.

---

# 13. Phase 9.3 — Correlation Confidence

Each correlated incident should have:

```text
correlation_confidence
```

Example:

```text
Incident confidence = 0.93
```

The system should also explain why the events were correlated.

---

# 14. Phase 10 — Incident Engine

## Objective

Create a first-class incident object.

Create:

```text
backend/engine/intelligence/incidents/
├── __init__.py
├── incident.py
├── incident_manager.py
├── incident_state.py
└── incident_lifecycle.py
```

## Incident lifecycle

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

## Incident data

Store:

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

---

# 15. Phase 10.1 — Incident Timeline

Create a chronological timeline.

Example:

```text
19:31:02
Recon detected

19:31:05
SSH service discovered

19:31:09
Repeated authentication failures

19:31:15
Behavior anomaly = 0.91

19:31:20
Threat score = 87

19:31:21
Temporary block executed

19:31:25
Attack traffic reduced by 98%
```

Every timeline item should link to the underlying event.

---

# 16. Phase 10.2 — Attack Story

Convert correlated evidence into a human-readable explanation.

Example:

```text
ATTACK STORY

1. Source began reconnaissance.
2. SSH service was identified.
3. Authentication failures increased.
4. Host behavior deviated from baseline.
5. Threat score exceeded the response threshold.
6. Temporary containment was recommended.
```

Do not invent attack stages without evidence.

---

# 17. Phase 11 — Adaptive Response Recommendation

## Objective

Move from:

```text
Detection
```

to:

```text
What should we do?
```

Create:

```text
backend/engine/response/
├── recommendation_engine.py
├── response_policy.py
├── safety_validator.py
└── action_catalog.py
```

Possible actions:

```text
MONITOR
LOG_MORE
RATE_LIMIT
TEMPORARY_BLOCK
TERMINATE_SESSION
QUARANTINE
```

---

# 18. Phase 11.1 — Response Decision Factors

The recommendation engine should consider:

```text
threat score
confidence
asset criticality
attack stage
current firewall policy
historical response effectiveness
availability impact
scope of the proposed action
```

Example:

```text
Threat Score: 92
Confidence: 0.94
Target: Critical Database

Recommendation:
TEMPORARY_BLOCK

Reason:
High confidence attack with limited expected availability impact.
```

---

# 19. Phase 11.2 — Response Safety Validator

Before any response:

```text
Recommendation
      ↓
Safety Validator
      ↓
Allowed?
 ┌────┴────┐
YES       NO
 ↓         ↓
Proceed   Reject / Human Review
```

Validate:

```text
scope
duration
asset criticality
existing exceptions
whitelist conflicts
policy conflicts
simulation result
automation permission
```

---

# 20. Phase 12 — Policy Simulator

## Objective

Determine the likely impact of a response before enforcing it.

Example:

```text
Candidate rule:

BLOCK
10.0.0.23
TCP/445
```

Run against historical traffic.

Output:

```text
Flows analyzed: 842,392

Matches: 3,241

Known malicious: 3,220
Potential legitimate: 21

Estimated false-block rate: 0.65%
```

Result:

```text
SAFE
```

---

# 21. Phase 12.1 — Simulation API

Create:

```text
POST /api/policies/simulate
```

Input:

```text
source
destination
port
protocol
action
duration
```

Output:

```text
matched_flows
malicious_matches
legitimate_matches
estimated_false_positive_rate
availability_impact
recommendation
```

---

# 22. Phase 12.2 — Simulation Decision

Possible results:

```text
SAFE
CAUTION
HIGH_RISK
```

Example:

```text
SAFE

Expected malicious reduction:
94%

Estimated legitimate disruption:
0.3%

Recommendation:
Proceed to shadow mode.
```

---

# 23. Phase 13 — Shadow Rules

## Objective

Test adaptive policies against live traffic without enforcing them.

```text
Candidate Rule
      ↓
SHADOW
      ↓
Evaluate Live Traffic
      ↓
Collect Evidence
      ↓
Validate
```

Example:

```text
Candidate:

BLOCK 10.0.0.23:445

Shadow matches:
3,241

Malicious:
3,220

Legitimate:
21
```

Then:

```text
SHADOW → ACTIVE
```

or:

```text
SHADOW → REJECTED
```

---

# 24. Phase 13.1 — Shadow Rule Lifecycle

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

Alternative:

```text
PROPOSED
 ↓
SIMULATED
 ↓
HIGH RISK
 ↓
REJECTED
```

Every transition must be logged.

---

# 25. Phase 14 — Response Verification

## Objective

Never assume that a firewall response worked.

Create:

```text
backend/engine/response/verification/
├── verifier.py
├── effectiveness.py
├── before_after.py
└── response_outcome.py
```

Example:

```text
BEFORE

823 packets/sec
```

Action:

```text
BLOCK
```

After:

```text
4 packets/sec
```

Result:

```text
99.5% reduction
SUCCESS
```

---

# 26. Phase 14.1 — Failed Response Detection

Example:

```text
BEFORE
823 packets/sec

BLOCK

AFTER
790 packets/sec
```

The system should mark:

```text
RESPONSE INEFFECTIVE
```

Then investigate:

```text
alternate source
alternate destination
alternate port
bypass path
rule mismatch
behavior change
```

This becomes a key input for future learning.

---

# 27. Phase 14.2 — Response Outcome Model

Use:

```text
SUCCESS
PARTIAL_SUCCESS
FAILED
FALSE_POSITIVE
BENIGN
UNKNOWN
```

Store:

```text
response_id
incident_id
action
before_metrics
after_metrics
effectiveness
outcome
verified_at
```

---

# 28. Phase 15 — Closed-Loop Learning

Once response verification works, connect it back to learning.

```text
Detection
 ↓
Decision
 ↓
Simulation
 ↓
Response
 ↓
Verification
 ↓
Outcome
 ↓
Learning Dataset
 ↓
Candidate Update
 ↓
Validation
 ↓
Promotion
```

This is the point where the system becomes a genuine closed-loop self-learning firewall.

---

# 29. Phase 15.1 — Feedback Learning

Allow analysts to label events:

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

Never immediately retrain production from a single label.

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

# 30. Phase 15.2 — Concept Drift

Detect legitimate changes in network behavior.

Example:

```text
Application deployment
 ↓
Traffic volume changes
 ↓
Baseline deviation
 ↓
Drift detected
 ↓
Observe stability
 ↓
Candidate baseline
 ↓
Validation
 ↓
Promotion
```

The system should not treat every major behavior change as an attack.

---

# 31. Phase 16 — Frontend: Security Intelligence Dashboard

Add the following pages/components:

```text
LearningCenter
BehaviorDashboard
IncidentList
IncidentDetail
IncidentTimeline
AdaptiveDefense
PolicySimulator
ResponseVerification
```

---

# 32. Learning Center

Show:

```text
Learning Mode:
ACTIVE

Assets:
24

Baselines:
21 READY
3 LEARNING

Observations:
1,842,220

Trusted:
1,795,103

Rejected:
47,117

Current baseline version:
v14
```

Also show:

```text
Why observations were rejected
```

---

# 33. Incident Dashboard

Show:

```text
Incident #1042

Threat Score:
91

Confidence:
94%

Source:
10.0.0.23

Target:
10.0.0.10

Attack Stage:
Recon → Credential Attack

Evidence:
- Port scan
- SSH failures
- Behavioral anomaly

Recommended:
Temporary block
```

---

# 34. Adaptive Defense Screen

Show:

```text
RECOMMENDED RESPONSE

Action:
TEMPORARY BLOCK

Simulation:
SAFE

Expected impact:
High mitigation
Low availability risk

Shadow rule:
READY

[ENTER SHADOW MODE]
[APPROVE]
[REJECT]
```

After enforcement:

```text
RESPONSE VERIFICATION

Before:
823 pps

After:
4 pps

Effectiveness:
99.5%

Status:
SUCCESS
```

---

# 35. API Changes

Add:

```text
GET  /api/baselines
GET  /api/baselines/<asset>

GET  /api/anomalies

POST /api/feedback

GET  /api/incidents
GET  /api/incidents/<id>
GET  /api/incidents/<id>/timeline

POST /api/policies/simulate
POST /api/policies/shadow
POST /api/policies/promote

GET  /api/responses
GET  /api/responses/<id>/verification

GET  /api/learning/status
GET  /api/learning/audit
GET  /api/drift
```

All policy-changing endpoints require authorization and audit logging.

---

# 36. WebSocket Events

Add:

```text
learning.observation
learning.rejected
baseline.updated
baseline.promoted
baseline.rollback

anomaly.detected

security_event.created

incident.created
incident.updated

response.recommended
response.simulated
response.shadowed
response.executed
response.verified

drift.detected
```

---

# 37. Testing Plan

## Unit tests

Test:

```text
TrustGate
PoisoningGuard
BaselineVersion
UnifiedEvent
ThreatScore
Correlation
Incident
Recommendation
SafetyValidator
PolicySimulator
ShadowRule
ResponseVerifier
```

## Integration test

Run:

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

# 38. Security Tests

Specifically test:

### Baseline poisoning

Gradually increase malicious behavior.

Expected:

```text
Baseline does not blindly follow attacker behavior.
```

### Suspicious observation learning

Expected:

```text
Detection = YES
Learning = NO
```

### Failed response

Expected:

```text
Response verification detects failure.
```

### Unsafe policy

Expected:

```text
Policy simulator/safety validator rejects or escalates.
```

### Intelligence failure

Expected:

```text
Learning/ML unavailable
BUT
deterministic firewall continues functioning.
```

---

# 39. Acceptance Criteria for This Entire Phase

This phase is complete only when the following works end-to-end:

```text
1. Normal traffic is learned. [VERIFIED]
2. Suspicious traffic is detected. [VERIFIED]
3. Suspicious traffic cannot automatically poison the production baseline. [VERIFIED - TrustGate & PoisoningGuard]
4. Behavioral anomalies are combined with existing IDS events. [VERIFIED - UnifiedSecurityEvent]
5. Multiple alerts become one incident. [VERIFIED - EventCorrelator]
6. Threat score explains its evidence. [VERIFIED - ExplainableThreatScorer]
7. Incident timeline is generated. [VERIFIED - Incident.generate_attack_story]
8. System recommends a response. [VERIFIED - AdaptiveDecisionEngine]
9. Candidate response can be simulated. [VERIFIED - PolicySimulator]
10. Candidate response can enter shadow mode. [VERIFIED - ShadowRuleEvaluator]
11. Approved response can be enforced. [VERIFIED - IPSResponder & BlockManager]
12. Response effectiveness is measured. [VERIFIED - ResponseVerifier]
13. Failed responses are detected. [VERIFIED - ResponseVerifier failure cause analysis]
14. Verified outcomes are recorded. [VERIFIED - Closed-Loop Outcome Logger]
15. Verified outcomes can enter controlled learning. [VERIFIED - FeedbackManager & AuditLogger]
```

---

# 40. What NOT to Implement Yet

Do not start these until the above phase is stable:

```text
❌ Reinforcement learning
❌ Large language model decision-making
❌ Complex deep learning
❌ Autonomous unrestricted blocking
❌ Attack prediction
❌ Graph neural networks
❌ Large distributed infrastructure
```

The foundation must first prove that:

```text
learning
+
detection
+
correlation
+
response
+
verification
```

works reliably.

---

# 41. Exact Next Sprint

Start with **Sprint 1 of this plan**:

## Secure Learning Sprint

### Task 1
Implement `TrustGate`.

### Task 2
Implement `ObservationValidator`.

### Task 3
Implement `PoisoningGuard`.

### Task 4
Add `learn_allowed` to the learning pipeline.

### Task 5
Ensure suspicious observations are detected but not learned.

### Task 6
Add baseline versioning.

### Task 7
Add rollback.

### Task 8
Add learning audit logs.

### Task 9
Write poisoning tests.

### Task 10
Run normal and suspicious traffic through the system.

### Final verification

Confirm:

```text
NORMAL TRAFFIC
→ LEARN = YES

SUSPICIOUS TRAFFIC
→ DETECT = YES
→ LEARN = NO

KNOWN MALICIOUS
→ DETECT = YES
→ LEARN = NO
```

Only after this passes should the project move to:

```text
Behavioral Detection
        ↓
Unified Security Events
        ↓
Threat Scoring
        ↓
Event Correlation
```

---

# 42. Next Major Milestone

After this plan is completed, the architecture should look like:

```text
                 SMART FIREWALL
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
 DETERMINISTIC CORE            LEARNING ENGINE
        │                             │
 Firewall                      Baselines
 IDS                           Anomaly
 IPS                           Drift
 Rules                         Feedback
        │                             │
        └──────────────┬──────────────┘
                       ↓
                SECURITY EVENTS
                       ↓
                THREAT SCORING
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
                  ENFORCEMENT
                       ↓
                 VERIFICATION
                       ↓
                  OUTCOME
                       ↓
                  LEARNING
```

The immediate objective is therefore **not another AI model**.

The immediate objective is to make the existing learning engine **secure, explainable, and operationally connected to the firewall/IDS/IPS pipeline**.

Once this phase is complete, the project will be ready for the next major layer: **Adaptive Defense + Attack Understanding**.
