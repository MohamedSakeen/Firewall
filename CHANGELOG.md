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

### Response safety

- Made automated response shadow-only by default, with dry-run, approval, and bounded auto modes.
- Added kill switch, autonomy, allow-list, and rate-limit gates before enforcement.
- Added durable response action logs with actor and reason for proposals, approvals, blocks, unblocks, and rollbacks.
- Added real callback-based rollback and admin approval/rejection endpoints.

### Operations

- Added redacting JSON logs, process-local metrics, and authenticated health endpoints.
- Added local deduplicated alert notifications with an optional loopback-only webhook.
- Added generated-log retention with a `prune-logs` CLI command.
- Added local install, upgrade, backup/restore, and incident-triage runbooks.
- Kept the public health check minimal for launcher probes.

### Detection

- Added a versioned, checksummed IDS rule pack with strict schema validation.
- Added deterministic benign/malicious traffic tests and alert deduplication.
- Added machine-readable alert reasons and an empty-by-default suppression allow-list.
- Added an authenticated endpoint for rule-pack provenance and suppression events.

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
- Removed the bundled Npcap installer; Windows users now obtain it from the official site.

### Build

- Pinned backend dependencies and refreshed the frontend lockfile.
- Added CI for backend tests and frontend build.
- Reduced `npm audit` findings to zero at the time of this change.
- Added optional localhost-only Docker Compose, nginx, and systemd examples with capture left off by default.
- Extended CI with backend syntax checks, frontend lint, and whitespace checks.

### Dashboard

- Aligned Settings with the minimal public health endpoint and added authenticated operational health and metrics views.
- Added admin-only approval, autonomy, kill-switch, and rollback controls plus a read-only response action log.
- Added IDS rule-pack provenance to the alert page and optional reasons for unblock actions.

### Documentation

- Corrected claims about enterprise readiness, CI, CORS, debug mode, and packet capture.
- Marked planning documents as aspirational rather than delivered functionality.
- Documented known security limits in `SECURITY.md`.

## Earlier releases

See git history for earlier lab prototype work.
