# 🩺 Health Recorder — Project Plan

**Personal health data tracker with Google sync and Home Assistant integration**

---

## Vision

Health Recorder lets you log and trend your own health data — body weight, blood pressure,
heart rate, and lab results — without relying on third-party cloud services. Data lives in a
local SQLite database that you own. Optional Google Fit and Google Sheets sync pushes data to
the services that do matter to you.

It ships as a **Home Assistant addon** (sidebar panel, multi-user via HA ingress) and as a
**standalone Docker Compose app** (single-user, no HA required).

---

## Tech Stack

### Backend

| Layer | Choice | Version |
|---|---|---|
| Framework | FastAPI | 0.115.x |
| Python | Python | 3.12+ |
| ORM | SQLAlchemy | 1.x (sync) |
| Database | SQLite | built-in |
| Validation | Pydantic v2 | 2.x |
| Server | Uvicorn | latest |
| Google sync | google-auth + google-api-python-client | latest |

### Standalone Frontend

| Layer | Choice | Current | Target (Phase 4) |
|---|---|---|---|
| Framework | React | 18.3 | **19** |
| Language | TypeScript | 5.7 | 5.x (latest) |
| Styling | TailwindCSS | 3.4 | **4.x** |
| Routing | React Router | 6.x | **7.x** |
| Charts | Recharts | 2.x | 2.x |
| HTTP | Axios | 1.x | 1.x |
| Forms | React Hook Form | 7.x | 7.x |
| Data fetching | TanStack Query | 5.x | 5.x |
| Build | Vite | 6.x | 6.x |

### HA Addon Frontend

- Vanilla JS SPA (single `index.html`, no build step)
- Matches HA color palette, supports dark mode via `prefers-color-scheme`
- All `fetch()` calls use **relative paths** (required for HA ingress routing)

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local dev & standalone deployment |
| GitHub Actions | CI + Release pipeline |
| GHCR | Container registry (`ghcr.io/nsaputro/health-recorder`) |
| Home Assistant Ingress | HA addon serving |

---

## Project Structure

```
health-recorder/
├── ha-addon/                    # Home Assistant addon (primary)
│   ├── config.yaml              # HA addon manifest + version
│   ├── build.yaml               # Multi-arch build config
│   ├── Dockerfile
│   ├── run.sh                   # Addon entrypoint (sets env vars from options.json)
│   ├── app/
│   │   ├── main.py              # FastAPI app, serves static/
│   │   ├── database.py          # SQLAlchemy engine + get_db()
│   │   ├── config.py            # Settings from /data/options.json
│   │   ├── dependencies.py      # HAUser + get_ha_user() ingress dependency
│   │   ├── models/
│   │   │   └── health.py        # BodyMetric, LabResult, VitalSign, GoogleCredential, SyncLog
│   │   ├── schemas/
│   │   │   └── health.py        # Pydantic v2 schemas + LAB_TEST_UNITS/DISPLAY/RANGES
│   │   ├── routers/
│   │   │   ├── health.py        # CRUD for all health tables
│   │   │   ├── auth.py          # /auth/me + Google OAuth flow
│   │   │   └── sync.py          # Google Fit + Sheets sync endpoints
│   │   └── services/
│   │       ├── google_auth.py   # OAuth2 flow, credential storage (per user)
│   │       ├── google_fit.py    # Push weight, BP, HR, glucose to Fit
│   │       └── google_sheets.py # Push all metrics to Sheets (creates on first run)
│   ├── ui/
│   │   └── index.html           # Vanilla-JS SPA (HA addon UI)
│   ├── tests/
│   │   ├── conftest.py          # StaticPool fixture + HEADERS_A/B/DIRECT
│   │   ├── test_auth.py         # /auth/me, impersonation prevention, user isolation
│   │   └── test_health.py       # CRUD + BMI + input validation + user isolation
│   ├── requirements.txt
│   ├── requirements-test.txt
│   └── pytest.ini
│
├── ha-addon-dev/                # Dev channel addon (pre-release testing)
│   └── config.yaml              # slug: health_recorder_dev, port 8100
│
├── backend/                     # Standalone FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── config.py            # Pydantic BaseSettings from .env
│   │   ├── models/health.py
│   │   ├── schemas/health.py
│   │   └── routers/
│   │       ├── health.py        # CRUD (no ha_user_id filtering)
│   │       ├── auth.py          # Google OAuth (single-user)
│   │       └── sync.py
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_health.py       # CRUD + ordering + validation (23 tests)
│   ├── requirements.txt
│   ├── requirements-test.txt
│   └── pytest.ini
│
├── frontend/                    # Standalone React frontend
│   ├── src/
│   │   ├── api/client.ts        # Axios with baseURL: /api
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route-level page components
│   │   └── types/               # TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml               # Lint + syntax check + pytest + Docker build
│       ├── release.yml          # Build + push multi-arch images + GH release
│       └── prerelease.yml       # Pre-release from ha-addon-dev/config.yaml
│
├── docker-compose.yml
├── repository.yaml              # HA addon repository descriptor
├── CLAUDE.md
├── PROJECT_PLAN.md
├── CHANGELOG.md
└── README.md
```

