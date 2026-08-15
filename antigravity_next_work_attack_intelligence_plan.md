# Antigravity — Next Work Implementation Plan
## Phase: Attack Understanding, Threat Hunting, Prediction Foundation & Security Intelligence

### Project

Smart Self-Learning Firewall

### Purpose

This plan is the **next implementation phase after Adaptive Defense and Closed-Loop Learning**.

The previous phase established:

```text
Flow Engine
→ Feature Engine
→ Learning / Baselines
→ Anomaly Detection
→ Secure Learning
→ Unified Security Events
→ Explainable Threat Scoring
→ Event Correlation
→ Incident Engine
→ Attack Timeline
→ Response Recommendation
→ Policy Simulation
→ Shadow Rules
→ Controlled Enforcement
→ Response Verification
→ Closed-Loop Learning
```

The next goal is to make the firewall understand **what an attacker is doing, how an attack is progressing, what assets are involved, what the attacker may do next, and where defenders should investigate first**.

Target:

```text
SECURITY EVENTS
      ↓
INCIDENT
      ↓
ATTACK GRAPH
      ↓
ATTACK STAGE MODEL
      ↓
ATTACK STORY
      ↓
THREAT HUNTING
      ↓
NEXT-STAGE RISK
      ↓
PREDICTION
      ↓
DEFENSIVE PRIORITY
```

## Critical instruction

Do NOT jump directly into a complex ML model.

The system must first create reliable structured data for:

- incidents
- attack stages
- assets
- relationships
- verified outcomes
- response effectiveness
- analyst feedback

Only then should prediction/ML be introduced.

---

# 1. Mandatory Repository Audit

Before implementation, inspect the current repository and identify the actual implementations of:

- SecurityEvent
- Incident
- IncidentTimeline
- ThreatScore
- Correlation Engine
- Response Recommendation
- Policy Simulator
- Shadow Rules
- Response Verification
- Learning Engine
- Baseline Engine
- Feedback
- Drift Detection
- Asset inventory
- Firewall rules
- IDS/IPS detections
- API
- WebSocket/Socket.IO
- Frontend incident views
- Persistence layer
- Existing tests

Do not assume the previous architecture document exactly matches the current code.

## Required first deliverable from Antigravity

Produce:

```text
1. Current architecture
2. Existing attack/incident data
3. Existing asset information
4. Existing relationships that can be reused
5. Missing capabilities
6. Required schema changes
7. Required backend changes
8. Required frontend changes
9. Required API changes
10. Required tests
11. Security risks
12. Migration strategy
```

Then implement incrementally.

---

# 2. Main Objective

Transform:

```text
INCIDENT
```

into:

```text
UNDERSTOOD ATTACK
```

Example:

```text
Attacker
   ↓
Reconnaissance
   ↓
Port Scan
   ↓
Service Discovery
   ↓
Credential Attack
   ↓
Compromise
   ↓
Lateral Movement
```

The system must distinguish:

```text
OBSERVED
```

from:

```text
INFERRED
```

and:

```text
PREDICTED
```

These must never be presented as equivalent.

---

# 3. Phase 1 — Asset Intelligence

## Goal

Build a reliable representation of network assets.

If an asset inventory already exists, extend it instead of creating another one.

Required logical fields:

```text
asset_id
ip_address
hostname
role
criticality
network_segment
known_services
known_protocols
known_peers
first_seen
last_seen
status
baseline_version
```

Possible roles:

```text
workstation
server
database
router
gateway
printer
iot
unknown
```

Do not force an asset into a role when evidence is insufficient.

Use:

```text
unknown
```

rather than guessing.

---

# 4. Phase 2 — Asset Relationship Engine

Create relationships between entities.

Example:

```text
WORKSTATION-01
      │
      ├── communicates_with → SERVER-01
      ├── communicates_with → DNS-01
      └── communicates_with → INTERNET
```

Relationships can include:

```text
communicates_with
scanned
attacked
served_by
resolved_by
authenticated_to
blocked_by
triggered
contained_by
```

Each relationship should have:

```text
source
target
relationship_type
first_seen
last_seen
confidence
evidence
```

Do not create relationships without telemetry.

---

# 5. Phase 3 — Attack Graph

## Goal

Represent an incident as a graph instead of only a list of alerts.

Create or extend:

```text
backend/engine/intelligence/attack_graph/
├── graph.py
├── node.py
├── edge.py
├── graph_builder.py
└── graph_serializer.py
```

