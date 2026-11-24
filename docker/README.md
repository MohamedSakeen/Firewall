# Docker packaging (local lab only)

These files are optional, localhost-only packaging for the single-host tool. They
are not a production deployment and are not a security audit.

1. Create the first admin (the password is prompted for; never put it in Compose
   or an env file):

   `docker compose run --rm backend python manage.py create-admin`

2. Start the services: `docker compose up -d`.

3. Open `http://127.0.0.1:8080`. The API is published only on
   `127.0.0.1:5000`, and the SQLite database lives in the named `data` volume.

Defaults are deliberately conservative: `FIREWALL_ENABLE_SNIFFER=0`, API role,
no hardcoded secret (set `FIREWALL_SECRET_KEY` in your environment if you want
sessions to survive restarts), and frontend build args pointing at localhost
APIs. Both services drop all Linux capabilities.

Capture is opt-in: set `FIREWALL_ROLE=all` (or `worker`) and
`FIREWALL_ENABLE_SNIFFER=1`, then add the privileges your lab requires
(`NET_RAW`/`NET_ADMIN` on Linux). Do not enable it by default.

Host ports can be changed with `BACKEND_PORT` / `FRONTEND_PORT`; if you change
the backend port, rebuild the frontend with matching `VITE_API_BASE_URL` and
`VITE_SOCKET_URL` build args, and update the CSP in `docker/nginx.conf`.
`deploy/systemd/` has example units that use
`/etc/netguard/netguard.env` and a dedicated `netguard` user, with no
credentials included.

This is still not a production security audit. Do not expose these ports beyond
localhost.
