# AGENTS.md

Guidance for AI coding assistants (Antigravity, Claude Code, etc.) working on the Health Recorder repository.

---

## OpenSpec Workflows & Spec Rules

Health Recorder uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for specification-driven development.

### Workflows Table

| Command | Skill / Workflow | Purpose |
|---|---|---|
| `/opsx-propose` | `openspec-propose` | Propose a new feature, capability, or architectural change |
| `/opsx-apply` | `openspec-apply-change` | Implement tasks for an approved change proposal |
| `/opsx-update` | `openspec-update-change` | Update an existing proposal, delta specs, or task checklist |
| `/opsx-sync` | `openspec-sync-specs` | Sync implementation changes back to specifications |
| `/opsx-archive` | `openspec-archive-change` | Archive completed change deltas into baseline capability specs |
| `/opsx-explore` | `openspec-explore` | Explore existing capability specs and in-flight changes |

### Token-Efficient Spec Rules

- **Proposals (`proposal.md`)**: Cap at <250 words using concise bullet points. Set `skip_specs: true` in change metadata for pure refactors, tooling updates, or documentation changes.
- **Specifications (`spec.md`)**: Enforce 1–2 normative sentences per requirement using `SHALL` or `MUST`. Use ultra-compact 1-line `WHEN`/`THEN` scenarios with `#### Scenario:` (exactly 4 hashtags).
- **Technical Design (`design.md`)**: Keep designs <300 words with bulleted decisions. Omit the design document unless changes are architectural or breaking.
- **Task Breakdown (`tasks.md`)**: Limit checklists to 3–8 actionable checkboxes with inline verification steps.
- **Baseline Specs**: Main capability specifications live in `openspec/specs/<capability>/spec.md` with `## Purpose` (50+ characters) and `## Requirements`.

---

## GitHub Projects Kanban Lifecycle

Work items are tracked on the repository's GitHub Projects Kanban board according to strict column lifecycles:

| Column | Description & Rules |
|---|---|
| **Backlog** | Unscheduled prospective items, future enhancements, and deferred tasks. Added as draft items on the board. |
| **Ready** | Immediate prioritized tasks ready for implementation. Tasks must be converted into a formal GitHub Issue in the repository before being placed into `Ready`. |
| **In Progress** | Actively worked tasks with an assigned feature branch and/or active Pull Request. |
| **Done** | Completed milestones, releases, and resolved issues/tasks. Closed PRs/issues and completed draft milestones reside here. |

*Note*: Routine release cuts and version bump chores are not tracked as board items.

---

## Git Policy & Pull Request Hygiene

**Never push directly to `main`.** All changes must go through a pull request:

1. **Branch creation**: Always branch from the latest `origin/main`:
   ```bash
   git checkout origin/main -b feature/your-description
   ```
2. **Pull request**: Push your branch and open a PR targeting `main`.
3. **PR verification**: Always confirm the PR is open before reporting to the user.
4. **Existing PRs**: Before pushing additional commits, verify that the PR is still open. If already merged, branch fresh from `origin/main` and cherry-pick.
5. **CI Triggering**: Pushes to feature branches do not trigger redundant push builds; CI runs exclusively via the `pull_request` event targeting `main`.

---

## Three-File Versioning Policy & Releases

### Versioning Files

```
ha-addon/NEXT_VERSION    ← Source of truth for the upcoming release (e.g. 0.4.8). Updated in PRs.
ha-addon/config.yaml     ← Last RELEASED version on main (only modified by the release workflow).
ha-addon-dev/config.yaml ← Dev channel pre-release version (<NEXT_VERSION>b<N>). Updated in PRs.
```

- **`ha-addon/config.yaml`**: Holds the last *released* version on `main`. The Home Assistant supervisor reads this directly from the repository to check for updates; it must never point to unbuilt container images.
- **`ha-addon/NEXT_VERSION`**: The next stable version. Reuse across multiple PRs targeting the same milestone. Bump only when explicitly requested or when introducing breaking/major changes.
- **`ha-addon-dev/config.yaml`**: Every feature PR must bump this version to `<NEXT_VERSION>b<N+1>`, where `N` is the highest existing pre-release tag for that version.

### Release Workflow

