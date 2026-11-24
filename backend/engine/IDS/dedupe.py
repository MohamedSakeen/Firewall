"""Limit repeated alerts for the same source and rule within one window."""

from __future__ import annotations

import threading
from time import time


class AlertDeduplicator:
    """Emit at most one alert per key in a trailing window."""

    def __init__(self):
        self._last_seen = {}
        self._lock = threading.RLock()

    def should_emit(self, key, window_seconds, now=None):
        current = time() if now is None else now
        with self._lock:
            previous = self._last_seen.get(key)
            if previous is not None and 0 <= current - previous < window_seconds:
                return False
            self._last_seen[key] = current
            return True

    def clear(self):
        with self._lock:
            self._last_seen.clear()


default_deduplicator = AlertDeduplicator()
