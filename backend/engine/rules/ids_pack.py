"""Versioned, checksummed loader for the bundled IDS rule pack.

The manifest is the only source of rule filenames, so auxiliary files such as
``suppression.json`` are never mistaken for detection rules.  All rule files are
parsed as JSON and validated against an allow-list; no rule text is executed.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Mapping

from .validator import (
    RuleValidationError,
    validate_rule,
    validate_rule_pack,
)

DEFAULT_IDS_DIR = Path(__file__).resolve().parent / "IDS"
MANIFEST_NAME = "manifest.json"
SUPPRESSION_NAME = "suppression.json"

MANIFEST_FIELDS = frozenset({"schema_version", "pack_version", "description", "rules"})
MANIFEST_RULE_FIELDS = frozenset({"file", "sha256"})
SUPPORTED_SCHEMA_VERSION = 1
_VERSION_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")
_SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")


class RulePackError(ValueError):
    """Raised when the rule pack manifest or a bundled rule file is invalid."""


@dataclass(frozen=True)
class RulePack:
    version: str
    schema_version: int
    rules: tuple[dict, ...]
    source: str

    def rules_of_type(self, *types: str) -> tuple[dict, ...]:
        allowed = frozenset(types)
        return tuple(rule for rule in self.rules if rule["type"] in allowed)

    @property
    def rule_ids(self) -> tuple[str, ...]:
        return tuple(rule["id"] for rule in self.rules)

    def with_thresholds(self, overrides: Mapping[str, int]) -> "RulePack":
        """Return a copy with validated threshold overrides (used by tests)."""
        changed = []
        for rule in self.rules:
            if rule["id"] not in overrides:
                changed.append(rule)
                continue
            updated = dict(rule)
            updated["threshold"] = overrides[rule["id"]]
            validate_rule(updated, f"override:{rule['id']}")
            changed.append(updated)
        return replace(self, rules=tuple(changed))


def _read_json(path: Path, label: str):
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise RulePackError(f"{label}: file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RulePackError(f"{label}: invalid JSON in {path}: {exc}") from exc
    except OSError as exc:
        raise RulePackError(f"{label}: cannot read {path}: {exc}") from exc


def _extract_rules(data, path: Path):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("rules"), list):
        return data["rules"]
    if isinstance(data, dict):
        return [data]
    raise RulePackError(f"{path}: rule file must contain a rule object, a list, or a 'rules' list")


def validate_manifest(data, source="<manifest>") -> dict:
    """Validate manifest metadata and return a normalized copy."""
    if not isinstance(data, dict):
        raise RulePackError(f"{source}: manifest must be a JSON object")

    unknown = sorted(set(data) - MANIFEST_FIELDS)
    if unknown:
        raise RulePackError(f"{source}: unknown fields are not allowed: {', '.join(unknown)}")

    missing = sorted(MANIFEST_FIELDS - set(data))
    if missing:
        raise RulePackError(f"{source}: missing required fields: {', '.join(missing)}")

    schema_version = data["schema_version"]
    if type(schema_version) is not int:
        raise RulePackError(f"{source}: field 'schema_version' must be an integer")
    if schema_version != SUPPORTED_SCHEMA_VERSION:
        raise RulePackError(
            f"{source}: unsupported schema_version {schema_version}; "
            f"this loader supports {SUPPORTED_SCHEMA_VERSION}"
        )

    version = data["pack_version"]
    if not isinstance(version, str) or not _VERSION_PATTERN.fullmatch(version):
        raise RulePackError(f"{source}: field 'pack_version' must look like 1.0.0")

    description = data["description"]
    if not isinstance(description, str) or not description.strip() or len(description) > 200:
        raise RulePackError(f"{source}: field 'description' must be a short non-empty string")

    entries = data["rules"]
    if not isinstance(entries, list) or not entries:
        raise RulePackError(f"{source}: field 'rules' must be a non-empty list")

    normalized = []
    seen_files = set()
    for index, entry in enumerate(entries):
        item_source = f"{source}.rules[{index}]"
        if not isinstance(entry, dict):
            raise RulePackError(f"{item_source}: entry must be a JSON object")
        unknown_entry = sorted(set(entry) - MANIFEST_RULE_FIELDS)
        if unknown_entry:
            raise RulePackError(
                f"{item_source}: unknown fields are not allowed: {', '.join(unknown_entry)}"
            )
        missing_entry = sorted(MANIFEST_RULE_FIELDS - set(entry))
        if missing_entry:
            raise RulePackError(f"{item_source}: missing fields: {', '.join(missing_entry)}")

        filename = entry["file"]
        if (
            not isinstance(filename, str)
            or not filename
            or Path(filename).name != filename
            or not filename.endswith(".json")
            or ".." in filename
        ):
            raise RulePackError(f"{item_source}: field 'file' must be a plain .json filename")
        if filename in seen_files:
            raise RulePackError(f"{item_source}: duplicate rule file '{filename}'")
        seen_files.add(filename)

        checksum = entry["sha256"]
        if not isinstance(checksum, str) or not _SHA256_PATTERN.fullmatch(checksum):
            raise RulePackError(f"{item_source}: field 'sha256' must be 64 lowercase hex characters")

        normalized.append({"file": filename, "sha256": checksum})

    return {
        "schema_version": schema_version,
        "pack_version": version,
        "description": description.strip(),
        "rules": tuple(normalized),
    }


def _load_rule_file(directory: Path, entry: dict, source: str):
    path = directory / entry["file"]
    resolved = path.resolve()
    if resolved.parent != directory.resolve() or not resolved.is_file():
        raise RulePackError(f"{source}: rule file escapes the rule directory: {entry['file']}")

    digest = hashlib.sha256(resolved.read_bytes()).hexdigest()
    if digest != entry["sha256"]:
        raise RulePackError(
            f"{source}: checksum mismatch for {entry['file']} "
            f"(expected {entry['sha256']}, got {digest})"
        )

    data = _read_json(resolved, source)
    rules = _extract_rules(data, resolved)
    return validate_rule_pack(rules, source=str(resolved))


def _load_legacy(directory: Path) -> RulePack:
    paths = sorted(
        path for path in directory.glob("*.json")
        if path.name not in {MANIFEST_NAME, SUPPRESSION_NAME}
    )
    if not paths:
        raise RulePackError(f"{directory}: no rule files found for legacy loading")

    rules = []
    for path in paths:
        data = _read_json(path, f"legacy:{path.name}")
        rules.extend(validate_rule_pack(_extract_rules(data, path), source=str(path)))
    return RulePack(
        version="unversioned",
        schema_version=0,
        rules=tuple(rules),
        source=str(directory),
    )


def load_ids_rules(
    directory=None,
    manifest_path=None,
    *,
    allow_legacy: bool = False,
) -> RulePack:
    """Load and validate the IDS rule pack.

    By default a manifest with checksums is required.  ``allow_legacy`` accepts
    an unversioned directory of existing rule JSON files for compatibility.
    """
    rules_dir = Path(directory) if directory is not None else DEFAULT_IDS_DIR
    if not rules_dir.is_dir():
        raise RulePackError(f"IDS rules directory does not exist: {rules_dir}")

    manifest_file = Path(manifest_path) if manifest_path is not None else rules_dir / MANIFEST_NAME
    if not manifest_file.is_file():
        if allow_legacy:
            return _load_legacy(rules_dir)
        raise RulePackError(f"missing IDS rule pack manifest: {manifest_file}")

    manifest = validate_manifest(
        _read_json(manifest_file, f"manifest:{manifest_file.name}"),
        source=f"manifest:{manifest_file.name}",
    )
    rules = []
    for entry in manifest["rules"]:
        rules.extend(_load_rule_file(rules_dir, entry, source=f"rulepack:{entry['file']}"))

    return RulePack(
        version=manifest["pack_version"],
        schema_version=manifest["schema_version"],
        rules=tuple(rules),
        source=str(rules_dir),
    )
