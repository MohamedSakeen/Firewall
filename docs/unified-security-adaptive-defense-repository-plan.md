# Repository-Specific Implementation Plan — Unified Security Intelligence & Adaptive Defense

## 1. Current Architecture Overview

The system consists of a Python 3.10+ Scapy/Flask/Socket.IO backend and a React 19 / Vite / Tailwind CSS / Recharts frontend.

```text
NIC (Layer 3/4 Raw Packets)
  ↓
[Sniffer Engine] (scapy + Npcap)
  ↓
[Packet Normalizer] (engine/packet/packet_normalizer.py)
  ↓
┌────────────────────────────────────────────────────────┐
│ Deterministic Security Core                            │
│ Stateful Firewall (engine/firewall/)                   │
│ Intrusion Detection System (engine/IDS/)               │
│ Intrusion Prevention System (engine/IPS/)              │
└────────────────────────────────────────────────────────┘
  +
┌────────────────────────────────────────────────────────┐
│ Self-Learning Intelligence Core                        │
│ Flow Engine (engine/flow/)                             │
│ Feature Engine (engine/features/)                      │
│ Baseline Engine (engine/learning/baseline/)            │
│ Anomaly Detector (engine/detection/anomaly/)           │
│ Trust Gate & Poisoning Guard (engine/learning/security/)│
└────────────────────────────────────────────────────────┘
  ↓
[Unified Event Pipeline] (engine/detection/anomaly/unified_event.py)
  ↓
[Explainable Threat Scorer] (engine/scoring/explainable_scorer.py)
  ↓
[Event Correlator & Incident Engine] (engine/intelligence/correlation/ & engine/intelligence/incidents/)
  ↓
[Adaptive Response Engine & Safety Validator] (engine/response/)
  ↓
[Policy Simulator & Shadow Rules] (engine/response/simulator/ & engine/response/shadow/)
  ↓
[IPS Blocker & Response Verifier] (engine/IPS/ & engine/response/verification/)
  ↓
[Closed-Loop Learning & Audit Logger] (engine/learning/feedback/ & engine/learning/security/)
  ↓
[REST APIs & Socket.IO Broadcaster] (backend/api/)
  ↓
[React SOC Dashboard] (frontend/src/pages/)
```

---

## 2. Safety & Fallback Principles

1. **Deterministic Core Independence:** If the intelligence, baseline, or anomaly detection modules crash or throw exceptions, the deterministic stateful firewall, signature-based IDS, and active IPS blocker continue operating uninterrupted.
2. **Inference vs Observation Clarity:** Telemetry alerts report strictly observed data (`OBSERVED`), while attack stage classifications are flagged as (`INFERRED`).
3. **Anti-Poisoning Gating:** High-anomaly or suspicious observations are detected but rejected from updating production baselines.
4. **Reversible Enforcement:** All automated adaptive actions (temporary blocks, rate limits, quarantines) have bounded durations and manual rollback capabilities.

---

## 3. Component Mapping & Reusability Matrix

| Subsystem | Location | Status | Action Required |
| :--- | :--- | :--- | :--- |
| **Sniffer & Normalizer** | `backend/sniffer/`, `backend/engine/packet/` | Functional | Reused directly |
| **Stateful Firewall** | `backend/engine/firewall/` | Functional | Safety fallback verified |
| **IDS Detection** | `backend/engine/IDS/` | Functional | Integrated into Unified Security Events |
| **Flow & Feature Engine** | `backend/engine/flow/`, `backend/engine/features/` | Functional | Feeds anomaly detector |
| **Trust Gate & Anti-Poisoning** | `backend/engine/learning/security/` | Functional | Audited and verified |
| **Unified Security Event** | `backend/engine/detection/anomaly/` | Functional | Extended with structured evidence |
| **Explainable Threat Scorer**| `backend/engine/scoring/` | Functional | Provides score component breakdowns |
| **Event Correlator & Incidents**| `backend/engine/intelligence/` | Functional | Generates timelines & attack stories |
| **Response Safety Validator**| `backend/engine/response/` | Functional | Enforces whitelist & risk controls |
| **Policy Simulator & Shadow** | `backend/engine/response/` | Functional | Evaluates SAFE / CAUTION / HIGH_RISK |
| **Response Verifier** | `backend/engine/response/verification/` | Functional | Detects RESPONSE INEFFECTIVE & cause |
| **Analyst Feedback** | `backend/engine/learning/feedback/` | Functional | Queues verified datasets |
| **APIs & WebSockets** | `backend/api/` | Functional | Extended with security-events route |
| **Frontend SOC Dashboard** | `frontend/src/` | Functional | Add SecurityEventsView page |

---

## 4. Potential Risks & Mitigation Strategy

- **Risk:** High packet volume causing WebSocket UI latency.
  - **Mitigation:** Bounded event queues, client-side pagination, and throttle limits on WebSocket broadcasts.
- **Risk:** Baseline poisoning via slow incremental behavioral drift.
  - **Mitigation:** PoisoningGuard step-clamping (`max_delta_pct=0.25`) + TrustGate anomaly thresholds.
- **Risk:** False-positive automated blocks on critical infrastructure.
  - **Mitigation:** ResponseSafetyValidator protects whitelists and requires human approval for CRITICAL assets.
