# Repository Implementation Plan — Attack Understanding, Threat Hunting & Prediction Shadow Engine

## 1. Current Architecture & State
- **Backend:** Python 3.10+ Scapy/Flask/Socket.IO with stateful firewall, signature IDS, IPS blocker, flow tracker, baseline engine, trust gate, unified security events, explainable threat scoring, event correlator, incident manager, response safety validator, policy simulator, shadow rules evaluator, and response verifier.
- **Frontend:** React 19 + Vite + Tailwind CSS + Recharts SOC Dashboard with pages for Dashboard, Security Events, Self-Learning Baselines, Adaptive Defense, Threat Hunting, Incidents, Attack Graph, Policy Simulator, Asset Inventory, Model Health, Firewall, IDS, IPS, Packets, Traffic, Rules, Logs, and Settings.

---

## 2. Existing Attack, Incident & Asset Components
- **Assets:** `AssetManager` (`engine/intelligence/assets/asset_manager.py`) tracks IP, hostname, role, criticality, segment, owner.
- **Incidents:** `Incident` & `EventCorrelator` (`engine/intelligence/incidents/` & `engine/intelligence/correlation/`) manage incident objects, stages, timelines, and attack stories.
- **Attack Graph:** `GraphBuilder` (`engine/intelligence/attack_graph/graph_builder.py`) builds node and edge structures.
- **Hunting:** `ThreatHuntingEngine` (`engine/hunting/hunting_engine.py`) provides query search capabilities across telemetry.

---

## 3. Required Enhancements & New Modules
1. **Asset Relationship Engine (`engine/intelligence/assets/relationship_engine.py`):** Structured evidence-backed entity relationships (`communicates_with`, `scanned`, `attacked`, `served_by`, `authenticated_to`, `blocked_by`, `triggered`, `contained_by`).
2. **Attack Stage & Transition Model (`engine/intelligence/attack_stage/`):**
   - Stage vocabulary (`RECONNAISSANCE`, `SERVICE_DISCOVERY`, `INITIAL_ACCESS`, `CREDENTIAL_ATTACK`, `EXECUTION`, `PERSISTENCE`, `PRIVILEGE_ESCALATION`, `LATERAL_MOVEMENT`, `COMMAND_AND_CONTROL`, `DATA_ACCESS`, `EXFILTRATION`, `IMPACT`, `UNKNOWN`).
   - Clear classification tags: `OBSERVED` vs `INFERRED` vs `PREDICTED`.
   - Transition engine tracking stage progression with confidence scores and evidence.
3. **Defensive Priority Engine (`engine/intelligence/priority_engine.py`):** Dynamic prioritization of active incidents based on threat score, criticality, containment failure, and lateral movement.
4. **Counterfactual Defense Engine (`engine/response/counterfactual.py`):** Evaluates trade-offs between alternative defense actions (e.g. `BLOCK` vs `RATE_LIMIT`).
5. **Prediction Shadow Engine (`engine/intelligence/prediction/prediction_engine.py`):** Predicts next-stage attack risk in advisory `SHADOW` mode only, measuring top-1/top-3 accuracy and calibration metrics without overriding firewall policy.
6. **Deception & Canary Engine (`engine/deception/honeypot_manager.py`):** Decoy ports, decoy services, and canary accounts producing high-confidence security alerts.
7. **Extended Threat Hunting & Pivots (`engine/hunting/`):** Advanced pivots (IP -> Flows -> Events -> Incidents -> Assets -> Communicating hosts) and pre-built hunting query templates.

---

## 4. API & WebSocket Schema Changes
- `POST /api/assets/relationships`: Add/query asset relationships with evidence.
- `GET /api/incidents/<id>/stage-transition`: Inspect stage transitions and confidence.
- `POST /api/incidents/<id>/predict`: Execute shadow prediction for next attack stage.
- `POST /api/response/counterfactual`: Compare trade-offs between alternative actions.
- `GET /api/deception/decoys`: Manage active honeypots and canary triggers.
- WebSockets: Emit `attack.stage.changed`, `prediction.updated`, `graph.updated`, `priority.updated`.

---

## 5. Security & Migration Safeguards
- **Shadow Mode Isolation:** ML prediction operates in shadow advisory mode only; deterministic firewall and safety validator remain authoritative.
- **Evidence Requirement:** No relationship, graph edge, or attack stage inference is stored without supporting telemetry evidence.
