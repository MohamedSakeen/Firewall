"""Local alert queue with an optional loopback-only webhook.

Alerts are appended as redacted JSON lines to ``logs/notifications.jsonl``.
A webhook is optional and is only ever contacted on a loopback host, with no
URL credentials, no redirects and a short timeout. Delivery failures never
interrupt capture.
"""

import json
import logging
import os
import threading
import time
from collections import OrderedDict, deque
from datetime import datetime, timezone
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from ops import metrics
from ops.logging_config import redact_text, sanitize
from ops.paths import get_log_dir

logger = logging.getLogger(__name__)

LEVELS = frozenset({"info", "warning", "high", "critical", "error"})
ERROR_LEVELS = frozenset({"error", "critical"})
ALLOWED_WEBHOOK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})
DEDUP_WINDOW_SECONDS = 300
DEDUP_MAX_ENTRIES = 256
WEBHOOK_TIMEOUT_SECONDS = 3
MAX_TITLE_LENGTH = 120
MAX_DETAIL_LENGTH = 1000
MAX_LIST_LIMIT = 1000
RECENT_SCAN_LIMIT = 500

_clock = time.monotonic
_wall_clock = time.time
_lock = threading.Lock()
_seen = OrderedDict()


class _NoRedirectHandler(HTTPRedirectHandler):
    """Refuse webhook redirects instead of following arbitrary URLs."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_webhook_opener = build_opener(_NoRedirectHandler())


def _open_webhook(request, timeout):
    return _webhook_opener.open(request, timeout=timeout)


def validate_webhook_url(raw):
    """Return the loopback host for a safe webhook URL, or None otherwise."""
    if not isinstance(raw, str) or not raw.strip():
        return None
    try:
        parts = urlsplit(raw.strip())
        host = parts.hostname
    except ValueError:
        return None
    if parts.scheme.lower() not in {"http", "https"}:
        return None
    if parts.username or parts.password or not host:
        return None
    host = host.strip().lower()
    return host if host in ALLOWED_WEBHOOK_HOSTS else None


def _clean_detail(detail):
    if isinstance(detail, dict):
        value = json.dumps(sanitize(detail), sort_keys=True, separators=(",", ":"))
    else:
        value = redact_text(detail)
    return value[:MAX_DETAIL_LENGTH]


def _alert_path():
    return get_log_dir() / "notifications.jsonl"


def queue_alert(level, title, detail=""):
    """Write one deduplicated, redacted alert line. Returns True if queued."""
    if not isinstance(level, str):
        raise ValueError("level must be a string")
    normalized = level.strip().lower()
    if normalized not in LEVELS:
        raise ValueError("level must be one of: " + ", ".join(sorted(LEVELS)))
    if not isinstance(title, str) or not title.strip():
        raise ValueError("title must be a non-empty string")
    clean_title = redact_text(" ".join(title.split()))[:MAX_TITLE_LENGTH]
    clean_detail = _clean_detail(detail)

    key = (normalized, clean_title, clean_detail)
    now = _clock()
    with _lock:
        previous = _seen.get(key)
        if previous is not None and now - previous < DEDUP_WINDOW_SECONDS:
            return False
        _seen[key] = now
        while len(_seen) > DEDUP_MAX_ENTRIES:
            _seen.popitem(last=False)

    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    record = {
        "timestamp": timestamp,
        "level": normalized,
        "title": clean_title,
        "detail": clean_detail,
    }
    path = _alert_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n")
        os.chmod(path, 0o600)
    except OSError:
        logger.warning("could not write local alert notification")
        return False

    try:
        metrics.set_gauge("alert_queue_depth", len(list_alerts(limit=MAX_LIST_LIMIT)))
    except Exception:
        logger.warning("could not update alert gauge")

    raw_webhook = os.getenv("FIREWALL_ALERT_WEBHOOK_URL", "").strip()
    if raw_webhook:
        _deliver_webhook(raw_webhook, record)
    return True


def _deliver_webhook(raw_url, record):
    host = validate_webhook_url(raw_url)
    if host is None:
        safe_host = ""
        try:
            safe_host = urlsplit(raw_url).hostname or ""
        except ValueError:
            pass
        logger.warning("alert webhook rejected: host %r is not allowed", redact_text(safe_host)[:64])
        return
    try:
        request = Request(
            raw_url,
            data=json.dumps(record, sort_keys=True, separators=(",", ":")).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _open_webhook(request, timeout=WEBHOOK_TIMEOUT_SECONDS) as response:
            response.read(1024)
    except Exception:
        logger.warning("alert webhook delivery failed")


def list_alerts(limit=50):
    """Return recent alerts, newest first, without exposing file paths."""
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= MAX_LIST_LIMIT:
        raise ValueError(f"limit must be between 1 and {MAX_LIST_LIMIT}")
    path = _alert_path()
    if not path.is_file():
        return []
    try:
        with path.open("r", encoding="utf-8") as handle:
            lines = list(deque(handle, maxlen=limit))
    except OSError:
        logger.warning("could not read local alert notifications")
        return []
    alerts = []
    for line in reversed(lines):
        try:
            record = json.loads(line)
        except (TypeError, ValueError):
            continue
        if isinstance(record, dict):
            alerts.append(record)
    return alerts


def recent_error_count(window_seconds=3600):
    """Count error/critical alerts from the recent window."""
    if isinstance(window_seconds, bool) or not isinstance(window_seconds, (int, float)):
        raise ValueError("window_seconds must be a number")
    now = _wall_clock()
    count = 0
    for record in list_alerts(limit=RECENT_SCAN_LIMIT):
        if record.get("level") not in ERROR_LEVELS:
            continue
        try:
            stamp = datetime.fromisoformat(
                str(record.get("timestamp", "")).replace("Z", "+00:00")
            ).timestamp()
        except (TypeError, ValueError):
            continue
        if 0 <= now - stamp <= window_seconds:
            count += 1
    return count
