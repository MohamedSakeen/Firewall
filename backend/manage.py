"""Local account management CLI for the firewall lab API.

Examples:
    python backend/manage.py create-admin
    python backend/manage.py create-user --role operator
    python backend/manage.py create-user --role viewer --username analyst

Passwords are read from the terminal with getpass and are never accepted as
command-line arguments or stored in plaintext.
"""

import argparse
import getpass
import sys
from pathlib import Path

BACKEND_DIR = str(Path(__file__).resolve().parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from auth.db import init_db  # noqa: E402
from auth.password import password_error  # noqa: E402
from auth.store import UserExistsError, create_user  # noqa: E402


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


def build_parser():
    parser = argparse.ArgumentParser(description="Manage local firewall accounts.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    admin = subparsers.add_parser("create-admin", help="create an admin account")
    admin.add_argument("--username", help="username to create (prompted if omitted)")

    user = subparsers.add_parser("create-user", help="create an operator or viewer account")
    user.add_argument("--role", required=True, choices=("operator", "viewer"))
    user.add_argument("--username", help="username to create (prompted if omitted)")

    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.command == "create-admin":
        return _create(args, "admin")
    return _create(args, args.role)


if __name__ == "__main__":
    raise SystemExit(main())
