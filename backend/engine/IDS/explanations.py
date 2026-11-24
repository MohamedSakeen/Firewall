"""Machine-readable alert explanations.

Reasons are built only from validated rule metadata and numeric observations.
Raw packet payloads, rule descriptions and arbitrary caller strings are never
copied into an alert reason.
"""

from __future__ import annotations

import re

from .results import DetectionResult

ALLOWED_REASON_KEYS = (
    "rule",
    "rule_id",
    "observed",
    "threshold",
    "window_seconds",
    "suppressed",
    "reason",
)
SAFE_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_.:-]{1,64}$")
ALLOWED_SUPPRESSION_REASONS = frozenset({"source_ip_allowlisted", "rule_id_suppressed"})
MAX_REASONS = 8
MAX_STRING_LENGTH = 64


def reason_for_result(result: DetectionResult) -> dict:
    """Build the canonical reason for one detector result."""
    return {
        "rule": result.detector,
        "rule_id": result.rule_id,
        "observed": int(result.observed),
        "threshold": int(result.threshold),
        "window_seconds": int(result.window_seconds),
    }


def suppressed_reason(reason: dict, reason_code: str) -> dict:
    """Annotate an existing reason as suppressed, without adding free text."""
    clean = sanitize_reasons([reason])[0]
    if reason_code not in ALLOWED_SUPPRESSION_REASONS:
        raise ValueError(f"unknown suppression reason: {reason_code}")
    clean["suppressed"] = True
    clean["reason"] = reason_code
    return clean


def sanitize_reasons(reasons) -> list:
    """Keep only allow-listed, bounded fields from caller-provided reasons."""
    if reasons is None:
        return []
    if not isinstance(reasons, (list, tuple)):
        raise ValueError("alert reasons must be a list of mappings")

    cleaned = []
    for item in reasons[:MAX_REASONS]:
        if not isinstance(item, dict):
            raise ValueError("each alert reason must be a mapping")
        entry = {}
        for key in ALLOWED_REASON_KEYS:
            if key not in item:
                continue
            value = item[key]
            if key in {"observed", "threshold", "window_seconds"}:
                if type(value) is int and 0 <= value <= 1_000_000:
                    entry[key] = value
            elif key == "suppressed":
                if type(value) is bool:
                    entry[key] = value
            elif key == "reason":
                if value in ALLOWED_SUPPRESSION_REASONS:
                    entry[key] = value
            elif isinstance(value, str):
                token = value[:MAX_STRING_LENGTH]
                if SAFE_TOKEN_PATTERN.fullmatch(token):
                    entry[key] = token
        # Keep only reasons that actually explain something: a bare rule name
        # without an observation or a suppression outcome is not useful.
        if "rule" in entry and len(entry) > 1:
            cleaned.append(entry)
    return cleaned
