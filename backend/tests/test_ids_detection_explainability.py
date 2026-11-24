"""Deterministic detection, explanations, suppression and API exposure."""

import pytest

from api.services import live_store as live_store_mod
from engine.IDS import alert_manager, detection_pipeline as pipeline, suppression as suppression_mod
from engine.IDS.dedupe import AlertDeduplicator
from engine.IDS.tracker import clear_events
from engine.rules.ids_pack import load_ids_rules

from ids_traffic import (
    CASES,
    FROZEN_NOW,
    THRESHOLD_OVERRIDES,
    case_by_name,
    port_scan_packets,
)


@pytest.fixture
def test_pack():
    return load_ids_rules().with_thresholds(THRESHOLD_OVERRIDES)


@pytest.fixture(autouse=True)
def clean_detection_state():
    clear_events()
    suppression_mod.clear_suppression_events()
    yield
    clear_events()
    suppression_mod.clear_suppression_events()


def _run_case(case, pack, *, config=None, include_suppressed=False):
    clear_events()
    deduplicator = AlertDeduplicator()
    suppression = config or suppression_mod.parse_suppression_config({
        "version": 1, "source_ips": [], "rule_ids": []
    })
    captured = []

    def capture(attack, severity, src_ip, score, reasons=None, rule_id=None):
        alert = {
            "attack": attack,
            "severity": severity,
            "src_ip": src_ip,
            "score": score,
            "rule_id": rule_id,
            "reasons": reasons,
        }
        captured.append(alert)
        return alert

    for packet in case.packets:
        pipeline.run_detection_pipeline(
            packet,
            now=FROZEN_NOW,
            pack=pack,
            suppression=suppression,
            alert_factory=capture,
            deduplicator=deduplicator,
            include_suppressed=include_suppressed,
        )
    return captured


@pytest.mark.parametrize("case", CASES, ids=[case.name for case in CASES])
def test_documented_traffic_cases_are_repeatable(case, test_pack):
    first = _run_case(case, test_pack)
    second = _run_case(case, test_pack)

    assert first == second
    assert tuple(alert["rule_id"] for alert in first) == case.expected_rule_ids


@pytest.mark.parametrize("case_name,expected", [
    ("port_scan", {
        "rule": "scan:tcp_ports",
        "rule_id": "RECON-001",
        "observed": 20,
        "threshold": 20,
        "window_seconds": 5,
    }),
    ("syn_flood", {
        "rule": "flood:tcp_syn",
        "rule_id": "FLD-001",
        "observed": 20,
        "threshold": 20,
        "window_seconds": 3,
    }),
    ("udp_flood", {
        "rule": "flood:udp_packets",
        "rule_id": "FLD-002",
        "observed": 25,
        "threshold": 25,
        "window_seconds": 3,
    }),
])
def test_alerts_include_short_machine_readable_reasons(test_pack, case_name, expected):
    alerts = _run_case(case_by_name(case_name), test_pack)

    assert len(alerts) == 1
    assert alerts[0]["reasons"] == [expected]


def test_benign_traffic_produces_no_alert(test_pack):
    assert _run_case(case_by_name("benign"), test_pack) == []


def test_create_alert_sanitizes_reasons_and_keeps_payloads_out(tmp_path, monkeypatch):
    monkeypatch.setattr(alert_manager, "LOG_DIR", tmp_path)
    monkeypatch.setattr(alert_manager, "process_ips_action", lambda *args: None)

    alert = alert_manager.create_alert(
        "Port Scan",
        "medium",
        "192.0.2.50",
        25,
        reasons=[
            {"rule": "scan:tcp_ports", "observed": 42, "threshold": 20},
            {"rule": "scan:tcp_ports", "payload": "SECRET", "description": "canary-secret"},
        ],
        rule_id="RECON-001",
    )

    assert alert["reasons"] == [{"rule": "scan:tcp_ports", "observed": 42, "threshold": 20}]
    written = (tmp_path / "alerts.json").read_text(encoding="utf-8")
    assert "SECRET" not in written
    assert "canary-secret" not in written


