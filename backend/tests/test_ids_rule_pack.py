"""Versioned IDS rule-pack loading and strict validation."""

import copy
import hashlib
import json
import shutil

import pytest

from engine.rules.ids_pack import (
    DEFAULT_IDS_DIR,
    MANIFEST_NAME,
    RulePackError,
    load_ids_rules,
    validate_manifest,
)
from engine.rules.validator import (
    RuleValidationError,
    validate_rule,
    validate_rule_pack,
    validate_rules,
)

VALID_RULE = {
    "id": "TEST-001",
    "name": "Test Rule",
    "type": "port_scan",
    "threshold": 10,
    "time_window": 5,
    "severity": "medium",
    "score": 25,
    "action": "alert",
    "description": "Synthetic rule used by tests",
}


def _manifest():
    return json.loads((DEFAULT_IDS_DIR / MANIFEST_NAME).read_text(encoding="utf-8"))


def test_bundled_rule_pack_loads_with_version_and_checksums():
    pack = load_ids_rules()
    manifest = _manifest()

    assert pack.version == "1.0.0"
    assert pack.schema_version == 1
    assert len(pack.rules) == 13
    assert len(pack.rule_ids) == len(set(pack.rule_ids))
    assert all(entry["sha256"] for entry in manifest["rules"])
    assert pack.rules_of_type("port_scan")
    assert pack.rules_of_type("syn_flood")
    assert pack.rules_of_type("udp_flood")
    assert len(pack.rules_of_type("icmp_flood")) == 1


def test_manifest_validation_rejects_unknown_fields_and_bad_versions():
    manifest = _manifest()
    manifest["unexpected"] = True
    with pytest.raises(RulePackError, match="unknown fields"):
        validate_manifest(manifest, source="test-manifest")

    manifest = _manifest()
    manifest["schema_version"] = 99
    with pytest.raises(RulePackError, match="unsupported schema_version"):
        validate_manifest(manifest, source="test-manifest")

    manifest = _manifest()
    manifest["pack_version"] = "latest"
    with pytest.raises(RulePackError, match="pack_version"):
        validate_manifest(manifest, source="test-manifest")


def test_loader_rejects_checksum_mismatch(tmp_path):
    for entry in _manifest()["rules"]:
        shutil.copy(DEFAULT_IDS_DIR / entry["file"], tmp_path / entry["file"])
    manifest = _manifest()
    manifest["rules"][0]["sha256"] = "0" * 64
    (tmp_path / MANIFEST_NAME).write_text(json.dumps(manifest), encoding="utf-8")

    with pytest.raises(RulePackError, match="checksum mismatch for auth_rules.json"):
        load_ids_rules(tmp_path)


@pytest.mark.parametrize("filename", ["../auth_rules.json", "subdir/rules.json", "rules.txt"])
def test_loader_rejects_unsafe_manifest_filenames(tmp_path, filename):
    manifest = _manifest()
    manifest["rules"] = [{"file": filename, "sha256": "0" * 64}]
    (tmp_path / MANIFEST_NAME).write_text(json.dumps(manifest), encoding="utf-8")

    with pytest.raises(RulePackError, match="plain .json filename"):
        load_ids_rules(tmp_path)


def test_loader_rejects_missing_manifest_by_default(tmp_path):
    shutil.copy(DEFAULT_IDS_DIR / "recon_rules.json", tmp_path / "recon_rules.json")
    with pytest.raises(RulePackError, match="missing IDS rule pack manifest"):
        load_ids_rules(tmp_path)


def test_legacy_loader_accepts_existing_list_and_single_rule_formats(tmp_path):
    (tmp_path / "recon_rules.json").write_text(json.dumps([VALID_RULE]), encoding="utf-8")
    second = dict(VALID_RULE, id="TEST-002")
    (tmp_path / "flood_rules.json").write_text(json.dumps(second), encoding="utf-8")
    (tmp_path / "suppression.json").write_text("{}", encoding="utf-8")

    pack = load_ids_rules(tmp_path, allow_legacy=True)

    assert pack.version == "unversioned"
    assert set(pack.rule_ids) == {"TEST-001", "TEST-002"}


@pytest.mark.parametrize("field,value", [
    ("action", "execute"),
    ("severity", "info"),
    ("type", "arbitrary_code"),
    ("threshold", "10"),
    ("threshold", True),
    ("threshold", 0),
    ("time_window", 0),
    ("score", 101),
    ("id", "lowercase-id"),
])
def test_validator_rejects_out_of_schema_values(field, value):
    rule = dict(VALID_RULE, **{field: value})
    with pytest.raises(RuleValidationError, match=field):
        validate_rule(rule, source="test-rule")


def test_validator_rejects_unknown_fields_and_non_objects():
    rule = dict(VALID_RULE, payload="DROP TABLE")
    with pytest.raises(RuleValidationError, match="unknown fields.*payload"):
        validate_rule(rule, source="test-rule")

    with pytest.raises(RuleValidationError, match="must be a JSON object"):
        validate_rule(["not", "a", "rule"], source="test-rule")


def test_validator_requires_all_strict_fields():
    rule = copy.deepcopy(VALID_RULE)
    del rule["score"]
    with pytest.raises(RuleValidationError, match="missing required fields: score"):
        validate_rule(rule, source="test-rule")


def test_validator_rejects_duplicate_rule_ids_in_a_pack():
    with pytest.raises(RuleValidationError, match="duplicate rule id 'TEST-001'"):
        validate_rule_pack([VALID_RULE, dict(VALID_RULE)], source="test-pack")


def test_validator_accepts_only_allow_listed_fields():
    validated = validate_rule(dict(VALID_RULE, service="SSH", target_port=22))
    assert validated["target_port"] == 22
    assert validate_rules(VALID_RULE) is True
    assert validate_rules(dict(VALID_RULE, action="exec")) is False


def test_threshold_overrides_stay_validated():
    pack = load_ids_rules()
    adjusted = pack.with_thresholds({"RECON-001": 20})
    assert adjusted.rules_of_type("port_scan")[0]["threshold"] == 20
    assert pack.rules_of_type("port_scan")[0]["threshold"] == 10

    with pytest.raises(RuleValidationError, match="threshold"):
        pack.with_thresholds({"RECON-001": "twenty"})


def test_manifest_checksums_match_bundled_files():
    for entry in _manifest()["rules"]:
        digest = hashlib.sha256((DEFAULT_IDS_DIR / entry["file"]).read_bytes()).hexdigest()
        assert digest == entry["sha256"]