---

## Data Models

### `body_metrics`

```
id, ha_user_id, measured_at, weight_kg, height_cm,
bmi (computed on insert), notes,
synced_to_fit, synced_to_sheets, created_at, updated_at
```

### `lab_results`

```
id, ha_user_id, measured_at, test_type, value, unit,
lab_name, notes,
synced_to_fit, synced_to_sheets, created_at, updated_at
```

Supported `test_type` values: `cholesterol_total`, `cholesterol_ldl`, `cholesterol_hdl`,
`triglycerides`, `glucose_fasting`, `glucose_random`, `glucose_hba1c`, `uric_acid`,
`creatinine`, `hemoglobin`, `other`.

### `vital_signs`

```
id, ha_user_id, measured_at,
systolic_bp, diastolic_bp, heart_rate (at least one required),
notes, synced_to_fit, synced_to_sheets, created_at, updated_at
```

### `google_credentials`

```
id, ha_user_id, user_email, access_token, refresh_token,
token_expiry, created_at, updated_at
```

One row per HA user. The OAuth callback encodes `ha_user_id` in the composite state
parameter (`{ha_user_id}|{random}`) so it survives the round-trip to port 8099 where HA
ingress headers are absent.

### `sync_logs`

```
id, ha_user_id, service (google_fit|google_sheets),
status (success|error), records_synced, error_message, created_at
```

---

## API Endpoints

### Health data (HA addon — all filtered by `ha_user_id`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health/body-metrics` | List (newest first, limit/offset) |
| POST | `/health/body-metrics` | Create; BMI auto-computed |
| GET | `/health/body-metrics/{id}` | Get (ownership enforced — 404 if wrong user) |
| PUT | `/health/body-metrics/{id}` | Update; resets sync flags |
| DELETE | `/health/body-metrics/{id}` | Delete |
| GET | `/health/lab-results` | List (optional `?test_type=` filter) |
| POST | `/health/lab-results` | Create; unit defaults from `LAB_TEST_UNITS` |
| GET/PUT/DELETE | `/health/lab-results/{id}` | Per-record with ownership check |
| GET | `/health/vital-signs` | List |
| POST | `/health/vital-signs` | Create; at least one measurement required |
| GET/PUT/DELETE | `/health/vital-signs/{id}` | Per-record with ownership check |
| GET | `/health/lab-types` | Static reference data (display names + ranges) |

### Auth & Google sync

| Method | Endpoint | Description |
|---|---|---|
| GET | `/auth/me` | Current HA user identity from ingress headers |
| GET | `/auth/google/login` | Redirect to Google consent screen |
| GET | `/auth/google/callback` | OAuth2 callback; stores credential |
| GET | `/auth/google/status` | Connection status for current user |
| DELETE | `/auth/google/disconnect` | Revoke + delete credential |
| POST | `/sync/google-fit` | Push unsynced records to Google Fit |
| POST | `/sync/google-sheets` | Push unsynced records to Google Sheets |
| GET | `/sync/logs` | Recent sync log entries |

---

## Core Features

### Phase 1 — MVP (v0.1.x) ✅

- ✅ Body metrics tracking: weight, height, auto-computed BMI
- ✅ Lab results: 10 test types with display names, units, and clinical reference ranges
- ✅ Vital signs: systolic/diastolic BP and heart rate (at least one required)
- ✅ HA addon: sidebar panel, HA ingress support, port 8099 for OAuth redirect
- ✅ Standalone: Docker Compose, single-user, FastAPI + React frontend
- ✅ Google Fit sync: weight, blood pressure, heart rate, blood glucose
- ✅ Google Sheets sync: all metrics including cholesterol, HbA1c, uric acid
- ✅ Vanilla-JS SPA: no build step, relative `fetch()` paths for ingress routing
- ✅ HA-themed UI: HA primary blue, Material cards, Roboto font
- ✅ Dark mode: `prefers-color-scheme: dark` mirroring HA's own dark palette
- ✅ Pre-release channel: `ha-addon-dev/` subdirectory, slug `health_recorder_dev`, port 8100
- ✅ CI pipeline: yamllint + hadolint + Python syntax check + Docker build on every PR
- ✅ Release pipeline: multi-arch (amd64 + aarch64) images + GitHub release

### Phase 2 — Multi-user + Quality (v0.2.0) 🔄

- ✅ Multi-user support: each HA user sees only their own data via `ha_user_id`
- ✅ Impersonation prevention: `X-Remote-User-*` headers only trusted when `X-Ingress-Path` is also present (HA supervisor-injected)
- ✅ Per-user Google credentials: each user connects their own Google account independently
- ✅ User identity display: logged-in HA user's display name shown in the status bar
- ✅ `GET /auth/me` endpoint: returns `{id, name, display_name}` from ingress headers
- ✅ Unit tests: 34 ha-addon tests (CRUD, user isolation, impersonation) + 23 backend tests (CRUD, validation)
- ✅ CI runs pytest on every push and PR before Docker build