def test_source_ip_suppression_filters_alert_with_clear_reason(test_pack):
    config = suppression_mod.parse_suppression_config({
        "version": 1,
        "source_ips": ["198.51.100.10/32"],
        "rule_ids": [],
    })
    case = case_by_name("port_scan")
    clear_events()
    deduplicator = AlertDeduplicator()

    def forbidden_alert(*args, **kwargs):
        raise AssertionError("suppressed detections must not emit alerts")

    for packet in case.packets:
        assert pipeline.run_detection_pipeline(
            packet,
            now=FROZEN_NOW,
            pack=test_pack,
            suppression=config,
            alert_factory=forbidden_alert,
            deduplicator=deduplicator,
        ) == []

    events = suppression_mod.suppression_snapshot()
    assert len(events) == 1
    assert events[0]["reason"] == "source_ip_allowlisted"
    assert events[0]["rule_id"] == "RECON-001"
    assert events[0]["detector"] == "scan:tcp_ports"
    assert events[0]["src_ip"] == "198.51.100.10"


def test_rule_id_suppression_returns_reason_when_requested(test_pack):
    config = suppression_mod.parse_suppression_config({
        "version": 1,
        "source_ips": [],
        "rule_ids": ["FLD-002"],
    })
    case = case_by_name("udp_flood")
    clear_events()
    deduplicator = AlertDeduplicator()
    visible = []

    for packet in case.packets:
        visible.extend(pipeline.run_detection_pipeline(
            packet,
            now=FROZEN_NOW,
            pack=test_pack,
            suppression=config,
            alert_factory=lambda *args, **kwargs: None,
            deduplicator=deduplicator,
            include_suppressed=True,
        ))

    assert len(visible) == 1
    assert visible[0]["suppressed"] is True
    assert visible[0]["rule_id"] == "FLD-002"
    assert visible[0]["reasons"] == [{
        "rule": "flood:udp_packets",
        "rule_id": "FLD-002",
        "observed": 25,
        "threshold": 25,
        "window_seconds": 3,
        "suppressed": True,
        "reason": "rule_id_suppressed",
    }]
    assert suppression_mod.suppression_snapshot()[0]["reason"] == "rule_id_suppressed"


def test_suppression_config_validates_allow_list_entries():
    with pytest.raises(suppression_mod.SuppressionConfigError, match="source_ips"):
        suppression_mod.parse_suppression_config({
            "version": 1, "source_ips": ["not-an-ip"], "rule_ids": []
        })
    with pytest.raises(suppression_mod.SuppressionConfigError, match="rule_ids"):
        suppression_mod.parse_suppression_config({
            "version": 1, "source_ips": [], "rule_ids": ["exec"]
        })
    with pytest.raises(suppression_mod.SuppressionConfigError, match="unknown fields"):
        suppression_mod.parse_suppression_config({"version": 1, "bypass_auth": True})
    with pytest.raises(suppression_mod.SuppressionConfigError, match="/0"):
        suppression_mod.parse_suppression_config({
            "version": 1, "source_ips": ["0.0.0.0/0"], "rule_ids": []
        })


def test_detection_info_route_exposes_pack_and_suppressed_reasons(app, auth_client):
    suppression_mod.record_suppression_event(
        "198.51.100.10", "RECON-001", "scan:tcp_ports", "source_ip_allowlisted"
    )

    response = auth_client.get("/api/alerts/detection")
    assert response.status_code == 200
    body = response.get_json()
    assert body["rule_pack"]["pack_version"] == "1.0.0"
    assert "port_scan" in body["rule_pack"]["supported_rule_types"]
    assert body["suppressed"][-1]["reason"] == "source_ip_allowlisted"

    anonymous = app.test_client().get("/api/alerts/detection")
    assert anonymous.status_code == 401


def test_alerts_route_preserves_explanations(auth_client, monkeypatch):
    alert = {
        "attack": "Basic TCP Port Scan",
        "severity": "medium",
        "src_ip": "198.51.100.10",
        "score": 25,
        "rule_id": "RECON-001",
        "reasons": [{"rule": "scan:tcp_ports", "observed": 20, "threshold": 20}],
    }
    monkeypatch.setattr(live_store_mod.global_live_store, "alerts_snapshot", lambda **kwargs: [alert])

    response = auth_client.get("/api/alerts")
    assert response.status_code == 200
    assert response.get_json()[0]["reasons"] == alert["reasons"]


def test_port_scan_helper_is_synthetic():
    packets = port_scan_packets(count=3)
    assert len(packets) == 3
    assert {packet["dst_port"] for packet in packets} == {1024, 1025, 1026}
    assert all(packet["protocol"] == "TCP" and packet["tcp_flags"] == "A" for packet in packets)
