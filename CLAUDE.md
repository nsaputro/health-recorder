# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Plan

**Always read `PROJECT_PLAN.md` before implementing any new feature.**

- Check which phase the feature belongs to and confirm it is listed there.
- When you open a PR for a feature, tick its checkbox in `PROJECT_PLAN.md` (change `⬜` → `✅`) and include the updated file in the same commit.
- If a feature is not yet in the plan, add it to the appropriate phase before starting work.

## Git Policy

**Never push directly to `main`.** All changes must go through a pull request:
1. **Always** create the branch from the latest `main`: `git checkout origin/main -b feature/your-description`
2. Commit changes and push the branch
3. Open a PR targeting `main` via the GitHub MCP tools (`mcp__github__create_pull_request`)

### PR hygiene rules

**After creating a PR**, always call `mcp__github__pull_request_read` to confirm the PR is
actually open before reporting the link to the user. Do not assume `create_pull_request`
succeeded — verify state is `"open"` first.

**Before pushing more commits to an existing PR branch**, call `mcp__github__pull_request_read`
to check whether the PR is still open. If it has already been merged:
1. Create a new branch from the latest `main`
2. Cherry-pick the pending commits onto the new branch
3. Push the new branch and open a fresh PR

## Versioning

### How it works

`ha-addon/config.yaml` **always holds the last *released* version** on `main`. The HA
supervisor reads this file directly from the repo to decide whether to offer an update —
so it must never show a version whose Docker images don't exist yet.

The upcoming version lives in **`ha-addon/NEXT_VERSION`** (plain text, e.g. `0.3.0`).
PRs update that file; `config.yaml` is only touched by the release workflow at cut time.

```
ha-addon/NEXT_VERSION    ← source of truth for the next release  (updated in PRs)
ha-addon/config.yaml     ← last released version                 (only release workflow writes this)
ha-addon-dev/config.yaml ← NEXT_VERSIONbN dev pre-release        (updated in PRs)
```

### Bumping the next version

Read `ha-addon/NEXT_VERSION` and the latest GitHub release:

```
mcp__github__list_releases  owner=nsaputro  repo=health-recorder
```

- **Reuse** the current `NEXT_VERSION` across multiple PRs targeting the same release —
  don't bump it on every PR.
- **Bump** `NEXT_VERSION` only when explicitly asked to, or when the change warrants a
  new `MINOR` / `MAJOR` increment (new feature set, breaking change).
- `NEXT_VERSION` must always be higher than the latest released version.

Use semantic versioning (`MAJOR.MINOR.PATCH`):
- `PATCH` (e.g. `0.1.2` → `0.1.3`) — bug fixes, small improvements
- `MINOR` (e.g. `0.1.x` → `0.2.0`) — new features
- `MAJOR` — breaking changes

**Never edit `ha-addon/config.yaml` version directly** — the release workflow owns that field.

### Pre-release version (dev channel)

**Every feature PR must bump `ha-addon-dev/config.yaml` `version`** to a pre-release that
matches `NEXT_VERSION`, so the dev channel is ready for testing immediately.

The format is `<NEXT_VERSION>b<N>` where N = (highest released bN for that version) + 1.

Steps:
1. Read `NEXT_VERSION` from `ha-addon/NEXT_VERSION`
2. Call `mcp__github__list_releases` and find the highest `bN` tag for that version
   (e.g. for `NEXT_VERSION=0.3.0` look for `v0.3.0b*` tags)
3. Set `ha-addon-dev/config.yaml` `version` to `<NEXT_VERSION>b<N+1>`
   — if no matching pre-release exists yet, start at `b1`
4. If the dev config already has `<NEXT_VERSION>bN` (unreleased), still increment N so
   each PR produces a distinct testable build

Example: `NEXT_VERSION=0.3.0`, latest release is `v0.3.0b2` → set dev version to `"0.3.0b3"`.

## Changelog

**Every PR that changes addon behaviour must update `CHANGELOG.md`.**

- Add an entry under `## [Unreleased]` in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
- Use the categories `Added`, `Changed`, `Fixed`, `Removed` as appropriate
- The release workflow automatically moves `[Unreleased]` entries to a new `## [x.y.z] - YYYY-MM-DD`
  section and regenerates `ha-addon/CHANGELOG.md` — no manual migration needed

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

### Tests

Unit tests live in `ha-addon/tests/` and `backend/tests/`. Run them locally before opening a PR:

```bash
# HA addon tests (34 tests — CRUD, user isolation, impersonation prevention)
cd ha-addon
pip install -r requirements.txt -r requirements-test.txt
python -m pytest tests/ -v

# Standalone backend tests (23 tests — CRUD, input validation)
cd backend
pip install -r requirements.txt -r requirements-test.txt
python -m pytest tests/ -v
```

Key test helpers (in `*/tests/conftest.py`):
- `client` fixture: fresh in-memory SQLite DB per test via `StaticPool`
- `HEADERS_A` / `HEADERS_B`: simulate two HA ingress users (Alice / Bob)
- `HEADERS_DIRECT`: empty dict — simulates direct port-8099 access (no HA headers)

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

**Release** (`.github/workflows/release.yml`) is triggered via `workflow_dispatch` only
(enter the version in the GitHub Actions UI). The workflow:
1. Validates the input version matches `ha-addon/NEXT_VERSION`
2. Creates and pushes the git tag (`config.yaml` is **not** touched here)
3. Builds and pushes Docker images to `ghcr.io/nsaputro/health-recorder/{arch}-health_recorder`
4. Creates a GitHub release with install instructions
5. Opens an auto-generated `chore/post-release-X.Y.Z` PR that:
   - Stamps `ha-addon/config.yaml` with the released version (so HA offers the update)
   - Bumps `ha-addon/NEXT_VERSION` to the next patch version
   - Resets `ha-addon-dev/config.yaml` to `{NEXT}b1`
   - Dates the `## [X.Y.Z]` section in `CHANGELOG.md` and updates comparison links
   - Regenerates `ha-addon/CHANGELOG.md` from the main changelog

**To release a new version:**
1. Ensure `ha-addon/NEXT_VERSION` contains the version to release and all changes are merged to `main`
2. Go to **Actions → Release → Run workflow** (no inputs needed — version is read from `NEXT_VERSION`)
3. Review and merge the auto-created `chore/post-release-X.Y.Z` PR
   (check `ha-addon/CHANGELOG.md` looks good before merging)
