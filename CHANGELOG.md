# Changelog

All notable changes to this project are documented here.

## Unreleased

### Fixed

- Resolved merge leftovers that prevented the backend and frontend from starting.
- Removed hardcoded demo values from dashboard pages and added honest empty states.
- Made launcher shutdown stop backend and frontend child processes cleanly.

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

### Documentation

- Corrected claims about enterprise readiness, CI, CORS, debug mode, and packet capture.
- Marked planning documents as aspirational rather than delivered functionality.

## Earlier releases

See git history for earlier lab prototype work.
