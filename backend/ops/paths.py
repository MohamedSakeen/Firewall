"""Shared filesystem paths for local operations tooling.

The log directory can be redirected with FIREWALL_LOG_DIR. Traversal segments
are ignored so a misconfigured value cannot point outside the intended tree.
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_LOG_DIR = BACKEND_DIR / "logs"


def get_log_dir():
    """Resolve the local log directory, relative paths anchored at backend/."""
    raw = os.getenv("FIREWALL_LOG_DIR", "").strip()
    if not raw:
        return DEFAULT_LOG_DIR
    path = Path(raw).expanduser()
    if ".." in path.parts:
        logger.warning("FIREWALL_LOG_DIR must not contain '..'; using the default log directory")
        return DEFAULT_LOG_DIR
    if not path.is_absolute():
        path = BACKEND_DIR / path
    return path
