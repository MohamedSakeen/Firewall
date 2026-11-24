"""Capture-only entry point for the firewall lab.

Run with FIREWALL_ROLE=worker and FIREWALL_ENABLE_SNIFFER=1 to capture traffic
without binding an HTTP or WebSocket server. Capture remains opt-in; this
entry point never enables it implicitly.
"""

import logging
import sys
from pathlib import Path

BACKEND_DIR = str(Path(__file__).resolve().parent)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from api.api import get_firewall_role, run_worker  # noqa: E402

logger = logging.getLogger(__name__)


def main():
    """Run the capture worker; return a process exit code."""
    role = get_firewall_role()
    if role == "api":
        logger.error("FIREWALL_ROLE=api disables capture; refusing to start worker")
        return 2
    return run_worker()


if __name__ == "__main__":
    raise SystemExit(main())
