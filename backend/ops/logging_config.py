"""Redacting JSON logging for the local firewall API.

Log records are written as one JSON object per line to stderr and to
``logs/app.jsonl``. Sensitive keys and bearer tokens are scrubbed before any
handler sees a record, so log output never contains credentials or CSRF values.
"""

import copy
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from ops.paths import get_log_dir

logger = logging.getLogger(__name__)

REDACTED = "[REDACTED]"
MAX_TEXT_LENGTH = 2000
MAX_KEY_LENGTH = 64
MAX_ITEMS = 50
MAX_DEPTH = 4

SENSITIVE_KEY_PARTS = (
    "password",
    "passwd",
    "pwd",
    "token",
    "secret",
    "credential",
    "authorization",
    "api_key",
    "apikey",
    "api-key",
    "cookie",
    "csrf",
    "session",
)
_KEY_NAME = (
    r"password|passwd|pwd|token|secret|credential|authorization|api[_-]?key|cookie|csrf|session"
)
BEARER_RE = re.compile(r"(?i)\bbearer\s+[^\s,;]+")
SENSITIVE_VALUE_RE = re.compile(
    r"(?i)([\"']?(" + _KEY_NAME + r")[\"']?)\s*[:=]\s*(\"[^\"]*\"|'[^']*'|[^\s,;}\]]+)"
)
STANDARD_RECORD_KEYS = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__)
STANDARD_RECORD_KEYS.update({"message", "asctime"})


def _is_sensitive_key(key):
    name = str(key).lower()
    return any(part in name for part in SENSITIVE_KEY_PARTS)


def redact_text(value):
    """Redact bearer tokens and sensitive key/value pairs in free text."""
    text = str(value)
    text = BEARER_RE.sub("Bearer " + REDACTED, text)
    text = SENSITIVE_VALUE_RE.sub(lambda match: f"{match.group(1)}={REDACTED}", text)
    return text[:MAX_TEXT_LENGTH]


def sanitize(value, depth=0):
    """Return a JSON-safe copy with sensitive keys and values removed."""
    if depth > MAX_DEPTH:
        return "[TRUNCATED]"
    if isinstance(value, dict):
        cleaned = {}
        for key, item in list(value.items())[:MAX_ITEMS]:
            name = str(key)[:MAX_KEY_LENGTH]
            cleaned[name] = REDACTED if _is_sensitive_key(name) else sanitize(item, depth + 1)
        return cleaned
    if isinstance(value, (list, tuple, set)):
        return [sanitize(item, depth + 1) for item in list(value)[:MAX_ITEMS]]
    if isinstance(value, str):
        return redact_text(value)
    if value is None or isinstance(value, (bool, int, float)):
        return value
    # Never serialize arbitrary object reprs: they can contain credentials.
    return f"<{type(value).__name__}>"


class RedactingFilter(logging.Filter):
    """Scrub plain messages and logging arguments before other handlers run."""

    def filter(self, record):
        if isinstance(record.args, dict):
            record.args = sanitize(record.args)
        elif isinstance(record.args, tuple):
            record.args = tuple(sanitize(item) for item in record.args)
        elif record.args is not None:
            record.args = sanitize(record.args)
        if isinstance(record.msg, str) and not record.args:
            record.msg = redact_text(record.msg)
        return True


class RedactingFormatter(logging.Formatter):
    """Format a LogRecord as a single redacted JSON object."""

    def format(self, record):
        clean = copy.copy(record)
        if isinstance(clean.args, dict):
            clean.args = sanitize(clean.args)
        elif isinstance(clean.args, tuple):
            clean.args = tuple(sanitize(item) for item in clean.args)
        elif clean.args is not None:
            clean.args = sanitize(clean.args)
        try:
            message = clean.getMessage()
        except Exception:
            message = str(clean.msg)
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_text(message),
        }
        if record.exc_info:
            try:
                exception = self.formatException(record.exc_info)
            except Exception:
                exception = "exception formatting failed"
            payload["exception"] = redact_text(exception)
        if record.stack_info:
            payload["stack"] = redact_text(self.formatStack(record.stack_info))
        for key, value in record.__dict__.items():
            if key in STANDARD_RECORD_KEYS or key.startswith("_"):
                continue
            name = str(key)[:MAX_KEY_LENGTH]
            payload[name] = REDACTED if _is_sensitive_key(name) else sanitize(value)
        return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def _make_handler(kind, target=None):
    if kind == "file":
        handler = logging.FileHandler(str(target), encoding="utf-8")
        handler._firewall_ops_path = target
        try:
            os.chmod(target, 0o600)
        except OSError:
            pass
    else:
        handler = logging.StreamHandler(sys.stderr)
    handler._firewall_ops_handler = True
    handler._firewall_ops_kind = kind
    handler.setLevel(logging.INFO)
    handler.addFilter(RedactingFilter())
    handler.setFormatter(RedactingFormatter())
    return handler


def configure_logging(log_dir=None, level=logging.INFO):
    """Install one stderr handler and one JSONL file handler, without duplicates."""
    root = logging.getLogger()
    try:
        target = (Path(log_dir) if log_dir is not None else get_log_dir()).resolve()
        target.mkdir(parents=True, exist_ok=True, mode=0o700)
        log_file = target / "app.jsonl"
    except OSError:
        logger.warning("could not prepare the application log directory")
        target = None
        log_file = None

    active = {"stderr": False, "file": False}
    for handler in list(root.handlers):
        if not getattr(handler, "_firewall_ops_handler", False):
            continue
        kind = getattr(handler, "_firewall_ops_kind", "")
        stale = kind not in active
        if kind == "file" and getattr(handler, "_firewall_ops_path", None) != log_file:
            stale = True
        if stale or active.get(kind, True):
            root.removeHandler(handler)
            handler.close()
            continue
        active[kind] = True

    if not active["stderr"]:
        root.addHandler(_make_handler("stderr"))
    if log_file is not None and not active["file"]:
        root.addHandler(_make_handler("file", log_file))
    root.setLevel(level)
