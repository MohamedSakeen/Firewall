# NetGuard AI — Smart Firewall, IDS & IPS Suite

A full-stack, self-learning network security platform that combines **deep packet inspection (DPI)**, a **stateful firewall**, **signature- and anomaly-based Intrusion Detection (IDS)**, and **automated Intrusion Prevention (IPS)** with a real-time SOC dashboard.

The backend captures live traffic with Scapy/Npcap, normalizes and evaluates every packet, raises and correlates security events, and streams telemetry to a React dashboard over Socket.IO. On top of the classic firewall/IDS/IPS pipeline, the suite adds adaptive defense capabilities: behavioral baselines, model health monitoring, attack-graph correlation, incident prediction, policy simulation, threat hunting, deception (honeypots), and autonomous response with safety guardrails.

> **Intended use:** local network monitoring, security research, and lab/education environments. See [Security & Operational Notes](#security--operational-notes) before exposing any component beyond localhost.

---

## Table of Contents

- [Features & Use Cases](#features--use-cases)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Running the Application](#running-the-application)
- [Dashboard Pages](#dashboard-pages)
- [REST API & WebSocket Reference](#rest-api--websocket-reference)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Troubleshooting](#troubleshooting)
- [Security & Operational Notes](#security--operational-notes)
- [Documentation & Design References](#documentation--design-references)

---

## Features & Use Cases

**Core defense pipeline**
- Live packet capture and normalization (IP/TCP/UDP/ICMP metadata, TCP flags, payload sizes).
- Stateful firewall evaluation with connection/session tracking and configurable inbound/outbound rules.
- IDS detection for port scans, SYN/UDP floods, and suspicious authentication patterns, with sliding time windows and threat scoring.
- IPS response: temporary/permanent bans, quarantine, whitelists, escalation of repeated low-severity alerts, and unblock timers.
- Deep packet inspection viewer with raw byte/hex and TCP flag breakdowns.

**Adaptive / self-learning intelligence**
- Statistical and contextual anomaly detection, feature engineering, and unified event correlation.
- Per-asset behavioral baselines with drift detection, feedback loops, trust gates, and poisoning guards.
- Attack-stage detection, attack graphs, incident correlation/prioritization, and next-stage prediction.
- Explainable threat scoring, model governance, and health/self-monitoring.

**Autonomous response & assurance**
- Autonomy levels with kill switch, rollback, shadow evaluation, policy simulation, and counterfactual analysis.
- Response verification, safety validation, deception/honeypot integration, and forensic replay/timeline labs.

**Typical use cases**
- Learning how firewalls, IDS, and IPS work end-to-end with live traffic.
- Monitoring a lab network from a single SOC-style dashboard.
- Experimenting with adaptive defense, anomaly detection, and automated response policies in a safe environment.

---

## Architecture

```text
Network traffic (NIC)
        │  raw capture via Scapy + Npcap
        ▼
Backend sniffer ──► packet normalizer / feature extractor
        │
        ├──► stateful firewall engine (allow / drop / block)
        ├──► IDS detection pipeline (recon, flood, anomaly, signatures)
        ├──► threat scoring & event correlation
        └──► IPS response (ban, quarantine, whitelist, escalation)
                    │
                    ▼
        Flask REST API + Flask-SocketIO server (port 5000)
                    │  JSON telemetry + live events
                    ▼
        React 19 dashboard (port 5173)
```

Traffic flows from the sniffer through normalization, firewall state checks, and detection/scoring engines. Results are persisted to JSON logs under `backend/logs/`, exposed through REST endpoints, and broadcast in real time to the dashboard over WebSockets.

---

## Technology Stack

| Layer | Technologies |
| --- | --- |
| **Backend** | Python 3.10+, Flask, Flask-CORS, Flask-SocketIO, Eventlet, Scapy, scikit-learn, pytest |
| **Frontend** | React 19, Vite, Redux Toolkit, React Router, Tailwind CSS v4, Framer Motion, Recharts, Axios, Socket.IO Client |
| **Capture driver** | Npcap (Windows; installer provided as `npcap-1.88.exe`) |
| **Data storage** | Local JSON rule files and JSON log files (no external database required) |

---

## Repository Layout

```text
Firewall/
├── backend/
│   ├── api/
│   │   ├── api.py                  # Flask app factory, blueprint registration, sniffer thread, server entry point
│   │   ├── routes/                 # REST blueprints (traffic, alerts, ips, firewall, rules, logs,
│   │   │                           #   incidents, learning, simulation, response, hunting, assets,
│   │   │                           #   events, autonomy, posture)
│   │   └── services/               # WebSocket broadcasts and JSON log service
│   ├── engine/
│   │   ├── packet/                 # Packet parsing, extraction, normalization
│   │   ├── firewall/               # Rule evaluation, stateful tracking, blocker, state table
│   │   ├── IDS/                    # Detection pipeline, recon/flood detectors, alert manager, time windows
│   │   ├── IPS/                    # Ban/block managers, quarantine, whitelist, escalation
│   │   ├── scoring/                # Threat scoring, severity, correlation, response engines
│   │   ├── detection/anomaly/      # Statistical, contextual, isolation-forest detectors
│   │   ├── features/               # Feature extraction and context building
│   │   ├── flow/                   # Flow tracking and window aggregation
│   │   ├── intelligence/           # Assets, attack graphs/stages, incidents, prediction, explainability
│   │   ├── learning/               # Baselines, drift, feedback, poisoning/trust guards, audit logging
│   │   ├── response/               # Autonomy/decision policies, simulation, shadow, verification, rollback
│   │   ├── deception/              # Honeypot listener and manager
│   │   ├── forensics/              # Replay engine and timeline builder
│   │   ├── health/                 # Self-monitoring and security posture engine
│   │   ├── models/                 # Model/dataset registry and governance
│   │   ├── rules/                  # JSON rule sets (firewall, IDS, IPS, scoring)
│   │   ├── evaluator.py            # Packet evaluation entry point
│   │   └── policy_loader.py        # Policy loading helpers
│   ├── sniffer/                    # Scapy sniffing helpers
│   ├── logs/                       # Runtime JSON logs (traffic.json, alerts.json)
│   ├── tests/                      # pytest suites for each engine subsystem
│   ├── main.py                     # Standalone CLI sniffer / detection demo
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── public/                     # Static assets (favicon, icons)
│   ├── src/
│   │   ├── components/layout/      # Sidebar and Topbar
│   │   ├── components/ui/          # Shared UI widgets (stat card, pagination, export menu)
│   │   ├── pages/                  # Route views for the dashboard (see Dashboard Pages)
│   │   ├── services/               # Axios API client and Socket.IO client
│   │   ├── store/                  # Redux Toolkit store and slices
│   │   ├── utils/                  # Formatting/export helpers
│   │   ├── App.jsx                 # Router and app shell
│   │   └── main.jsx                # React entry point
│   ├── index.html
│   ├── package.json                # Frontend dependencies and npm scripts
│   └── vite.config.js              # Vite configuration
├── docs/                           # Architecture audit
├── start_all.py                    # Cross-platform launcher (installs deps, starts both servers)
├── start_all.bat                   # Windows batch launcher
├── start_all.ps1                   # PowerShell launcher (run as Administrator)
├── build_frontend.py               # Frontend build automation helper
├── npcap-1.88.exe                  # Npcap installer for Windows packet capture
├── PROJECT_MEMORY.md               # Detailed architecture/project reference
└── README.md                       # This document
```

---

## Prerequisites

- **Operating system:** Windows 10/11 recommended; Linux/macOS also work with elevated privileges.
- **Python:** 3.10 or newer (with `pip`).
- **Node.js:** 18 or newer (npm 9+).
- **Packet capture driver (Windows):** Install [Npcap](https://npcap.com/) with **WinPcap API compatibility mode** enabled. An installer is included at the repository root as `npcap-1.88.exe`.
- **Privileges:** Raw packet sniffing requires Administrator/root privileges.

---

## Setup & Installation

### 1. Clone / open the repository

```bash
cd Firewall
```

### 2. Backend dependencies

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend dependencies

```bash
cd frontend
npm install
```

### 4. Packet capture driver (Windows only)

Run `npcap-1.88.exe` as Administrator and keep the default *WinPcap API compatibility* option selected, then reboot if prompted.

---

## Running the Application

There are three ways to start the suite.

### Option A — One-command launcher (recommended)

The launchers install any missing dependencies and start both servers for you.

```bash
# Cross-platform (Python):
python start_all.py

# Windows batch:
start_all.bat

# Windows PowerShell (run as Administrator for sniffing):
.\start_all.ps1
```

### Option B — Start each service manually

Terminal 1 — backend API, WebSockets, and background sniffer:

```bash
cd backend
python api/api.py
```

Terminal 2 — frontend dev server:

```bash
cd frontend
npm run dev
```

Open the dashboard at **http://localhost:5173**. The API and WebSocket server run at **http://localhost:5000**.

> Run the backend from an elevated (Administrator/root) terminal so Scapy can capture live packets. If you only want to explore the dashboard with existing log data, the API works without capture privileges.

### Option C — Standalone CLI sniffer demo

```bash
cd backend
python main.py
```

This prints firewall decisions, port-scan detections, stateful evaluation results, and IDS alerts directly to the console without starting the web UI.

### Production build (frontend)

```bash
cd frontend
npm run build      # outputs to frontend/dist
npm run preview    # serve the production build locally
```

---

## Dashboard Pages

The UI is a dark, responsive SOC console. Routes are defined in `frontend/src/App.jsx`.

| Route | Page | Purpose |
| --- | --- | --- |
| `/dashboard` | Dashboard | Key metrics, traffic charts, threat feed, and recent alerts |
| `/events` | Security Events | Unified, correlated security event stream |
| `/behavior` | Behavior Dashboard | Behavioral baselines and anomaly exposure |
| `/adaptive-defense` | Adaptive Defense | Autonomous response posture and controls |
| `/threat-hunt` | Threat Hunt | Query interface for guided threat hunting |
| `/incidents` | Incidents | Correlated incidents and priority ranking |
| `/attack-graph` | Attack Graph | Visual attack-stage progression |
| `/simulator` | Policy Simulator | Safe policy simulation and counterfactual analysis |
| `/assets` | Asset Inventory | Managed assets and relationships |
| `/models` | Model Health | Model registry, governance, and health status |
| `/firewall` | Firewall | Stateful connection table, policies, and quick block controls |
| `/ids` | IDS Alerts | Security event log with severity and threat scores |
| `/ips` | IPS Actions | Bans, quarantine, timers, and whitelist manager |
| `/packets` | Packet Inspector | Deep packet inspection (raw bytes/hex, TCP flags) |
| `/traffic` | Network Traffic | Live packet stream with filters and search |
| `/rules` | Rules Manager | Visual editor for firewall/IDS/IPS rules |
| `/logs` | Logs Viewer | Searchable, exportable system and engine logs |
| `/settings` | Settings | Capture, connection, and alert threshold configuration |

---

## REST API & WebSocket Reference

All REST routes are prefixed with `http://localhost:5000`. The WebSocket endpoint is served on the same host/port (`socket.io-client` connects to `http://localhost:5000`).

### Core firewall / IDS / IPS

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | System health check |
| GET | `/api/alerts` | IDS alerts |
| GET | `/api/dashboard/alerts/recent` | Recent alerts for the dashboard |
| GET | `/api/dashboard/stats` | Aggregate dashboard statistics |
| GET | `/api/traffic` | Captured traffic entries |
| GET | `/api/traffic/summary` | Aggregated traffic/bandwidth summary |
| GET | `/api/traffic/live` | Live traffic feed |
| GET | `/api/blocked` | Currently blocked IPs |
| POST | `/api/block` | Block an IP (`{"ip": "...", "reason": "..."}`) |
| POST | `/api/unblock` | Unblock an IP (`{"ip": "..."}`) |
| GET / POST | `/api/firewall/rules` | List or add firewall rules |
| POST | `/api/firewall/rules/delete` | Delete a firewall rule |
| GET | `/api/rules/<type>` | Read a JSON rule set |
| PUT | `/api/rules/<type>/<filename>` | Update a JSON rule set |
| GET | `/api/logs` | System/engine logs |

### Intelligence, response, and assurance

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/security-events` | Unified event stream |
| GET | `/api/security-events/<id>` | Single event detail |
| GET | `/api/incidents` | Correlated incidents |
| GET | `/api/incidents/<id>/graph` | Incident attack graph |
| GET | `/api/incidents/<id>/timeline` | Incident timeline |
| GET / POST | `/api/incidents/<id>/predict` | Next-stage prediction |
| GET | `/api/incidents/priority` | Incident priority ranking |
| GET | `/api/assets` | Asset inventory |
| GET / POST | `/api/assets/relationships` | Asset relationships |
| POST | `/api/threat-hunt/query` | Threat hunt query |
| GET | `/api/learning/baselines` | Behavioral baselines |
| GET | `/api/learning/drift` | Drift status |
| POST | `/api/learning/feedback` | Submit analyst feedback |
| POST | `/api/learning/trust-gate` | Trust gate evaluation |
| GET | `/api/learning/models` | Registered models |
| POST | `/api/simulation/simulate` | Simulate a response policy |
| POST | `/api/simulation/counterfactual` | Counterfactual analysis |
| GET / POST | `/api/responses/recommendations` | Response recommendations |
| POST | `/api/responses/counterfactual` | Response counterfactuals |
| GET | `/api/responses/deception` | Deception/honeypot status |
| GET / POST | `/api/responses/shadow` | Shadow evaluation |
| POST | `/api/responses/shadow/promote` | Promote a shadow policy |
| POST | `/api/responses/verify` | Verify a proposed response |
| GET | `/api/autonomy/status` | Autonomy status |
| POST | `/api/autonomy/level` | Set autonomy level |
| POST | `/api/autonomy/kill-switch` | Engage kill switch |
| POST | `/api/autonomy/reset` | Reset autonomy state |
| POST | `/api/autonomy/rollback` | Roll back a response |
| GET | `/api/posture/score` | Security posture score |
| POST | `/api/posture/replay` | Forensic replay |

---

## Configuration

- **Firewall / IDS / IPS rules:** JSON files under `backend/engine/rules/` (`firewall/`, `IDS/`, `IPS/`, `scoring/`). Edit them directly or through the dashboard's **Rules Manager**.
  - `firewall/rules.json` holds `blocked_ips` and `blocked_ports` lists used by the firewall engine.
- **Runtime logs:** `backend/logs/traffic.json` and `backend/logs/alerts.json`; consumed by the log service and API.
- **Backend host/ports:** The Flask app runs on port `5000` (defined at the bottom of `backend/api/api.py`).
- **Frontend API/socket URLs:** Hardcoded to `http://localhost:5000` in `frontend/src/services/api.js` and `frontend/src/services/socket.js`. Change these constants if the backend runs on another host.
- **Environment variables:** The project currently requires none. If you introduce configuration secrets, keep them in `.env` (already git-ignored) and provide a `.env.example` with dummy values.

---

## Running Tests

Backend engine tests use `pytest` and live under `backend/tests/`:

```bash
cd backend
pytest
```

Frontend linting uses ESLint:

```bash
cd frontend
npm run lint
```

---

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `Scapy` cannot capture packets | Run the backend as Administrator/root; on Windows confirm Npcap is installed with WinPcap compatibility mode. |
| Dashboard shows no live data | Confirm the backend is running on port 5000 and the browser can reach it; check the Socket.IO connection in the browser console. |
| `npm run dev` fails | Use Node.js 18+ and run `npm install` inside `frontend/` first. |
| Port 5000/5173 already in use | Stop the conflicting process or change the ports in `backend/api/api.py` and the frontend service files. |
| Blank screen after build | Re-run `npm run build` and make sure the API base URL in `frontend/src/services/api.js` matches the backend. |

---

## Security & Operational Notes

- This project is designed for **local/lab use**. The development server runs with `debug=True` and permissive CORS (`*`), and the API has no authentication layer — do not expose it to untrusted networks or the internet as-is.
- Packet capture and active blocking require elevated privileges. Run only on interfaces you are authorized to monitor.
- Rule files and logs are stored locally; protect them appropriately and review any IP bans before deploying in a shared environment.
- A malicious or misconfigured rule set can block legitimate traffic. Use the policy simulator and kill switch when experimenting with autonomous response.

No hardcoded credentials or secrets are required to run the project. If you add integrations that need secrets, use environment variables and never commit them.

---

## Documentation & Design References

Additional design notes available in the repository:

- `PROJECT_MEMORY.md` — architecture and subsystem reference
- `docs/architecture-audit.md` — architecture review
