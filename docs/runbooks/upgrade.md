# Runbook: safe upgrade

## Before you start

1. Stop the running app cleanly with Ctrl+C or stop the systemd units.
2. Back up the database:

   ```bash
   python backend/manage.py backup-db --output backend/data/backup-before-upgrade.db
   ```

3. Record the current commit:

   ```bash
   git rev-parse --short HEAD
   ```

## Upgrade

```bash
git pull
python -m pytest
cd frontend && npm ci && npm run build && npm run lint
```

Return to the repository root and start the app normally:

```bash
python start_all.py
```

## After the upgrade

- Sign in and confirm your account still works.
- Check `/api/health`.
- Check `python backend/manage.py stats`.
- Review recent response actions and alerts for unexpected changes.
- Review the release notes and `CHANGELOG.md` for configuration changes.

## If the upgrade fails

1. Stop the app.
2. Restore the pre-upgrade database file with `manage.py backup-db` output or a filesystem copy.
3. Return to the recorded commit with `git checkout <old-commit>`.
4. Restart and verify login and health.

Do not delete the old database when testing an upgrade.
