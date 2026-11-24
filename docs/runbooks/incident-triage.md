# Runbook: alert and response triage

Use this when the dashboard reports suspicious traffic or an unexpected block.

## 1. Stabilize

If enforcement is active and causing harm, engage the kill switch immediately:

```bash
# From the dashboard or with an admin session:
POST /api/autonomy/kill-switch  {"reason": "active incident triage"}
```

The kill switch disables automated and manual enforcement. Detection and logging continue.

## 2. Collect context

- Recent IDS alerts: `GET /api/alerts`
- Detection reasons and rule-pack version: `GET /api/alerts/detection`
- Durable events: stored in SQLite via the event store
- Response history: `GET /api/responses/actions`
- Blocked IPs: `GET /api/blocked`
- Structured app logs: `backend/logs/app.jsonl`

Record timestamps, source IPs, rule IDs, and observed thresholds. Do not paste secrets or cookies into tickets.

## 3. Decide

- **False positive:** unblock with `POST /api/unblock` and a clear reason. Add a narrow suppression entry only if the source or rule is genuinely known-benign.
- **True positive:** keep the block, review the incident graph/timeline in the dashboard, and consider approval mode before expanding enforcement.
- **Uncertain:** leave response in shadow mode and collect more events. Avoid broad CIDR blocks.

## 4. Roll back a specific action

Use the action ID from `GET /api/responses/actions`:

```bash
POST /api/autonomy/rollback  {"action_id": "...", "reason": "false positive"}
```

Verify the IP disappears from `GET /api/blocked` and a rollback row appears in `GET /api/responses/actions`.

## 5. Follow up

- Confirm the kill switch is reset only after the cause is understood.
- Review whether autonomy level, allow-list, or rate limits were appropriate.
- Add a regression test or rule-pack update when a detection is proven wrong.
