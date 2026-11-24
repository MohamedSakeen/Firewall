"""Strict validation for IDS rule data.

Rules are plain JSON data.  This module never evaluates rule text as code and
only accepts an allow-list of fields, types, severities and actions.
"""

import re

# Kept for callers of the legacy boolean helper below.
REQUIRED_FIELDS = ["name", "type", "severity", "threshold"]

ALLOWED_RULE_FIELDS = frozenset({
    "id",
    "name",
    "type",
    "service",
    "target_port",
    "threshold",
    "time_window",
    "severity",
    "score",
    "action",
    "description",
})
STRICT_REQUIRED_FIELDS = (
    "id", "name", "type", "threshold", "time_window", "severity", "score", "action"
)

ALLOWED_RULE_TYPES = frozenset({
    "auth_brute_force",
    "port_scan",
    "udp_scan",
    "stealth_scan",
    "smb_enum",
    "syn_flood",
    "udp_flood",
    "icmp_flood",
    "http_flood",
})
ALLOWED_SEVERITIES = frozenset({"low", "medium", "high", "critical"})
ALLOWED_ACTIONS = frozenset({"alert", "temporary_block", "rate_limit", "quarantine"})

RULE_ID_PATTERN = re.compile(r"^[A-Z][A-Z0-9_-]{1,31}$")


class RuleValidationError(ValueError):
    """Raised when a rule or rule pack does not match the allow-list schema."""


def _require_int(rule, field, source, *, minimum=1, maximum=None):
    value = rule[field]
    if type(value) is not int:
        raise RuleValidationError(f"{source}: field '{field}' must be an integer")
    if value < minimum or (maximum is not None and value > maximum):
        bound = f"{minimum}..{maximum}" if maximum is not None else f">= {minimum}"
        raise RuleValidationError(f"{source}: field '{field}' must be {bound}; got {value}")
    return value


def _require_string(rule, field, source, *, maximum=120):
    value = rule[field]
    if not isinstance(value, str) or not value.strip():
        raise RuleValidationError(f"{source}: field '{field}' must be a non-empty string")
    result = value.strip()
    if len(result) > maximum:
        raise RuleValidationError(f"{source}: field '{field}' exceeds {maximum} characters")
    return result


def validate_rule(rule, source="<rule>"):
    """Return a validated copy of one rule, or raise RuleValidationError."""
    if not isinstance(rule, dict):
        raise RuleValidationError(f"{source}: rule must be a JSON object, got {type(rule).__name__}")

    unknown = sorted(set(rule) - ALLOWED_RULE_FIELDS)
    if unknown:
        raise RuleValidationError(f"{source}: unknown fields are not allowed: {', '.join(unknown)}")

    missing = [field for field in STRICT_REQUIRED_FIELDS if field not in rule]
    if missing:
        raise RuleValidationError(f"{source}: missing required fields: {', '.join(missing)}")

    clean = dict(rule)
    clean["id"] = _require_string(clean, "id", source, maximum=32)
    if not RULE_ID_PATTERN.fullmatch(clean["id"]):
        raise RuleValidationError(f"{source}: field 'id' must look like RECON-001")

    clean["name"] = _require_string(clean, "name", source)
    clean["type"] = _require_string(clean, "type", source, maximum=48)
    if clean["type"] not in ALLOWED_RULE_TYPES:
        allowed = ", ".join(sorted(ALLOWED_RULE_TYPES))
        raise RuleValidationError(f"{source}: field 'type' must be one of: {allowed}")

    clean["severity"] = _require_string(clean, "severity", source, maximum=16)
    if clean["severity"] not in ALLOWED_SEVERITIES:
        allowed = ", ".join(sorted(ALLOWED_SEVERITIES))
        raise RuleValidationError(f"{source}: field 'severity' must be one of: {allowed}")

    clean["action"] = _require_string(clean, "action", source, maximum=32)
    if clean["action"] not in ALLOWED_ACTIONS:
        allowed = ", ".join(sorted(ALLOWED_ACTIONS))
        raise RuleValidationError(f"{source}: field 'action' must be one of: {allowed}")

    clean["threshold"] = _require_int(clean, "threshold", source, minimum=1, maximum=1_000_000)
    clean["time_window"] = _require_int(clean, "time_window", source, minimum=1, maximum=86_400)
    clean["score"] = _require_int(clean, "score", source, minimum=0, maximum=100)

    if "description" in clean:
        clean["description"] = _require_string(clean, "description", source, maximum=256)
    if "service" in clean:
        clean["service"] = _require_string(clean, "service", source, maximum=48)
    if "target_port" in clean:
        clean["target_port"] = _require_int(clean, "target_port", source, minimum=1, maximum=65_535)

    return clean


def validate_rule_pack(rules, source="<rule pack>"):
    """Validate a sequence of rules and reject duplicate rule IDs."""
    if not isinstance(rules, (list, tuple)) or not rules:
        raise RuleValidationError(f"{source}: expected a non-empty list of rules")

    validated = []
    seen = {}
    for index, rule in enumerate(rules):
        rule_source = f"{source}[{index}]"
        clean = validate_rule(rule, rule_source)
        if clean["id"] in seen:
            raise RuleValidationError(
                f"{rule_source}: duplicate rule id '{clean['id']}' (already in {seen[clean['id']]})"
            )
        seen[clean["id"]] = rule_source
        validated.append(clean)
    return tuple(validated)


def validate_rules(rule):
    """Legacy boolean helper; use validate_rule for actionable errors."""
    try:
        validate_rule(rule)
    except RuleValidationError:
        return False
    return True