## Nodes

Support:

```text
attacker/source
asset
service
flow
security event
incident
attack stage
response
```

## Edges

Support:

```text
communicated_with
scanned
targeted
triggered
followed_by
affected
blocked_by
responded_to
```

Example:

```text
10.0.0.23
    │
    │ scanned
    ▼
SERVER-01
    │
    │ exposed
    ▼
SSH
    │
    │ targeted
    ▼
Credential Attack
```

---

# 6. Phase 4 — Attack Graph Evidence

Every graph edge must have supporting evidence.

Example:

```text
Edge:
10.0.0.23 → SERVER-01

Relationship:
scanned

Evidence:
- 421 connection attempts
- 37 destination ports
- 8-second interval
- IDS scan detection
```

Do not build an opaque graph.

The analyst must be able to ask:

> Why does the system believe these two entities are related?

and receive evidence.

---

# 7. Phase 5 — Attack Stage Model

Create a controlled vocabulary for attack stages.

Start small.

Example:

```text
RECONNAISSANCE
SERVICE_DISCOVERY
INITIAL_ACCESS
CREDENTIAL_ATTACK
EXECUTION
PERSISTENCE
PRIVILEGE_ESCALATION
LATERAL_MOVEMENT
COMMAND_AND_CONTROL
DATA_ACCESS
EXFILTRATION
IMPACT
UNKNOWN
```

Do not attempt to perfectly classify every attack initially.

---

# 8. Phase 6 — Stage Evidence Engine

For each possible stage, define evidence.

Example:

```text
CREDENTIAL_ATTACK

Evidence:
- repeated authentication failures
- credential-related IDS alert
- unusual login frequency
- abnormal source/destination relationship
```

Another example:

```text
RECONNAISSANCE

Evidence:
- high destination-port diversity
- high connection burst
- multiple services probed
- scan signature
```

The stage engine should return:

```text
stage
confidence
observed_evidence[]
inference_level
```

Example:

```text
Stage:
RECONNAISSANCE

Confidence:
0.93

Evidence:
4

Inference:
SUPPORTED
```

---

# 9. Phase 7 — Stage Transition Engine

Model attack progression.

Example:

```text
RECONNAISSANCE
      ↓
SERVICE_DISCOVERY
      ↓
INITIAL_ACCESS
      ↓
CREDENTIAL_ATTACK
```

Create:

```text
backend/engine/intelligence/attack_stage/
├── stage_model.py
├── stage_detector.py
├── transition_engine.py
└── stage_evidence.py
```

The engine should detect:

```text
current stage
previous stage
stage transition
confidence
evidence
```

Do not claim a stage transition when the evidence is weak.

---

# 10. Phase 8 — Attack Timeline Upgrade

Upgrade the existing incident timeline.

Instead of:

```text
19:31 Alert
19:32 Alert
19:33 Alert
```

show:

```text
19:31:02
RECONNAISSANCE
Port scan detected

19:31:05
SERVICE DISCOVERY
SSH discovered

19:31:09
CREDENTIAL ATTACK
Repeated authentication failures

19:31:15
BEHAVIORAL ANOMALY
Connection frequency 11.4× baseline
```

Each entry must link to:

```text
event
flow
asset
evidence
stage
```

---

# 11. Phase 9 — Threat Hunting Engine

## Goal

Allow analysts to investigate the network around an incident.

Create or extend:

```text
backend/engine/hunting/
├── query_engine.py
├── filters.py
├── pivots.py
└── hunt_result.py
```

Support investigation by:

```text
source IP
destination IP
asset
port
protocol
flow
incident
event
time range
threat score
anomaly score
attack stage
```

---

# 12. Phase 10 — Investigation Pivots

The analyst should be able to pivot:

```text
IP
 ↓
Flows
 ↓
Events
 ↓
Incidents
 ↓
Assets
 ↓
Other communicating hosts
```

Example:

```text
10.0.0.23
    ↓
all flows
    ↓
SERVER-01
SERVER-02
WORKSTATION-04
    ↓
related incidents
```

This should become a central SOC investigation capability.

---

# 13. Phase 11 — Threat-Hunting Queries

Support reusable queries such as:

```text
Find all assets with unusual outbound traffic.

Find hosts contacting more destinations than their baseline.

Find assets with repeated failed authentication.

Find sources scanning multiple internal assets.

Find anomalies involving critical assets.

Find incidents with failed response verification.

Find newly observed communication relationships.
```

