# Runbook: local install

Use this for a fresh single-host lab install. This is not a production deployment guide.

## Prerequisites

- Python 3.10+ with `venv` and `pip`
- Node.js 20+ with npm
- Optional: Npcap on Windows only if you later enable packet capture

## Steps

1. Open the repository and create the first account:

   ```bash
   python backend/manage.py create-admin
   ```

   Use a unique password of at least 12 characters. There are no default credentials.

2. Start the lab:

   ```bash
   python start_all.py
   ```

   The launcher creates `backend/.venv`, installs pinned Python packages, runs `npm ci`, and starts the API on `127.0.0.1:5000` and the dashboard on `127.0.0.1:5173`.

3. Open `http://127.0.0.1:5173` and sign in with the account from step 1.

4. Verify the API:

   ```bash
   curl -fsS http://127.0.0.1:5000/api/health
   ```

5. Optional checks:

   ```bash
   python -m pytest
   cd frontend && npm run build && npm run lint
   ```

## Defaults to remember

- Packet capture is off. Set `FIREWALL_ENABLE_SNIFFER=1` only for authorized testing and with the required privileges.
- Automated enforcement is off in effect: `FIREWALL_RESPONSE_MODE=shadow` and `FIREWALL_AUTONOMY_LEVEL=LEVEL_1_RECOMMEND`.
- Keep the service on localhost until you have completed a security review.
