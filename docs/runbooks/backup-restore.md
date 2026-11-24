# Runbook: backup and restore

The SQLite database contains password hashes, audit records, durable events, and response actions. Treat every backup as sensitive.

## Create a backup

```bash
python backend/manage.py backup-db --output backend/data/backup.db
```

The command uses SQLite's backup API and sets restrictive file permissions where the OS allows it. Store the backup outside the app directory and protect it.

## Inspect state

```bash
python backend/manage.py stats
```

## Restore in a lab

1. Stop the app.
2. Make a backup of the current database first.
3. Copy your chosen backup over the configured `FIREWALL_DB_PATH`, preserving restrictive permissions.
4. Start the app and confirm login, health, and recent events.

## Retention

```bash
python backend/manage.py prune-events --days 30
python backend/manage.py prune-logs --days 30
```

Review retention values before running these commands. Pruning is destructive.
