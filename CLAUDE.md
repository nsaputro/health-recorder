# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Policy

**Never push directly to `main`.** All changes must go through a pull request:
1. **Always** create the branch from the latest `main`: `git checkout origin/main -b feature/your-description`
2. Commit changes and push the branch
3. Open a PR targeting `main` via the GitHub MCP tools (`mcp__github__create_pull_request`)

## Versioning

**Before setting a version in any PR, always check the latest GitHub release first:**

```
mcp__github__get_latest_release  owner=nsaputro  repo=health-recorder
```

The next version must be higher than the latest release. Never reuse an already-released version number. Use semantic versioning (`MAJOR.MINOR.PATCH`):
- `PATCH` bump (e.g. `0.1.2` → `0.1.3`) for bug fixes and small improvements
- `MINOR` bump (e.g. `0.1.x` → `0.2.0`) for new features
- `MAJOR` bump for breaking changes

Update `ha-addon/config.yaml` `version` field in the same PR as the change.

## Changelog

**Every PR that changes addon behaviour must update `CHANGELOG.md`.**

- Add an entry under `## [Unreleased]` in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
- Use the categories `Added`, `Changed`, `Fixed`, `Removed` as appropriate
- When a release is cut, move `[Unreleased]` entries to a new `## [x.y.z] - YYYY-MM-DD` heading and update the comparison links at the bottom

## Development Commands

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in Google credentials
uvicorn app.main:app --reload # http://localhost:8000, docs at /docs
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
npm run build   # type-check + production bundle
npm run lint    # ESLint on src/
```

### Full stack via Docker Compose
```bash
cp backend/.env.example backend/.env
docker compose up --build
# frontend → http://localhost:5173   backend → http://localhost:8000
```

### Lint (CI checks run these)
```bash
yamllint -c .yamllint.yml ha-addon/config.yaml ha-addon/build.yaml
python3 -c "import ast, pathlib; [ast.parse(f.read_text()) for f in pathlib.Path('ha-addon/app').rglob('*.py')]"
```

## Architecture

There are **two independent applications** in this repo:

### 1. Standalone app (`backend/` + `frontend/`)
- **Backend**: FastAPI + SQLAlchemy + SQLite. Entry point: `backend/app/main.py`. Config via `backend/.env` (Pydantic `BaseSettings`). No authentication — single-user personal app.
- **Frontend**: React 18 + TypeScript + TailwindCSS + Recharts. Vite proxies `/api/*` → `http://localhost:8000` (stripping the `/api` prefix) so all API calls use `/api/...` in the browser.
- **API client**: `frontend/src/api/client.ts` — Axios with `baseURL: '/api'`.

### 2. Home Assistant addon (`ha-addon/`)
Self-contained copy of the backend with an HA-specific config and a vanilla-JS SPA (no build step needed). Key differences from the standalone app:

| Concern | Standalone | HA Addon |
|---|---|---|
| Config | `backend/.env` via Pydantic | `/data/options.json` via `bashio::config` + env vars |
| Database | `./health_recorder.db` | `/data/health_recorder.db` (persists across updates) |
| Port | 8000 | 8099 |
| Frontend | React (Vite build) | `ha-addon/ui/index.html` — single vanilla-JS file |
| Auth redirect | Configurable `FRONTEND_URL` | Always redirects to `/?google_connected=1` |

The Dockerfile copies `ha-addon/ui/` → `/app/static/` in the container. `main.py` serves `static/index.html` at `/` and catches all unmatched routes for SPA navigation. **API routes are registered before the catch-all.**

**Critical — HA ingress URL routing**: The addon is served via HA ingress at `/api/hassio_ingress/<hash>/`. All `fetch()` calls in `ui/index.html` must use **relative paths without a leading `/`** (e.g. `health/body-metrics`, not `/health/body-metrics`) so the browser resolves them relative to the ingress prefix. Absolute paths would hit the HA server instead of the addon.

### Data models (`*/app/models/health.py`)
Five SQLAlchemy tables (identical in both apps):
- `body_metrics` — weight_kg, height_cm, bmi (computed on insert)
- `lab_results` — test_type (enum), value, unit, lab_name
- `vital_signs` — systolic_bp, diastolic_bp, heart_rate
- `google_credentials` — OAuth2 tokens for the single user
- `sync_logs` — audit trail for each sync operation

All health tables have `synced_to_fit` and `synced_to_sheets` boolean flags that the sync routers set after a successful push.

### Google sync (`*/app/services/`)
- `google_fit.py` — only syncs weight, blood pressure, heart rate, and blood glucose (these are the only native Fit data types). Glucose converts mg/dL → mmol/L for Fit.
- `google_sheets.py` — syncs **all** metrics including cholesterol, uric acid, HbA1c. Creates the spreadsheet on first run; subsequent syncs append rows.
- `google_auth.py` — OAuth2 flow. Credentials stored in `google_credentials` table (single row, updated on refresh).

### Lab test types (`*/app/schemas/health.py`)
All supported test types, their display names, default units, and clinical reference ranges live in three dicts: `LAB_TEST_UNITS`, `LAB_TEST_DISPLAY`, `LAB_REFERENCE_RANGES`. The `/health/lab-types` endpoint exposes these to the UI.

## CI / Release

**CI** (`.github/workflows/ci.yml`) runs on every push to `main`, `claude/**`, `feature/**` and on PRs:
- yamllint on `ha-addon/config.yaml` + `build.yaml`
- hadolint on `ha-addon/Dockerfile`
- Python `ast.parse` syntax check on `ha-addon/app/` and `backend/app/`
- Docker build test for `linux/amd64` (no push)

**Release** (`.github/workflows/release.yml`) is triggered by pushing a `v*.*.*` tag **or** via `workflow_dispatch` (preferred — enter version in the GitHub Actions UI):
1. Validates that the tag version matches `ha-addon/config.yaml` `version` field
2. Builds and pushes Docker images to `ghcr.io/nsaputro/health-recorder/{arch}-health_recorder` for amd64 + aarch64
3. Creates a GitHub release with install instructions

**To release a new version:**
1. Check latest release: `mcp__github__get_latest_release`
2. Bump `version` in `ha-addon/config.yaml` to next version
3. Move `## [Unreleased]` entries in `CHANGELOG.md` to `## [x.y.z] - YYYY-MM-DD` and update comparison links
4. Merge via PR to `main`
5. Go to Actions → Release → Run workflow → enter the new version number
