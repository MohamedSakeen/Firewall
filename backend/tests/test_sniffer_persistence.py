"""Sniffer capture writes compact durable events without changing live behavior."""

import pytest

from api import api as api_module
from api.services import live_store as live_store_mod
from api.services import websocket_service as websocket_mod
from auth.db import init_db
from engine.IDS import detection_pipeline as detection_mod
from engine.IPS import ban_tracker as ban_mod
from engine.firewall import engine as firewall_mod
from engine.flow import flow_tracker as flow_mod
from engine.flow import window_aggregator as window_mod
from engine.intelligence.assets import asset_manager as asset_mod
from engine.intelligence.correlation import event_correlator as correlation_mod
from engine.packet import packet_normalizer as normalizer_mod
from engine.scoring import score_engine as score_mod
from engine.scoring import threat_tracker as tracker_mod
from scapy import all as scapy_all
from scapy.layers import inet as scapy_inet
from storage.events import event_count, list_events


class FakeIP:
    pass


class FakePacket:
    payload = b""

    def __contains__(self, item):
        return item is FakeIP

    def __bytes__(self):
        return b"\x00" * 40


class FakeIncident:
    def to_dict(self):
        return {
            "incident_id": "INC-1",
            "attacker_ip": "192.0.2.10",
            "status": "OPEN",
            "severity": "HIGH",
            "threat_score": 80,
        }


@pytest.fixture
def capture_env(monkeypatch, tmp_path):
    monkeypatch.setenv("FIREWALL_DB_PATH", str(tmp_path / "capture.db"))
    init_db()

    normalized = {
        "src_ip": "192.0.2.10",
        "dst_ip": "198.51.100.20",
        "src_port": 50000,
        "dst_port": 80,
        "protocol": "TCP",
        "tcp_flags": "S",
    }
    alert = {"attack": "Port Scan", "severity": "HIGH", "score": 70, "src_ip": "192.0.2.10"}
    record = {**alert, "alert_id": "ALT-000001"}
    event = {"event_id": "EVT-1", "event_type": "PORT_SCAN", "source_ip": "192.0.2.10"}

    monkeypatch.setattr(scapy_inet, "IP", FakeIP)
    monkeypatch.setattr(scapy_all, "sniff", lambda prn, **kwargs: prn(FakePacket()))
    monkeypatch.setattr(normalizer_mod, "normalize_packet", lambda packet: dict(normalized))
    monkeypatch.setattr(live_store_mod, "packet_direction", lambda src, dst: "TX")
    monkeypatch.setattr(firewall_mod, "check_packet", lambda src, port: "ALLOWED")
    monkeypatch.setattr(detection_mod, "run_detection_pipeline", lambda pkt, raw: [alert])
    monkeypatch.setattr(ban_mod, "get_ban", lambda ip: None)
    monkeypatch.setattr(tracker_mod, "get_threat_event", lambda ip: [])
    monkeypatch.setattr(score_mod, "calculate_threat_score", lambda events: 0)
    monkeypatch.setattr(flow_mod.global_flow_tracker, "process_packet", lambda pkt: None)
    monkeypatch.setattr(window_mod.global_window_aggregator, "add_flow_sample", lambda flow: None)
    monkeypatch.setattr(asset_mod.global_asset_manager, "assets", {})
    monkeypatch.setattr(asset_mod.global_asset_manager, "register_asset", lambda *a, **k: None)
    monkeypatch.setattr(correlation_mod.global_event_correlator, "process_alert", lambda rec: FakeIncident())
    monkeypatch.setattr(
        live_store_mod.global_live_store,
        "record_packet",
        lambda pkt, size, decision, score: {
            "timestamp": 1.0, "src_ip": normalized["src_ip"], "src_port": 50000,
            "dst_ip": normalized["dst_ip"], "dst_port": 80, "protocol": "TCP",
            "size": size, "tcp_flags": "S", "score": score,
            "direction": "TX", "decision": decision,
        },
    )
    monkeypatch.setattr(
        live_store_mod.global_live_store,
        "record_alert",
        lambda alert_data, **kwargs: (record, event),
    )
    for name in ("broadcast_packet", "broadcast_alert", "broadcast_security_event", "broadcast_incident_updated"):
        monkeypatch.setattr(websocket_mod, name, lambda *args: None)
    return record, event


def test_capture_persists_packet_alert_event_and_incident(capture_env):
    record, event = capture_env
    api_module._run_sniffer()

    assert {row["event_type"] for row in list_events(20)} == {
        "packet", "alert", "security_event", "incident"
    }
    assert event_count() == 4
    packet = list_events(20, event_type="packet")[0]
    assert packet["source_ip"] == "192.0.2.10"
    assert packet["details"]["protocol"] == "TCP"
    alert = list_events(20, event_type="alert")[0]
    assert alert["details"]["alert_id"] == record["alert_id"]
    security_event = list_events(20, event_type="security_event")[0]
    assert security_event["details"]["event_id"] == event["event_id"]
    incident = list_events(20, event_type="incident")[0]
    assert incident["details"]["incident_id"] == "INC-1"


def test_capture_continues_when_persistence_fails(capture_env, monkeypatch):
    def fail(*args, **kwargs):
        raise RuntimeError("storage offline")

    monkeypatch.setattr(api_module, "persist_event", fail)
    api_module._run_sniffer()  # must not raise; live capture continues
