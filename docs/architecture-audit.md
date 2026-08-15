# System Architecture Audit & Data Flow Documentation

## 1. Subsystem Audit Matrix

| Subsystem | Location | Responsibilities | Key Functions / Classes | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sniffer** | `backend/sniffer/` | Captures Layer 3/4 raw packets via Scapy/Npcap | `sniff_packets()` | Network Interface (NIC) | Raw Scapy Packets |
| **Packet Normalizer** | `backend/engine/packet/` | Normalizes raw packets into standard dictionaries | `normalize_packet()` | Scapy Packet | Normalized dict (src_ip, dst_ip, ports, flags) |
| **Stateful Firewall** | `backend/engine/firewall/` | Checks packet policy rules & session handshakes | `evaluate_stateful_packet()`, `check_packet()` | Normalized packet | Rule action (`ALLOW`/`DROP`), TCP session state |
| **IDS Detection** | `backend/engine/IDS/` | Signature & heuristic anomaly detection | `run_detection_pipeline()`, `detect_port_scan()` | Normalized packet | Alert dict (`type`, `src_ip`, `severity`) |
| **Threat Scorer** | `backend/engine/scoring/` | Aggregates threat scores per source IP | `calculate_score()` | Alert history, events | Numerical Threat Score (0–100) |
| **IPS Responder** | `backend/engine/IPS/` | Active mitigation, IP blocking, quarantine | `process_alert()`, `block_ip()` | Severity, Threat Score | Block action, Active Ban Table |
| **API & WebSockets** | `backend/api/` | Flask REST endpoints & Socket.IO telemetry | Flask routes (`/api/traffic`, `/api/alerts`, etc.) | HTTP Requests, Internal Events | JSON payloads, WebSocket broadcasts |

---

## 2. End-to-End Packet Pipeline Flow

```text
       Raw Packet (NIC)
              │
              ▼
   [Packet Normalizer]  ──────► Standard Normalized Dictionary
              │
              ▼
   [Stateful Firewall]  ──────► Allow / Block Enforcement
              │
              ▼
      [IDS Engine]      ──────► Heuristics & Signature Scans
              │
              ▼
   [Threat Score Engine] ──────► 0 - 100 Dynamic Risk Score
              │
              ▼
      [IPS Responder]   ──────► Dynamic Quarantine / IP Ban
              │
              ▼
   [WebSocket / REST API] ────► Real-Time React SOC Dashboard
```

---

## 3. Technology & Safety Assumptions

- **Concurrency & State**: Python dictionary tables (`session`, `offense_counter`, `ban_list`) operate in memory; synchronization locks ensure thread safety when accessed by background sniffer threads and Flask WSGI threads.
- **Graceful Fallbacks**: If packet sniffing or raw driver interaction fails due to permissions, mock telemetry modes can be engaged without crashing REST API services.
