import json
import logging
import os
import re
import tempfile
from pathlib import Path

from flask import Blueprint, jsonify, request

rules_bp = Blueprint("rules", __name__, url_prefix="/api")

BASE = Path(__file__).resolve().parent.parent.parent / "engine" / "rules"
logger = logging.getLogger(__name__)
FILENAME_RE = re.compile(r"^[A-Za-z0-9._-]+\.json$")

VALID_TYPES = {"firewall", "ids", "ips", "scoring"}


def _resolve_path(rule_type):
    dir_map = {
        "firewall": BASE / "firewall",
        "ids": BASE / "IDS",
        "ips": BASE / "IPS",
        "scoring": BASE / "scoring",
    }
    return dir_map.get(rule_type)


def _resolve_file(rule_type, filename):
    if rule_type not in VALID_TYPES:
        return None
    if not isinstance(filename, str) or ".." in filename or not FILENAME_RE.fullmatch(filename):
        return None
    dir_path = _resolve_path(rule_type)
    if not dir_path:
        return None
    base = dir_path.resolve()
    candidate = (base / filename).resolve()
    if candidate.parent != base:
        return None
    return candidate


def _atomic_write_json(path, payload):
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def _type_matches(value, sample):
    if isinstance(sample, bool):
        return isinstance(value, bool)
    if isinstance(sample, int):
        return isinstance(value, int) and not isinstance(value, bool)
    if isinstance(sample, float):
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if isinstance(sample, str):
        return isinstance(value, str)
    if sample is None:
        return value is None
    if isinstance(sample, list):
        return isinstance(value, list)
    if isinstance(sample, dict):
        return isinstance(value, dict)
    return True


def _is_dynamic_map(sample):
    values = list(sample.values())
    return (
        len(sample) >= 4
        and all(isinstance(v, (str, int, float, bool)) for v in values)
        and len({type(v) for v in values}) == 1
    )


def _validate_shape(value, sample):
    if isinstance(sample, dict):
        if not isinstance(value, dict):
            return False
        dynamic = _is_dynamic_map(sample)
        if not dynamic and set(value) - set(sample):
            return False
        for key, item in value.items():
            if dynamic:
                if not _type_matches(item, next(iter(sample.values()))):
                    return False
                continue
            if key not in sample or not _type_matches(item, sample[key]):
                return False
            if isinstance(item, (dict, list)) and not _validate_shape(item, sample[key]):
                return False
        return True

    if isinstance(sample, list):
        if not isinstance(value, list) or not sample:
            return isinstance(value, list)
        sample_item = sample[0]
        if isinstance(sample_item, dict):
            allowed_keys = set()
            for entry in sample:
                if isinstance(entry, dict):
                    allowed_keys.update(entry.keys())
            missing = object()
            for item in value:
                if not isinstance(item, dict) or set(item) - allowed_keys:
                    return False
                for key, child in item.items():
                    reference = sample_item.get(key, missing)
                    if reference is missing:
                        reference = next(
                            (entry[key] for entry in sample if isinstance(entry, dict) and key in entry),
                            missing,
                        )
                    if reference is missing or not _type_matches(child, reference):
                        return False
                    if isinstance(child, (dict, list)) and not _validate_shape(child, reference):
                        return False
            return True
        for item in value:
            if not _type_matches(item, sample_item):
                return False
            if isinstance(item, (dict, list)) and not _validate_shape(item, sample_item):
                return False
        return True

    return _type_matches(value, sample)


@rules_bp.route("/rules/<rule_type>")
def get_rules(rule_type):
    if rule_type not in VALID_TYPES:
        return jsonify({"error": "invalid type"}), 400
    dir_path = _resolve_path(rule_type)
    if not dir_path or not dir_path.exists():
        return jsonify({})
    files = {}
    for p in sorted(dir_path.iterdir()):
        if p.is_file() and p.suffix == ".json":
            try:
                with p.open("r", encoding="utf-8") as f:
                    files[p.name] = json.load(f)
            except Exception:
                files[p.name] = {"error": f"failed to parse {p.name}"}
    return jsonify(files)


@rules_bp.route("/rules/<rule_type>/<filename>", methods=["PUT"])
def save_rule(rule_type, filename):
    path = _resolve_file(rule_type, filename)
    if path is None:
        return jsonify({"error": "invalid rule file"}), 400
    if not path.is_file():
        return jsonify({"error": "rule file not found"}), 404

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "invalid JSON"}), 400

    try:
        with path.open("r", encoding="utf-8") as f:
            sample = json.load(f)
    except Exception:
        logger.warning("could not read rule file for validation")
        return jsonify({"error": "unable to validate rule file"}), 500
    if not _validate_shape(data, sample):
        return jsonify({"error": "rule payload does not match the file schema"}), 400

    try:
        _atomic_write_json(path, data)
    except Exception:
        logger.exception("could not write rule file")
        return jsonify({"error": "unable to save rule"}), 500
    return jsonify({"status": "saved", "file": filename})
