# Changelog

All notable changes to this project are documented here.

## Unreleased

### Fixed

- Resolved merge leftovers that prevented the backend and frontend from starting.
- Removed hardcoded demo values from dashboard pages and added honest empty states.
- Made launcher shutdown stop backend and frontend child processes cleanly.

### Auth

- Added local accounts with Argon2id password hashing and no default credentials.
- Added admin, operator, and viewer roles enforced on the server.
- Added login/logout sessions, CSRF tokens, login rate limits, and audit logs.
- Added a CLI for creating admin, operator, and viewer accounts.

### Storage

- Added versioned SQLite storage for durable packet, alert, and incident summaries.
- Added sensitive-field redaction and configurable event retention.
- Added `FIREWALL_ROLE=api|worker|all` to separate web and capture processes.
- Added database backup, event prune, and stats commands to `manage.py`.

### Security

- Bound the API to localhost by default and disabled debug mode.
- Made packet capture opt-in instead of always-on.
- Restricted browser origins and added basic secure response headers.
- Replaced shell-string firewall commands with argument-based commands.
- Added strict validation for block, unblock, firewall rule, and rule-file inputs.
- Added API and enforcement safety tests.

### Build

- Pinned backend dependencies and refreshed the frontend lockfile.
- Added CI for backend tests and frontend build.
- Reduced `npm audit` findings to zero at the time of this change.
- Added optional localhost-only Docker Compose, nginx, and systemd examples with capture left off by default.

### Documentation

- Corrected claims about enterprise readiness, CI, CORS, debug mode, and packet capture.
- Marked planning documents as aspirational rather than delivered functionality.

## Earlier releases

See git history for earlier lab prototype work.
