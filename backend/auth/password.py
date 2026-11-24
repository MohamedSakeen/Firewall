"""Argon2id password hashing and validation helpers."""

import re
from functools import lru_cache

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError

MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 256
USERNAME_PATTERN = re.compile(r"[A-Za-z0-9_.-]{3,64}\Z")

_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)


@lru_cache(maxsize=1)
def _dummy_hash():
    """A non-login hash used to keep missing-user checks roughly constant-time."""
    return _hasher.hash("unusable-placeholder-password")


def hash_password(password):
    """Hash a password with Argon2id. Never return or log the plaintext."""
    return _hasher.hash(password)


def verify_password(password, encoded):
    """Return True only when the password matches a stored Argon2id hash."""
    try:
        return _hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError, TypeError, ValueError):
        return False


def verify_for_login(password, encoded):
    """Verify against a real hash or a placeholder when the user is unknown."""
    return verify_password(password, encoded or _dummy_hash())


def normalize_username(value):
    """Validate and normalize a username; return None when it is invalid."""
    if not isinstance(value, str):
        return None
    candidate = value.strip().lower()
    if not USERNAME_PATTERN.fullmatch(candidate):
        return None
    return candidate


def password_error(value):
    """Return a validation message, or None when the password is acceptable."""
    if not isinstance(value, str):
        return "password must be a string"
    if len(value) < MIN_PASSWORD_LENGTH:
        return f"password must be at least {MIN_PASSWORD_LENGTH} characters"
    if len(value) > MAX_PASSWORD_LENGTH:
        return f"password must be at most {MAX_PASSWORD_LENGTH} characters"
    return None