### Phase 3 — Trend Charts (v0.3.0) ⬜

- ⬜ **Weight & BMI chart**: line chart showing weight (and BMI overlay) over time; reference BMI bands (underweight / normal / overweight / obese) as background shading
- ⬜ **Blood pressure chart**: dual-line chart for systolic and diastolic over time; hypertension stage bands (normal < 120/80, elevated, stage 1, stage 2) as coloured zones
- ⬜ **Heart rate chart**: line chart over time; resting HR normal range (60–100 bpm) reference band
- ⬜ **Lab result charts**: one chart per test type (selected from a dropdown); value plotted over time with normal / borderline / high colour-coded bands from `LAB_REFERENCE_RANGES`
- ⬜ **HA addon**: charts rendered with a lightweight canvas library (no npm; bundled inline or loaded from CDN with integrity hash)
- ⬜ **Standalone frontend**: charts built with Recharts (already in the stack)
- ⬜ **Time-range filter**: 1 month / 3 months / 6 months / 1 year / all time
- ⬜ **Trend summary**: min / max / average shown below each chart for the selected period

### Phase 4 — Frontend Modernisation (v0.4.0) ⬜

Upgrade the standalone `frontend/` to the latest major versions. The HA addon's vanilla-JS UI
is unaffected (no build step to break).

| Package | Current | Target | Breaking changes |
|---|---|---|---|
| React | 18.3 | **19** | New JSX transform (already used); `useTransition` signature change; stricter `ref` handling |
| React Router | 6.x | **7.x** | `<Routes>`/`<Route>` API largely compatible; loader/action patterns encouraged |
| TailwindCSS | 3.4 | **4.x** | `@tailwind` directives removed; new CSS-first config (`@import "tailwindcss"`); `tailwind.config.js` replaced by CSS variables |
| TypeScript | 5.7 | **5.x latest** | No breaking changes expected |
| Vite | 6.x | **6.x latest** | Already on v6 — keep up with patch releases |

Migration steps (in order):
- ⬜ Upgrade TypeScript to latest 5.x; fix any new strict-mode errors
- ⬜ Upgrade Vite to latest 6.x patch
- ⬜ Migrate TailwindCSS 3 → 4: replace `tailwind.config.js` with CSS-first config, update `@tailwind` directives to `@import`, audit class name changes (`ring-*`, `shadow-*`, `divide-*`)
- ⬜ Upgrade React 18 → 19 and React DOM: update `ReactDOM.createRoot` calls, fix `ref` forwarding patterns, address any removed legacy APIs
- ⬜ Upgrade React Router 6 → 7: migrate `useNavigate` / `<Link>` / `<Outlet>` (mostly compatible); optionally adopt route loader pattern
- ⬜ Update all `@types/*` packages to match new versions
- ⬜ Run full test suite and `npm run build` to verify no regressions

---

## Development Milestones

| Milestone | Description | Status |
|---|---|---|
| v0.1.0 | MVP: health CRUD + Google sync + HA addon | ✅ Released |
| v0.1.1 – v0.1.4 | HA ingress fix, HA-themed UI, cache headers, dark mode | ✅ Released |
| v0.2.0 | Multi-user + impersonation prevention + unit tests | 🔄 In progress |
| v0.3.0 | Trend charts for all metric types | ⬜ Planned |
| v0.4.0 | Frontend modernisation: React 19, Tailwind v4, Router 7 | ⬜ Planned |

---

## Getting Started (Development)

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose

### HA Addon (backend + vanilla-JS UI)

```bash
cd ha-addon
pip install -r requirements.txt
# Serve locally (DATABASE_URL defaults to /data/health_recorder.db; override for dev)
DATABASE_URL=sqlite:///./dev.db uvicorn app.main:app --reload --port 8099
# Open http://localhost:8099
```

### Standalone Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in GOOGLE_CLIENT_ID / SECRET
uvicorn app.main:app --reload
# API: http://localhost:8000 | Docs: http://localhost:8000/docs
```

### Standalone Frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173  (proxies /api/* → localhost:8000)
npm run build   # type-check + production bundle
npm run lint    # ESLint
```

### Full stack via Docker Compose

```bash
cp backend/.env.example backend/.env
docker compose up --build
# frontend → http://localhost:5173   backend → http://localhost:8000
```

### Tests

```bash
# HA addon — 34 tests
cd ha-addon && python -m pytest tests/ -v

# Backend — 23 tests
cd backend && python -m pytest tests/ -v
```

### HA Addon Installation (stable)

1. Settings → Add-ons → Add-on Store → ⋮ → Repositories
2. Add: `https://github.com/nsaputro/health-recorder`
3. Find **Health Recorder** → Install → Start → Open Web UI

### HA Addon Installation (dev channel)

1. Add the same repository URL — HA will also list **Health Recorder (dev)**
2. Install the dev addon alongside stable; it runs on port 8100

---

_Track your health data — own your data 🩺_
