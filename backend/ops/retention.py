"""Retention for generated log files.

Only flat ``.log`` and ``.jsonl`` files directly inside the configured log
directory are eligible. Symlinks, subdirectories and other suffixes are left
untouched.
"""

import logging
import os
import time
from pathlib import Path

from ops.paths import get_log_dir

logger = logging.getLogger(__name__)

ALLOWED_SUFFIXES = frozenset({".jsonl", ".log"})
DEFAULT_LOG_RETENTION_DAYS = 30
MAX_LOG_RETENTION_DAYS = 3650
SECONDS_PER_DAY = 24 * 60 * 60

_now = time.time


def get_log_retention_days():
    """Read FIREWALL_LOG_RETENTION_DAYS with a safe default."""
    raw = os.getenv("FIREWALL_LOG_RETENTION_DAYS", "").strip()
    if not raw:
        return DEFAULT_LOG_RETENTION_DAYS
    try:
        days = int(raw)
    except ValueError:
        logger.warning("Invalid FIREWALL_LOG_RETENTION_DAYS; using %d", DEFAULT_LOG_RETENTION_DAYS)
        return DEFAULT_LOG_RETENTION_DAYS
    if not 1 <= days <= MAX_LOG_RETENTION_DAYS:
        logger.warning(
            "FIREWALL_LOG_RETENTION_DAYS must be between 1 and %d; using %d",
            MAX_LOG_RETENTION_DAYS,
            DEFAULT_LOG_RETENTION_DAYS,
        )
        return DEFAULT_LOG_RETENTION_DAYS
    return days


def _validate_days(days):
    if isinstance(days, bool) or not isinstance(days, int):
        raise ValueError("days must be a positive integer")
    if not 1 <= days <= MAX_LOG_RETENTION_DAYS:
        raise ValueError(f"days must be between 1 and {MAX_LOG_RETENTION_DAYS}")
    return days


def prune_log_files(days=None, log_dir=None, log=None):
    """Delete expired log files and return the number removed."""
    log = log or logger
    days = get_log_retention_days() if days is None else _validate_days(days)
    root = Path(log_dir) if log_dir is not None else get_log_dir()
    try:
        root = root.resolve()
        if not root.is_dir():
            return 0
        cutoff = _now() - days * SECONDS_PER_DAY
        candidates = list(root.iterdir())
    except OSError:
        log.warning("could not inspect the log directory for pruning")
        return 0

    removed = 0
    for candidate in candidates:
        if candidate.is_symlink() or candidate.suffix.lower() not in ALLOWED_SUFFIXES:
            continue
        try:
            if not candidate.is_file() or candidate.parent.resolve() != root:
                continue
            if candidate.stat().st_mtime >= cutoff:
                continue
            candidate.unlink()
        except OSError:
            log.warning("could not prune an expired log file")
            continue
        removed += 1
    return removed
