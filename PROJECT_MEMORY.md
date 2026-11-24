# PROJECT MEMORY — Firewall, IDS & IPS Lab Suite

> **Last updated:** 2026-11-24
> **Status:** local lab / demo project. Not production-ready.
> **Stack:** Python (Scapy, Flask, Flask-SocketIO, scikit-learn) + React 19
> (Vite, Redux Toolkit, Tailwind CSS, Recharts)

## Scope and limits

This repository is a learning/demo environment for firewall, IDS, and IPS concepts.
It is not an enterprise security product. It now has login, roles, CSRF
protection, rate limits, and audit logs, but still needs a formal security audit
and production hardening. Keep both servers bound to localhost.

Packet capture is passive and opt-in. Both `start_all.py` and `python api/api.py`
default to the sniffer disabled, localhost binding, and debug off, so no
Administrator/root privileges are needed for the normal path. Actual OS-level
blocking depends on the platform, drivers, and privileges; it is not guaranteed
by this project.

There is no completed formal security audit and no production deployment. A basic
CI workflow runs the backend tests and frontend build. The `docs/` and top-level
plan files describe intended future work, not delivered functionality.

## Backend (`backend/`)

- `api/api.py` — Flask app factory, blueprint registration, Socket.IO setup, and
  the local-lab server entry point. It reads the `FIREWALL_*` settings directly;
  capture is opt-in and localhost binding is the default.
- `api/routes/` — REST blueprints: `alert`, `assets`, `autonomy`, `events`,
  `firewall`, `hunting`, `incidents`, `ips`, `learning`, `logs`, `posture`,
  `response`, `rules`, `simulation`, `traffic`.
- `api/services/` — `live_store.py`, `log_service.py`, `websocket_service.py`.
- `auth/` — SQLite-backed users and audit logs, Argon2id hashes, Flask-Login
  sessions, CSRF protection, rate limits, and role/path checks.
- `manage.py` — CLI to create accounts, back up the database, prune events, and
  show counts. No default credentials exist.
- `storage/events.py` — versioned SQLite event store with redaction, retention,
  and parameterized queries.
- `worker.py` — capture-only entry point for `FIREWALL_ROLE=worker`.
- `sniffer/` — Scapy capture helpers (used only when capture is enabled).
- `engine/packet/` — packet normalization.
- `engine/firewall/`, `engine/IDS/`, `engine/IPS/` — rule evaluation and the
  detection/response pipeline. IDS adds explainable reasons, deduplication,
  and detection-only suppression.
- `engine/scoring/`, `engine/flow/`, `engine/features/`, `engine/detection/anomaly/` —
  scoring, flows, features, and anomaly detection.
- `engine/learning/`, `engine/intelligence/`, `engine/models/`, `engine/health/`,
  `engine/response/`, `engine/hunting/`, `engine/deception/`, `engine/forensics/` —
  experimental adaptive-defense modules covered by unit tests, not production
  validation.
- `engine/rules/` — JSON rule sets under `firewall/`, `IDS/`, `IPS/`, `scoring/`.
  The IDS pack has a versioned, checksummed manifest and strict validation.
- `logs/` — legacy runtime JSON logs (generated locally).
- `data/` — runtime SQLite database, backed up with `manage.py backup-db`.
- `tests/` — pytest suites; `python -m pytest` from the repo root uses `pytest.ini`.
- `requirements.txt` — pinned direct dependencies. Install into `backend/.venv`,
  never globally.

There is no `backend/config/`, `backend/utils/`, or `backend/database/` directory.
Configuration is mostly environment variables plus JSON rule files and SQLite data.
Optional localhost-only Docker and systemd examples live in `docker-compose.yml`,
`Dockerfile.backend`, `Dockerfile.frontend`, `docker/`, and `deploy/systemd/`.

## Frontend (`frontend/`)

- `src/components/layout/`, `src/components/ui/`, `src/components/charts/` —
  shared UI pieces.
- `src/pages/` — dashboard routes (traffic, firewall, IDS, IPS, packets, rules,
  logs, settings, and the adaptive-defense views).
- `src/services/` — Axios API client and Socket.IO client; both use
  `VITE_API_BASE_URL` / `VITE_SOCKET_URL` with localhost fallbacks.
- `src/store/`, `src/store/slices/` — Redux Toolkit state.
- `src/utils/` — formatting/export helpers.
- `package.json` and `package-lock.json` — npm scripts and the checked-in lockfile
  used by `npm ci`.

There is no `src/data/mockData.js`, `src/hooks/`, or `dashboard/` directory.

## Local setup

```bash
python backend/manage.py create-admin   # one-time, creates the first user
python start_all.py                     # Windows wrappers: start_all.bat / start_all.ps1
python backend/manage.py stats          # user and durable event counts
python -m pytest                        # from the repository root
python build_frontend.py                # runs npm run build in frontend/
```

`start_all.py` creates `backend/.venv`, installs the pinned requirements there,
runs `npm ci` in `frontend/`, then starts the API on `127.0.0.1:5000` (sniffer off)
and the Vite dev server on `127.0.0.1:5173`. Ctrl+C stops both children.

Environment variable names are documented in `.env.example`. The frontend reads
the `VITE_*` values, and the backend reads `FIREWALL_HOST`, `FIREWALL_PORT`,
`FIREWALL_ALLOWED_ORIGINS`, `FIREWALL_ENABLE_SNIFFER`, `FIREWALL_ROLE`,
`FIREWALL_EVENT_RETENTION_DAYS`, `FIREWALL_SECRET_KEY`, `FIREWALL_DB_PATH`, and
`FIREWALL_COOKIE_SECURE` directly. The launcher sets safe defaults in the child
process environment.
