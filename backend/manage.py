"""Local account and maintenance CLI for the firewall lab API.

Examples:
    python backend/manage.py create-admin
    python backend/manage.py create-user --role operator
    python backend/manage.py create-user --role viewer --username analyst
    python backend/manage.py backup-db --output backend/data/backup.db
    python backend/manage.py prune-events --days 30
    python backend/manage.py prune-logs --days 30
    python backend/manage.py stats

Passwords are read from the terminal with getpass and are never accepted as
command-line arguments or stored in plaintext.
"""

import argparse
import getpass
import os
import sqlite3
import sys
from pathlib import Path

BACKEND_DIR = str(Path(__file__).resolve().parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from auth.db import get_db_path, init_db  # noqa: E402
from auth.password import password_error  # noqa: E402
from auth.store import UserExistsError, create_user, list_users  # noqa: E402
from ops.retention import MAX_LOG_RETENTION_DAYS, prune_log_files  # noqa: E402
from storage.events import (  # noqa: E402
    MAX_RETENTION_DAYS,
    event_counts_by_type,
    prune_events,
)


def _read_password():
    password = getpass.getpass("Password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        print("Passwords do not match.", file=sys.stderr)
        return None
    error = password_error(password)
    if error:
        print(error, file=sys.stderr)
        return None
    return password


def _create(args, role):
    init_db()
    username = args.username or input("Username: ")
    password = _read_password()
    if password is None:
        return 2
    try:
        user = create_user(username, password, role)
    except UserExistsError:
        print("Username already exists.", file=sys.stderr)
        return 2
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2
    print(f"Created {user.role} account: {user.username} (id={user.id})")
    return 0


BACKUP_SUFFIXES = {".db", ".sqlite", ".sqlite3"}


def _resolve_output_path(raw):
    """Validate a backup destination without following traversal or symlinks."""
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("a backup output path is required")
    path = Path(raw.strip()).expanduser()
    if ".." in path.parts or path.is_symlink():
        raise ValueError("backup path must not use '..' or a symlink")
    candidate = path if path.is_absolute() else Path.cwd() / path
    for parent in candidate.parents:
        if parent.is_symlink():
            raise ValueError("backup path must not pass through a symlink")
    resolved = candidate.resolve()
    if resolved.suffix.lower() not in BACKUP_SUFFIXES:
        raise ValueError("backup path must end in .db, .sqlite, or .sqlite3")
    if resolved.exists() and not resolved.is_file():
        raise ValueError("backup path must be a file")
    return resolved


def _backup_db(args):
    try:
        output = _resolve_output_path(args.output)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    init_db()
    try:
        source = sqlite3.connect(str(get_db_path()), timeout=10)
        try:
            target = sqlite3.connect(str(output))
            try:
                source.backup(target)
            finally:
                target.close()
        finally:
            source.close()
        os.chmod(output, 0o600)
    except (OSError, sqlite3.Error):
        print("backup failed", file=sys.stderr)
        return 1
    print(f"Backup written to {output}")
    return 0


def _prune_events(args):
    days = args.days
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= MAX_RETENTION_DAYS:
        print(f"days must be between 1 and {MAX_RETENTION_DAYS}", file=sys.stderr)
        return 2
    init_db()
    try:
        removed = prune_events(days)
    except sqlite3.Error:
        print("event prune failed", file=sys.stderr)
        return 1
    print(f"Removed {removed} events older than {days} days")
    return 0


def _prune_logs(args):
    days = args.days
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= MAX_LOG_RETENTION_DAYS:
        print(f"days must be between 1 and {MAX_LOG_RETENTION_DAYS}", file=sys.stderr)
        return 2
    try:
        removed = prune_log_files(days)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(f"Removed {removed} log files older than {days} days")
    return 0


def _stats():
    init_db()
    counts = event_counts_by_type()
    print(f"Users: {len(list_users())}")
    print("Events by type:")
    if not counts:
        print("  (none)")
    for event_type, count in counts.items():
        print(f"  {event_type}: {count}")
    return 0


def build_parser():
    parser = argparse.ArgumentParser(description="Manage local firewall accounts.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    admin = subparsers.add_parser("create-admin", help="create an admin account")
    admin.add_argument("--username", help="username to create (prompted if omitted)")

    user = subparsers.add_parser("create-user", help="create an operator or viewer account")
    user.add_argument("--role", required=True, choices=("operator", "viewer"))
    user.add_argument("--username", help="username to create (prompted if omitted)")

    backup = subparsers.add_parser("backup-db", help="back up the SQLite database")
    backup.add_argument("--output", required=True, help="destination .db, .sqlite, or .sqlite3 file")

    prune = subparsers.add_parser("prune-events", help="delete expired durable events")
    prune.add_argument("--days", required=True, type=int, help=f"retention window (1-{MAX_RETENTION_DAYS})")

    prune_logs = subparsers.add_parser("prune-logs", help="delete expired generated log files")
    prune_logs.add_argument("--days", required=True, type=int, help=f"retention window (1-{MAX_LOG_RETENTION_DAYS})")

    subparsers.add_parser("stats", help="show user and durable event counts")

    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.command == "create-admin":
        return _create(args, "admin")
    if args.command == "create-user":
        return _create(args, args.role)
    if args.command == "backup-db":
        return _backup_db(args)
    if args.command == "prune-events":
        return _prune_events(args)
    if args.command == "prune-logs":
        return _prune_logs(args)
    if args.command == "stats":
        return _stats()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
