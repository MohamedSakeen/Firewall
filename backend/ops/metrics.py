"""Thread-safe process counters and gauges for local operations reporting.

All labels are fixed strings (status classes); request paths, IP addresses and
other request data are never used as labels.
"""

import threading

COUNTER_NAMES = (
    "packets",
    "alerts",
    "blocks",
    "unblocks",
    "event_writes",
    "event_write_failures",
    "enforcement_failures",
    "sniffer_errors",
)
GAUGE_NAMES = ("sniffer_active", "alert_queue_depth")
HTTP_STATUS_CLASSES = ("1xx", "2xx", "3xx", "4xx", "5xx", "unknown")


class Metrics:
    """In-memory counters and gauges guarded by a single lock."""

    def __init__(self):
        self._lock = threading.Lock()
        self._counters = {name: 0 for name in COUNTER_NAMES}
        self._gauges = {name: 0 for name in GAUGE_NAMES}
        self._http = {name: 0 for name in HTTP_STATUS_CLASSES}

    def increment(self, name, amount=1):
        if name not in self._counters:
            raise ValueError(f"unknown counter: {name}")
        if isinstance(amount, bool) or not isinstance(amount, int) or amount < 0:
            raise ValueError("amount must be a non-negative integer")
        with self._lock:
            self._counters[name] += amount

    def increment_http(self, status_code):
        try:
            code = int(status_code)
        except (TypeError, ValueError):
            code = 0
        name = f"{code // 100}xx" if 100 <= code < 600 else "unknown"
        with self._lock:
            self._http[name] += 1

    def set_gauge(self, name, value):
        if name not in self._gauges:
            raise ValueError(f"unknown gauge: {name}")
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("gauge values must be integers")
        with self._lock:
            self._gauges[name] = value

    def snapshot(self):
        with self._lock:
            return {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "http_requests_by_status_class": dict(self._http),
            }

    def reset(self):
        with self._lock:
            self._counters = {name: 0 for name in COUNTER_NAMES}
            self._gauges = {name: 0 for name in GAUGE_NAMES}
            self._http = {name: 0 for name in HTTP_STATUS_CLASSES}


global_metrics = Metrics()


def increment(name, amount=1):
    global_metrics.increment(name, amount)


def increment_http(status_code):
    global_metrics.increment_http(status_code)


def set_gauge(name, value):
    global_metrics.set_gauge(name, value)


def snapshot():
    return global_metrics.snapshot()


def reset():
    global_metrics.reset()


def render_prometheus(data=None):
    """Render a snapshot as a simple Prometheus text exposition."""
    data = snapshot() if data is None else data
    counters = data.get("counters", {})
    gauges = data.get("gauges", {})
    http = data.get("http_requests_by_status_class", {})
    lines = []

    for name in COUNTER_NAMES:
        metric = f"firewall_{name}_total"
        lines.append(f"# TYPE {metric} counter")
        lines.append(f"{metric} {int(counters.get(name, 0))}")

    lines.append("# TYPE firewall_http_requests_total counter")
    for name in HTTP_STATUS_CLASSES:
        lines.append(
            f'firewall_http_requests_total{{status_class="{name}"}} {int(http.get(name, 0))}'
        )

    for name in GAUGE_NAMES:
        metric = f"firewall_{name}"
        lines.append(f"# TYPE {metric} gauge")
        lines.append(f"{metric} {int(gauges.get(name, 0))}")

    return "\n".join(lines) + "\n"