Queries should operate on structured telemetry rather than requiring analysts to manually inspect raw logs.

---

# 14. Phase 12 — Attack Pattern Library

Create a small deterministic attack-pattern library.

Example patterns:

```text
Port Scan
Brute Force
Network Sweep
Service Enumeration
Abnormal Outbound Traffic
Repeated Failed Connections
Possible Lateral Movement
Possible Command-and-Control
```

Each pattern should define:

```text
required evidence
supporting evidence
confidence calculation
possible stage
```

This is NOT yet a machine-learning model.

It provides explainable attack understanding.

---

# 15. Phase 13 — Historical Incident Learning

Use verified incidents to build historical knowledge.

Store:

```text
incident_id
attack_pattern
attack_stages
affected_assets
source_behavior
response
response_effectiveness
analyst_feedback
final_outcome
```

Example:

```text
Incident #1042

Pattern:
SSH Brute Force

Stages:
Recon
→ Service Discovery
→ Credential Attack

Response:
Temporary Block

Effectiveness:
99.5%

Outcome:
SUCCESS
```

This dataset becomes the foundation for future prediction.

---

# 16. Phase 14 — Response Effectiveness Knowledge

The system should learn:

```text
Which response works?
Against what behavior?
Against which asset type?
Under what conditions?
```

Example:

```text
Temporary Block

Past incidents:
42

Successful:
39

Partial:
2

Failed:
1

Effectiveness:
92.8%
```

Do not automatically treat historical success as a guarantee.

Use it as evidence for future recommendations.

---

# 17. Phase 15 — Counterfactual Defense Analysis

Introduce:

> "What would happen if we chose another response?"

Example:

```text
Current recommendation:
BLOCK

Alternative:
RATE_LIMIT

Simulation:

BLOCK:
Expected mitigation = 97%
Availability impact = medium

RATE_LIMIT:
Expected mitigation = 73%
Availability impact = low
```

The system can then explain the trade-off.

This is a major differentiator from a basic IDS.

---

# 18. Phase 16 — Defensive Priority Engine

When multiple incidents exist, determine which one deserves attention first.

Inputs:

```text
threat score
confidence
asset criticality
attack stage
affected asset count
response failure
lateral movement evidence
data sensitivity
```

Output:

```text
Priority:
CRITICAL

Reason:
High-confidence active attack against critical asset with failed containment.
```

Do not only sort by raw threat score.

---

# 19. Phase 17 — Prediction Dataset

Before implementing prediction, create a clean dataset from verified history.

Each training/example record should contain:

```text
incident state
current attack stage
previous stages
source behavior
target asset
asset role
services
anomaly features
threat score
related events
previous response
response result
final outcome
```

Label:

```text
next observed stage
```

Example:

```text
Current:
SERVICE_DISCOVERY

Next observed:
CREDENTIAL_ATTACK
```

Only use sufficiently verified incidents.

---

# 20. Phase 18 — Prediction Shadow Mode

Do NOT allow prediction to control the firewall.

Run:

```text
Current Incident
      ↓
Prediction Engine
      ↓
Predicted Next Stage
      ↓
Store
      ↓
Compare With Reality
```

Example:

```text
Prediction:

Credential Attack:
68%

Lateral Movement:
21%

Other:
11%
```

Then wait for subsequent telemetry.

Measure whether the prediction was correct.

---

# 21. Phase 19 — Prediction Metrics

Track:

```text
Top-1 accuracy
Top-3 accuracy
precision
recall
confusion matrix
prediction latency
false prediction rate
```

Also track:

```text
confidence calibration
```

Do not judge the prediction engine only by accuracy.

---

# 22. Phase 20 — First ML Model

Only after deterministic attack-stage modeling and the prediction dataset are stable.

Start simple.

Candidate approaches:

```text
Logistic Regression
Random Forest
Gradient Boosting
simple sequence model
```

The model should initially predict:

```text
next likely attack stage
```

not:

```text
"this is definitely malicious"
```

The existing deterministic detectors remain authoritative security signals.

---

# 23. Phase 21 — ML Shadow Deployment

The first ML model must operate in:

```text
SHADOW
```

mode.

Architecture:

```text
Incident
 ↓
Deterministic Stage Engine
 ↓
ML Prediction
 ↓
Compare
 ↓
Store Metrics
```

The ML model must not automatically:

