# NetGuard AI — Smart Firewall, IDS & IPS Suite

> **STATUS: local lab / single-host project. Not production-ready.**
>
> This is a learning and demonstration project, not a deployable security product.
> Login, roles, CSRF protection, rate limits, and audit logs are implemented, but a
> formal security audit and production hardening are still missing. Keep both
> servers bound to localhost and do not expose them to an untrusted network.
>
> Packet capture is **passive and opt-in**: the default launcher starts the API with
> the sniffer disabled, so no Administrator/root privileges are needed. Any blocking
> or response action is separate from capture, and real OS-level packet blocking
> depends on the host platform, drivers, and privileges; it is not guaranteed here.
>
> Several adaptive-defense modules are experimental and covered by unit tests, but
> they have not been validated in production, and no completed security audit exists.

The backend evaluates simulated or captured traffic, raises and correlates security events, and streams telemetry to a React dashboard over Socket.IO. The repository also contains planning documents for deeper analysis, deception, prediction, and autonomous response work. See [Security & Operational Notes](#security--operational-notes) before exposing any component beyond localhost.

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

**Core defense pipeline** (capture is optional and opt-in)
- Passive packet capture and normalization (IP/TCP/UDP/ICMP metadata, TCP flags, payload sizes).
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
        ├──► durable SQLite event store (users, audit, events)
        └──► IPS response (ban, quarantine, whitelist, escalation)
                    │
                    ▼
        Flask REST API + Flask-SocketIO server (port 5000)
                    │  JSON telemetry + live events
                    ▼
        React 19 dashboard (port 5173)
```

Traffic flows from the sniffer through normalization, firewall state checks, and detection/scoring engines. Results are written to a versioned SQLite database, exposed through REST endpoints, and broadcast in real time to the dashboard over WebSockets. Some legacy JSON log files under `backend/logs/` are still used by individual services. `FIREWALL_ROLE=api` runs only the web layer; `FIREWALL_ROLE=worker` runs capture only.

---

## Technology Stack

| Layer | Technologies |
| --- | --- |
| **Backend** | Python 3.10+, Flask, Flask-CORS, Flask-SocketIO, Eventlet, Scapy, scikit-learn, pytest |
| **Frontend** | React 19, Vite, Redux Toolkit, React Router, Tailwind CSS v4, Framer Motion, Recharts, Axios, Socket.IO Client |
| **Capture driver** | Npcap (Windows; installer provided as `npcap-1.88.exe`) |
| **Data storage** | SQLite for accounts, audit records, and durable events; local JSON rule files; some JSON log files |

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
│   ├── auth/                       # Users, sessions, CSRF, audit logs
│   ├── storage/                    # Versioned SQLite event store
│   ├── data/                       # Runtime SQLite database (git-ignored)
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
│   ├── logs/                       # Legacy runtime JSON logs (traffic.json, alerts.json)
│   ├── tests/                      # pytest suites for each engine subsystem
│   ├── main.py                     # Standalone CLI sniffer / detection demo
│   ├── manage.py                   # Account, backup, prune, and stats CLI
│   ├── worker.py                   # Capture-only worker entry point
│   └── requirements.txt            # Pinned Python dependencies
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

- **Operating system:** Windows, Linux, or macOS. Nothing here is production-tested.
- **Python:** 3.10 or newer (with `venv` and `pip`).
- **Node.js:** 20 or newer (npm 9+).
- **Optional, only for packet capture:** On Windows install [Npcap](https://npcap.com/) with **WinPcap API compatibility mode** enabled. An installer is included at the repository root as `npcap-1.88.exe`. Raw capture needs Administrator/root privileges; the default launcher does not use it.

---

## Setup & Installation

### 1. Clone / open the repository

```bash
cd Firewall
```

### 2. Backend dependencies

The launcher creates `backend/.venv` and installs the pinned requirements there;
nothing is installed globally. The venv includes system site packages so an
already-provisioned lab can reuse matching wheels; exact pins still install into
the venv when host versions differ. To do it manually:

```bash
python -m venv backend/.venv
# Windows:
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
# macOS / Linux:
backend/.venv/bin/python -m pip install -r backend/requirements.txt
```

### 3. Frontend dependencies

```bash
cd frontend
npm ci        # uses the checked-in package-lock.json
```

### 4. Create the first admin account

There are no default credentials. From the repository root, run:

```bash
python backend/manage.py create-admin
```

Enter a username and a password of at least 12 characters when prompted. Use
`python backend/manage.py create-user --role operator` or `--role viewer` to add
other users. Passwords are hashed with Argon2id and are never written in plain text.

### 5. Packet capture driver (Windows only, optional)

Only needed if you explicitly enable the sniffer. Run `npcap-1.88.exe` as Administrator and keep the default *WinPcap API compatibility* option selected, then reboot if prompted.

---

## Running the Application

There are three ways to start the suite in the local lab.

### Option A — One-command launcher (recommended)

The launchers create `backend/.venv`, install pinned Python packages there, run
`npm ci` in `frontend/`, and start both servers. Press Ctrl+C to stop both.
The backend starts on `127.0.0.1:5000` with the sniffer **off**; no elevated
terminal is needed.

```bash
# Cross-platform (Python):
python start_all.py

# Windows batch (thin wrapper around the Python launcher):
start_all.bat

# Windows PowerShell (thin wrapper around the Python launcher):
.\start_all.ps1
```

To opt into packet capture, set `FIREWALL_ENABLE_SNIFFER=1` before launching.
This starts Scapy capture and may need Administrator/root and Npcap. The backend
entry point honors `FIREWALL_HOST` and `FIREWALL_PORT` either way.

### Option B — Start each service manually

Terminal 1 — backend API and WebSockets, **without** the sniffer:

```bash
cd backend
# macOS / Linux:
FIREWALL_ENABLE_SNIFFER=0 .venv/bin/python api/api.py
# Windows: set FIREWALL_ENABLE_SNIFFER=0 && .venv\Scripts\python.exe api\api.py
```

Terminal 2 — frontend dev server:

```bash
cd frontend
npm ci
npm run dev
```

Open the dashboard at **http://127.0.0.1:5173**. The API and WebSocket server run at **http://127.0.0.1:5000**.

> `python api/api.py` is the normal backend entry point. It binds to
> `127.0.0.1:5000` with debug off by default. Packet capture is opt-in; enable it
> only with `FIREWALL_ENABLE_SNIFFER=1` and only on interfaces you are authorized
> to monitor.

### First login

Open the dashboard and sign in with the admin account you created during setup.
Roles are `admin` (users, rules, settings), `operator` (blocking and response
actions), and `viewer` (read-only). Permissions are enforced on the server; the UI
only hides controls for clarity.

### Option C — Standalone CLI sniffer demo

```bash
cd backend
python main.py
```

This prints firewall decisions, port-scan detections, stateful evaluation results, and IDS alerts directly to the console without starting the web UI.

### Capture worker and maintenance

For a separate capture process, run the web layer and worker as two processes:

```bash
# Terminal 1: API only, no capture
FIREWALL_ROLE=api python backend/api/api.py
# Terminal 2: capture only, still opt-in and still needs privileges
FIREWALL_ROLE=worker FIREWALL_ENABLE_SNIFFER=1 python backend/worker.py
```

The default `FIREWALL_ROLE=all` keeps the simple one-process lab setup. Durable events are retained for `FIREWALL_EVENT_RETENTION_DAYS` (30 days by default) and pruned at startup.

```bash
python backend/manage.py backup-db --output backend/data/backup.db
python backend/manage.py prune-events --days 30
python backend/manage.py stats
```

Backups are made with SQLite's backup API, and sensitive event fields are redacted before storage.

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
- **Durable events:** SQLite tables for users, audit records, and redacted packet/alert/incident summaries are stored under `backend/data/` by default. `backend/logs/traffic.json` and `backend/logs/alerts.json` are legacy JSON logs used by individual services.
- **Backend host/port:** Both the launcher and `python api/api.py` honor `FIREWALL_HOST` / `FIREWALL_PORT` and default to `127.0.0.1:5000`. Debug mode is off.
- **Frontend API/socket URLs:** `frontend/src/services/api.js` and `frontend/src/services/socket.js` read `VITE_API_BASE_URL` and `VITE_SOCKET_URL`, falling back to `http://localhost:5000/api` and `http://localhost:5000`.
- **Environment variables:** Copy `.env.example` for the list of supported names. Export them in your shell before launching; neither the launcher nor the backend auto-loads `.env`. The backend reads the `FIREWALL_*` values directly.
- **Auth settings:** `FIREWALL_SECRET_KEY` should be a long random value for any persistent install. `FIREWALL_DB_PATH` sets the SQLite database location. `FIREWALL_COOKIE_SECURE=1` should only be used behind HTTPS. Create accounts with `python backend/manage.py`.
- **Process and retention settings:** `FIREWALL_ROLE` selects `all`, `api`, or `worker`; `FIREWALL_EVENT_RETENTION_DAYS` controls durable event pruning. `FIREWALL_ENABLE_SNIFFER` remains opt-in even in worker mode.
- **Python environment:** `backend/.venv` is created by the launcher and is git-ignored.

---

## Running Tests

Backend engine tests use `pytest` and live under `backend/tests/`:

```bash
# From the repository root (pytest.ini sets pythonpath = backend):
python -m pytest

# Or, with the project virtual environment active:
cd backend
.venv/bin/python -m pytest   # Windows: .venv\Scripts\python.exe -m pytest
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
| Sniffer cannot capture packets | Capture is off by default. If you opt in with `FIREWALL_ENABLE_SNIFFER=1`, run as Administrator/root and confirm Npcap on Windows with WinPcap compatibility mode. |
| Dashboard shows no live data | This is expected with the sniffer off unless log data exists. Check the backend on port 5000 and the browser's Socket.IO console. |
| `npm ci` / `npm run dev` fails | Use Node.js 20+ and run `npm ci` inside `frontend/`. `npm ci` needs `frontend/package-lock.json`. |
| Port 5000/5173 already in use | Stop the conflicting process or set `FIREWALL_PORT` and matching `VITE_API_BASE_URL` / `VITE_SOCKET_URL` for the frontend. |
| Blank screen after build | Re-run `python build_frontend.py` and check that the Vite API/socket environment values point at the backend. |

---

## Security & Operational Notes

- This project is designed for **local/lab, single-host use only**. The API now requires login, supports admin/operator/viewer roles, CSRF tokens, login rate limits, and audit logs. CORS is limited to the local dashboard origins by default, debug mode is off, and the backend binds to localhost by default. Do not expose any component to untrusted networks or the internet before a production security review.
- Packet capture is passive and opt-in. Capture and OS-level blocking depend on platform, driver, and privileges; do not assume either works outside a lab. Run only on interfaces you are authorized to monitor.
- Rule files and logs are stored locally; protect them appropriately and review any IP bans before using this on a shared machine.
- A malicious or misconfigured rule set can block legitimate traffic. Use the policy simulator and kill switch when experimenting with response policies.
- No formal security audit has been completed and there is no production deployment pipeline. Basic CI runs the backend tests and frontend build; the planning documents describe intended future work, not delivered features.
- `npm audit` currently reports 0 vulnerabilities after refreshing the frontend lockfile. Re-run `npm audit` after any dependency change.

No hardcoded credentials or secrets are required to run the project. If you add integrations that need secrets, use environment variables and never commit them.

---

## Documentation & Design References

Additional design notes available in the repository. These are planning/review
documents, not statements of delivered functionality:

- `PROJECT_MEMORY.md` — architecture and subsystem reference
- `file_structure.md` — current repository layout
- `docs/architecture-audit.md` — architecture review
- `docs/*-plan.md` and top-level `*_plan.md` files — future-phase plans

Authentication is the final planned phase; none of these documents describe a
production deployment or a completed security audit.