The release pipeline (`.github/workflows/release.yml`) is triggered via `workflow_dispatch` on `main`:
1. Validates that the release version matches `ha-addon/NEXT_VERSION`.
2. Creates and pushes the git tag.
3. Builds and pushes multi-architecture Docker images (`amd64`, `aarch64`) to GHCR.
4. Creates a GitHub Release with auto-generated release notes.
5. Automatically opens a `chore/post-release-X.Y.Z` PR that stamps `ha-addon/config.yaml`, increments `NEXT_VERSION`, resets `ha-addon-dev` to `b1`, and dates the changelog.

---

## Repository Architecture & Conventions

The repository contains two distinct applications:

### 1. Home Assistant Addon (`ha-addon/`)
- **Backend**: FastAPI + SQLAlchemy + SQLite. Listens on port 8099.
- **Storage**: SQLite database persists at `/data/health_recorder.db` across container updates.
- **Frontend**: Lightweight vanilla-JS SPA (`ha-addon/ui/index.html`) copied to `/app/static/index.html`.
- **Ingress URL Routing**: Served via Home Assistant ingress at `/api/hassio_ingress/<hash>/`. All `fetch()` requests in the UI must use **relative paths without leading slashes** (e.g. `health/body-metrics`) so requests route through the ingress proxy.
- **Multi-user Isolation**: `app/dependencies.py` (`get_ha_user()`) authenticates users from `X-Remote-User-Id` only when the `X-Ingress-Path` supervisor signature header is present (preventing direct impersonation). All queries filter on `ha_user_id`.

### 2. Standalone App (`backend/` + `frontend/`)
- **Backend**: FastAPI app at `backend/app/main.py`. Configured via `backend/.env`. Single-user mode without `ha_user_id` filtering.
- **Frontend**: Modern React 19 + TypeScript + Vite + TailwindCSS 4 SPA at `frontend/`. Proxies `/api/*` to `http://localhost:8000`.

### Base Image & s6-overlay Supervision
The Home Assistant addon Docker image is built from `ghcr.io/home-assistant/amd64-base-python:3.12-alpine3.20`:
- **Supervisor**: Managed via s6-overlay with the `#!/usr/bin/with-contenv bashio` shebang.
- **Startup script (`ha-addon/run.sh`)**:
  - Reads configuration from `/data/options.json` using `bashio::config`.
  - Sets environment variables (`DATABASE_URL`, Google OAuth client credentials).
  - Starts Uvicorn on port 8099 via `exec python3 -m uvicorn app.main:app`.

---

## Standalone Container Testing Walkthrough

You can build and test the Home Assistant addon container locally without running a full Home Assistant instance:

```bash
# 1. Build the container image locally
docker build -t health-recorder-test ha-addon/

# 2. Create a local scratch directory with dummy addon options
mkdir -p ./data
cat << 'EOF' > ./data/options.json
{
  "google_client_id": "",
  "google_client_secret": "",
  "google_redirect_uri": ""
}
EOF

# 3. Run the container with volume mount for options and database
docker run --rm -it \
  -p 8099:8099 \
  -v "$(pwd)/data:/data" \
  health-recorder-test

# 4. Verify API response in another terminal
curl -s http://localhost:8099/health/lab-types | head -c 200
```

---

## Development & Test Commands

### Backend Tests
```bash
# HA addon tests (CRUD, user isolation, impersonation prevention)
cd ha-addon
pip install -r requirements.txt -r requirements-test.txt
python -m pytest tests/ -v

# Standalone backend tests (CRUD, validation)
cd backend
pip install -r requirements.txt -r requirements-test.txt
python -m pytest tests/ -v
```

### Static Analysis & Lints
```bash
# Validate OpenSpec specifications and workspace
npx --yes @fission-ai/openspec validate --all --strict
npx --yes @fission-ai/openspec doctor

# YAML and Dockerfile linting
yamllint -c .yamllint.yml ha-addon/config.yaml ha-addon/build.yaml
hadolint ha-addon/Dockerfile

# Python AST syntax check
python3 -c "import ast, pathlib; [ast.parse(f.read_text()) for f in pathlib.Path('ha-addon/app').rglob('*.py')]"
python3 -c "import ast, pathlib; [ast.parse(f.read_text()) for f in pathlib.Path('backend/app').rglob('*.py')]"

# Frontend lint and build
cd frontend
npm run lint
npm run build
```

---

## Changelog Policy

Every PR that changes addon or application behavior must update `CHANGELOG.md`:
- Add an entry under `## [Unreleased]` following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) standards (`Added`, `Changed`, `Fixed`, `Removed`).
- The release workflow automatically transfers unreleased changes to the release version during release cuts.
