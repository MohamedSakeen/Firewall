# Repository Structure (current local-lab layout)

This file describes the layout that exists in the repository today. It is not a
roadmap. See `docs/` and the top-level `*_plan.md` files for planned work.

```text
Firewall/
├── backend/
│   ├── api/
│   │   ├── api.py                    # Flask app factory + legacy sniffer entry point
│   │   ├── routes/                   # alert, assets, autonomy, events, firewall,
│   │   │                             # hunting, incidents, ips, learning, logs,
│   │   │                             # posture, response, rules, simulation, traffic
│   │   └── services/                 # live_store.py, log_service.py, websocket_service.py
│   ├── engine/
│   │   ├── packet/                   # packet normalization
│   │   ├── firewall/                 # firewall rule evaluation and state tracking
│   │   ├── IDS/                      # detection pipeline and detectors
│   │   ├── IPS/                      # block, ban, quarantine, whitelist helpers
│   │   ├── scoring/                  # threat scoring and severity
│   │   ├── flow/                     # flow tracking and window aggregation
│   │   ├── features/                 # feature extraction and context
│   │   ├── detection/anomaly/        # statistical/contextual anomaly detection
│   │   ├── learning/                 # baselines, drift, feedback, poisoning guards
│   │   ├── intelligence/             # assets, attack graph/stage, correlation,
│   │   │                             # incidents, prediction, scoring
│   │   ├── models/                   # model/dataset registry and governance
│   │   ├── health/                   # self-monitoring and posture
│   │   ├── response/                 # autonomy, policy, shadow, simulator, verification
│   │   ├── hunting/                  # guided threat-hunting queries
│   │   ├── deception/                # honeypot listener/manager
│   │   ├── forensics/                # replay and timeline
│   │   └── rules/                    # JSON rule sets (firewall/, IDS/, IPS/, scoring/)
│   ├── sniffer/                      # optional Scapy capture helpers
│   ├── logs/                         # generated runtime JSON logs (local only)
│   ├── tests/                        # pytest suites
│   ├── main.py                       # standalone CLI sniffer/detection demo
│   ├── requirements.txt              # pinned Python dependencies
│   └── .venv/                        # created by start_all.py; git-ignored
├── frontend/
│   ├── public/                       # static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/               # Sidebar, Topbar
│   │   │   ├── ui/                   # shared cards, pagination, menus
│   │   │   └── charts/               # chart components
│   │   ├── pages/                    # dashboard route views
│   │   ├── services/                 # Axios API client and Socket.IO client
│   │   ├── store/                    # Redux Toolkit store and slices
│   │   ├── utils/                    # formatting/export helpers
│   │   ├── assets/                   # local static imports
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── package-lock.json             # used by npm ci
│   ├── vite.config.js
│   ├── postcss.config.js
│   └── tailwind.config.js
├── docs/                             # architecture audit and future-phase plans
├── .env.example                      # local-only configuration names and dummy values
├── .gitignore
├── pytest.ini                        # pythonpath = backend, testpaths = backend/tests
├── package-lock.json                 # minimal root lockfile (no root package.json)
├── start_all.py                      # cross-platform local-lab launcher
├── start_all.bat / start_all.ps1      # thin wrappers around start_all.py
├── build_frontend.py                 # thin wrapper around npm run build
├── .github/workflows/ci.yml          # backend tests + frontend build
├── npcap-1.88.exe                    # optional Windows capture driver installer
├── PROJECT_MEMORY.md
├── README.md
└── top-level *_plan.md files         # planning documents, not delivered features
```

Notes:

- There is no `backend/config/`, `backend/utils/`, `backend/database/`,
  `frontend/src/hooks/`, `frontend/src/data/mockData.js`, or `frontend/dashboard/`.
- No authentication, user accounts, roles, sessions, or permissions are implemented.
- Basic CI runs tests and the frontend build; there are no production deployment manifests.