```text
block
quarantine
delete
change policy
```

---

# 24. Phase 22 — Prediction-Assisted Defense

Only after sufficient validation:

```text
Current Attack Stage
        +
Predicted Next Stage
        +
Threat Score
        +
Asset Criticality
        ↓
Defensive Priority
```

Example:

```text
Current:
Credential Attack

Predicted:
Lateral Movement = 72%

Affected:
Critical Server

Action:
Increase monitoring on internal east-west traffic.
```

Prediction should initially increase observation and preparedness rather than trigger destructive actions.

---

# 25. Phase 23 — Deception / Canary Foundation

After prediction is stable, introduce controlled deception as an optional security layer.

Potential defensive assets:

```text
decoy service
canary account
decoy host
decoy port
```

The objective:

```text
Attacker interacts with decoy
        ↓
High-confidence signal
        ↓
Incident enrichment
```

Do not deploy deception blindly into production.

It must be isolated and explicitly configured.

---

# 26. Phase 24 — Attack Graph Frontend

Add a visual investigation interface.

Show:

```text
Attacker
   ↓
Source
   ↓
Target
   ↓
Service
   ↓
Attack Stage
   ↓
Incident
   ↓
Response
```

Allow clicking nodes to inspect:

```text
events
flows
evidence
baseline
timeline
response
```

Do not make the graph purely decorative.

Every node must provide useful investigation context.

---

# 27. Phase 25 — Threat Hunting Frontend

Create:

```text
Threat Hunt
```

UI:

```text
Filters
────────────────────────
Source
Target
Asset
Port
Protocol
Time
Threat Score
Anomaly Score
Attack Stage

        [SEARCH]

Results
────────────────────────
Flows
Events
Incidents
Assets
```

Allow pivots:

```text
Open Incident
Open Asset
Open Flow
Open Timeline
Open Attack Graph
```

---

# 28. Phase 26 — Intelligence Dashboard

Create a high-level view:

```text
NETWORK SECURITY INTELLIGENCE

Active Incidents       4
Critical Assets        7
High Anomalies         13
Active Responses       2
Failed Responses       1

Current Attack Stages

Recon                  3
Credential Attack      2
Lateral Movement       1

Prediction

Next-stage risk:
Lateral Movement       72%

Response effectiveness:
94.2%
```

Keep the dashboard evidence-driven.

---

# 29. Phase 27 — Security Hardening

Test the new intelligence layer against:

```text
graph poisoning
false relationship creation
event flooding
prediction manipulation
malicious feedback
dataset poisoning
API abuse
authorization bypass
information leakage
resource exhaustion
```

Ensure:

```text
prediction failure
≠
firewall failure
```

---

# 30. Phase 28 — Testing Strategy

## Unit tests

Test:

```text
Asset
AssetRelationship
AttackGraph
AttackStage
StageEvidence
StageTransition
ThreatHuntQuery
AttackPattern
ResponseEffectiveness
PredictionDataset
PredictionMetrics
```

## Integration tests

Test:

```text
Security Events
 ↓
Incident
 ↓
Attack Graph
 ↓
Stage Detection
 ↓
Threat Hunting
 ↓
Prediction
 ↓
Defensive Priority
```

## Regression

Existing tests must continue passing:

```text
Firewall
IDS
IPS
Learning
Baseline
Anomaly
Correlation
Response
Verification
API
Frontend
```

---

# 31. Phase 29 — Required Demonstrations

## Demo 1 — Multi-stage attack

```text
Recon
 ↓
Service Discovery
 ↓
Credential Attack
 ↓
Behavioral Anomaly
 ↓
Incident
 ↓
Attack Graph
```

The UI must show the entire chain.

## Demo 2 — Threat Hunt

Start with:

```text
Source IP
```

Pivot:

```text
Flows
 ↓
Assets
 ↓
Events
 ↓
Incidents
 ↓
Attack Graph
```

## Demo 3 — Failed defense

```text
Attack
 ↓
Response
 ↓
Verification FAILED
 ↓
Priority increases
 ↓
Further investigation
```

## Demo 4 — Prediction

```text
Current stage:
Credential Attack

Prediction:
Lateral Movement = 72%

Wait for subsequent telemetry.

Compare prediction vs actual outcome.
```

## Demo 5 — Legitimate behavior

Ensure a legitimate unusual event is not automatically turned into a confirmed attack stage.

---

# 32. Phase 30 — Acceptance Criteria

Do not declare this phase complete until:

```text
- [x] Asset intelligence works
- [x] Asset relationships are evidence-backed
- [x] Attack graph works
- [x] Graph edges have evidence
- [x] Attack stages are modeled
- [x] Stage transitions are tracked
- [x] Observed vs inferred vs predicted is distinguished
- [x] Timeline includes attack stages
- [x] Threat hunting works
- [x] Investigation pivots work
- [x] Attack patterns are explainable
- [x] Historical incidents are stored
- [x] Response effectiveness is measurable
- [x] Counterfactual response analysis works
- [x] Defensive priority works
- [x] Prediction dataset is generated
- [x] Prediction operates in shadow mode
- [x] Prediction metrics are measured
- [x] ML model is not controlling enforcement
- [x] Frontend graph works
- [x] Threat hunting UI works
- [x] Intelligence dashboard works
- [x] Security tests pass
- [x] Performance is measured
- [x] Existing firewall/IDS/IPS behavior remains stable
```

---

# 33. Exact Implementation Order

Antigravity should implement in this order:

```text
STEP 1
Repository Audit

STEP 2
Asset Intelligence

STEP 3
Asset Relationships

STEP 4
Attack Graph Backend

STEP 5
Attack Graph Evidence

STEP 6
Attack Stage Model

STEP 7
Stage Evidence Engine

STEP 8
Stage Transition Engine

STEP 9
Incident Timeline Upgrade

STEP 10
Attack Story

STEP 11
Threat Hunting Backend

STEP 12
Investigation Pivots

STEP 13
Attack Pattern Library

STEP 14
Historical Incident Dataset

STEP 15
Response Effectiveness Knowledge

STEP 16
Counterfactual Defense

STEP 17
Defensive Priority

STEP 18
Prediction Dataset

STEP 19
Prediction Shadow Engine

STEP 20
Prediction Metrics

STEP 21
First Simple ML Model

STEP 22
ML Shadow Deployment

STEP 23
Prediction-Assisted Defense

STEP 24
Attack Graph Frontend

STEP 25
Threat Hunting Frontend

STEP 26
Intelligence Dashboard

STEP 27
Security Hardening

STEP 28
End-to-End Validation
```

Do not skip directly from Incident Engine to advanced ML.

---

# 34. What This Phase Adds to the Project

Before:

```text
The firewall knows:
"This traffic is suspicious."
```

After this phase:

```text
The firewall knows:

Who is involved
↓
Which assets are affected
↓
What happened
↓
What attack stage is supported by evidence
↓
How events are related
↓
What happened previously
↓
Which response worked historically
↓
What may happen next
↓
Where defenders should focus
```

That is the transition from:

```text
SMART DETECTION
```

to:

```text
SECURITY INTELLIGENCE
```

---

# 35. Important Boundary

The prediction system must remain advisory until it has sufficient measured validation.

The authoritative chain remains:

```text
Deterministic Detection
+
Behavioral Evidence
+
Threat Scoring
+
Safety Policy
```

Prediction may influence:

```text
priority
monitoring
investigation
recommendation
```

but must not independently override:

```text
firewall policy
security controls
safety validation
```

---

# 36. Final Antigravity Instruction

Treat this document as an implementation specification.

Before coding:

1. Audit the repository.
2. Identify what already exists.
3. Reuse existing abstractions.
4. Produce a repository-specific implementation plan.
5. Implement one phase at a time.
6. Test after every phase.
7. Preserve deterministic firewall behavior.
8. Keep attack explanations evidence-backed.
9. Clearly distinguish observed, inferred and predicted information.
10. Keep ML in shadow mode until validated.
11. Do not introduce unnecessary infrastructure.
12. Do not claim completion without the acceptance criteria.

At the end, report:

```text
Files created
Files modified
Database changes
API changes
WebSocket changes
Frontend changes
Tests added
Tests passed
Manual demonstrations
Performance results
Security findings
Known limitations
Next recommended phase
```

## Core evolution

```text
DETECT
   ↓
UNDERSTAND
   ↓
CORRELATE
   ↓
VISUALIZE
   ↓
HUNT
   ↓
PREDICT
   ↓
PRIORITIZE
   ↓
DEFEND
   ↓
VERIFY
   ↓
LEARN
```

The objective is to turn the firewall into a continuously improving **security intelligence and defense platform**, while keeping its deterministic security controls reliable, explainable, auditable and reversible.
