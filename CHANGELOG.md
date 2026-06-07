# Changelog

All notable changes to the Health Recorder HA addon are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions match `ha-addon/config.yaml` and the GitHub release tags.

---

## [Unreleased]

### Added
- **ALT and ALP liver function tests**: new lab test types `alt` (ALT, U/L) and `alp` (ALP, U/L)
  with reference ranges (ALT normal 7–56 U/L, female ≤45; ALP normal 44–147 U/L) and a new
  "Liver" category in the Reference Ranges tab.

### Fixed
- **Lab chart unit mismatch**: chart and trend stats now normalise stored values to the
  reference unit (mg/dL, %, g/dL) before plotting, so records stored in mmol/L, µmol/L,
  g/L, or mmol/mol are displayed at the correct scale matching the y-axis label and
  reference lines.

## [0.4.1] - 2026-06-06

### Added
- **HbA1c mmol/mol unit support**: `mmol/mol` (IFCC) is now a selectable unit for HbA1c lab
  results alongside `%` (DCCT). When one unit is stored, the other is shown as a conversion
  hint in tables (e.g. `47 mmol/mol (6.5 %)`). The entry form pre-selects `mmol/mol` when
  the preferred lab unit is set to mmol. Reference range hints in the entry form are also
  displayed in mmol/mol when that unit is selected.
- **HbA1c status badge fix**: the Normal/Borderline/High status badge now correctly evaluates
  HbA1c values stored in `mmol/mol` by converting to `%` before comparing against reference
  ranges (previously, mmol/mol values were compared directly against `%` thresholds).

## [0.4.0] - 2026-06-06

### Added
- **Unit preference settings**: new `lab_unit` (`mg_dl` | `mmol`) and `weight_unit` (`kg` | `lb`)
  preferences stored per user. "Display Units" card added to Settings in both UIs.
- **Automatic unit conversion hints**: when a lab result is stored in a different unit than the
  user's preferred unit, both are shown in the results table (e.g. `200 mg/dL (5.17 mmol/L)`).
  Applies to cholesterol, triglycerides, glucose, and uric acid. HbA1c, creatinine, and
  hemoglobin are unaffected.
- **Weight lb hint**: when lb is the preferred weight unit, body weight entries display a
  `(X lb)` conversion hint alongside the stored kg value.
- **Reference Ranges tab unit conversion**: lab reference ranges are displayed in the user's
  preferred unit (converted from mg/dL when mmol is selected).
- **Form unit defaults**: the lab entry form unit dropdown pre-selects the preferred unit
  (mg/dL or mmol/L) when a test type is chosen; body weight form shows a live kg → lb hint.
- **Gender-dependent lab reference ranges**: hemoglobin, creatinine, uric acid, and HDL
  cholesterol now return gender-adjusted normal ranges when a biological sex is set.
  The `/health/lab-types` endpoint accepts an optional `?gender=` query parameter.
- **User gender preference**: new `GET/PUT /auth/preferences` endpoints store the user's
  biological sex (`male` / `female` / `unset`) per-user (HA addon) or globally (standalone).
- **Reference Ranges tab** in both UIs: dedicated view listing all 10 supported lab tests
  with their normal ranges (gender-adjusted if set), grouped by category (Lipids, Glucose,
  Kidney, Blood), and showing the user's most recent result alongside the reference.
- Gender selector card in the Settings screen of both the HA addon and the React frontend.
- Reference range sub-line shown below each result value in the lab results table.
- `higher_better` flag added to `LabReferenceRange` schema (true for HDL cholesterol).

### Changed
- `PUT /auth/preferences` now accepts partial updates — any subset of `{gender, lab_unit,
  weight_unit}` may be provided; unspecified fields are preserved unchanged.

## [0.3.3] - 2026-05-28

### Changed
- Standalone frontend upgraded to React 19, React Router 7, TailwindCSS 4, TypeScript 6,
  and Vite 8. HA addon vanilla-JS UI is unaffected.

## [0.3.2] - 2026-05-27

### Changed
- Sync-related UI (status bar indicator, Sync column, per-row Sync button) is now hidden in
  all data tables when Google sync is not configured or connected. The columns and buttons
  reappear automatically once a Google account is linked from Settings.

## [0.3.0] - unreleased

### Added
- Trend charts for all metric types in both the HA addon and the standalone frontend:
  - **Weight & BMI chart** (line chart with dual axes for weight and BMI overlay)
  - **Blood pressure chart** (dual-line: systolic + diastolic, reference lines at 120/80)
  - **Heart rate chart** (single line, reference lines at 60 and 100 bpm)
  - **Lab result charts** (one chart per test type, selected from a dropdown)
- Time-range filter (1M / 3M / 6M / 1Y / All) on Weight, Vital Signs, and Lab Results pages.
  Selected range is sent as a `?since=<ISO datetime>` query parameter so only the relevant
  records are fetched from the server.
- Trend summary stats (Latest / Avg / Min / Max) displayed below each chart.
- `?since=` query parameter on `GET /health/body-metrics`, `/health/lab-results`,
  and `/health/vital-signs` in both the HA addon and the standalone backend.
- HA addon: Chart.js 4.4 loaded from CDN (no build step required).
- Standalone frontend: extracted `VitalSignChart` and `HeartRateChart` Recharts components;
  new `TimeRangeFilter` and `TrendSummary` reusable components.

## [0.2.0] - unreleased

### Added
- Unit tests for both the HA addon (`ha-addon/tests/`) and the standalone backend
  (`backend/tests/`). Tests cover CRUD operations, BMI computation, input validation,
  multi-user isolation, and impersonation prevention (34 addon tests + 23 backend tests).
- CI now runs `pytest` on every push and PR before the Docker build step.
- Multi-user support: each Home Assistant user now has their own isolated health data.
  Authentication is automatic — HA's ingress headers identify the logged-in user with no
  extra login required.
- Username display: the logged-in HA user's display name appears in the status bar.
- New `GET /auth/me` endpoint returns the current user's HA identity.

### Security
- User headers are only trusted when `X-Ingress-Path` is also present (injected exclusively
  by the HA supervisor). Requests to port 8099 without this header are treated as anonymous
  (`ha_user_id = ""`), preventing impersonation via the direct port.

### Changed
- Google credentials are now stored per HA user; each user connects their own Google account.
- OAuth state parameter carries the HA user ID so the callback (port 8099, no ingress
  headers) can correctly attribute the credential to the right user.

### Added
- Multi-user support: each Home Assistant user now has their own isolated health data.
  Authentication is automatic — HA's ingress headers identify the logged-in user with no
  extra login required.
- Username display: the logged-in HA user's display name appears in the status bar.
- New `GET /auth/me` endpoint returns the current user's HA identity.

### Security
- User headers are only trusted when `X-Ingress-Path` is also present (injected exclusively
  by the HA supervisor). Requests to port 8099 without this header are treated as anonymous
  (`ha_user_id = ""`), preventing impersonation via the direct port.

### Changed
- Google credentials are now stored per HA user; each user connects their own Google account.
- OAuth state parameter carries the HA user ID so the callback (port 8099, no ingress
  headers) can correctly attribute the credential to the right user.

## [0.1.5] - unreleased

### Fixed
- Addon update screen now shows only the current version's release notes instead of the full
  multi-version history.

## [0.1.4] - 2026-05-23

### Added
- Dark mode support: UI automatically switches to a dark palette when the OS (or Home
  Assistant) is in dark mode, using the CSS `prefers-color-scheme: dark` media query.
  Colors mirror HA's own dark theme (`#111111` background, `#1c1c1c` card surface,
  muted text and divider tones).

## [0.1.3] - 2026-05-23

### Fixed
- Browser no longer caches `index.html`; UI updates are visible immediately after an addon
  version update. FastAPI now sends `Cache-Control: no-cache, no-store, must-revalidate` on
  every `index.html` response. Matching `<meta>` tags added as a fallback for proxies that
  strip HTTP headers.

## [0.1.2] - 2026-05-23

### Changed
- Addon UI redesigned to match Home Assistant's visual language:
  - Color palette switched to HA primary blue (`#03a9f4`) and Material green/red for status badges
  - Cards use Material elevation-2 shadow and 12 px border-radius (matches Lovelace cards)
  - Tab bar uses uppercase labels with HA-style blue bottom indicator
  - Font changed to Roboto / Noto Sans (same as HA frontend)
  - Redundant app-title header removed — HA toolbar already shows the panel name
  - Replaced with a slim "Google Sync" status bar; label clarified to guide users to Settings
- Lab result unit field changed from free-text input to a dropdown
  - mg/dL is always the first (default) option for all applicable test types
  - mmol/L available as an alternative for lipids, glucose, and uric acid
  - HbA1c locked to `%`; hemoglobin to `g/dL / g/L`; creatinine to `mg/dL / μmol/L`
  - Reference range hint updates dynamically when test type changes

## [0.1.1] - 2026-05-23

### Fixed
- All `fetch()` calls in `ui/index.html` changed from absolute paths (`/health/…`) to relative
  paths (`health/…`) so requests route correctly through HA ingress
  (`/api/hassio_ingress/<hash>/`). Previously, absolute paths resolved against the HA server
  itself and returned non-JSON responses, causing "Unexpected non-whitespace character" errors
  on every save and load.

## [0.1.0] - 2026-05-22

### Added
- Initial release of the Health Recorder Home Assistant addon
- Tracks body weight / BMI, lab results (10 test types), blood pressure, and heart rate
- Vanilla-JS single-page UI served directly by the addon — no build step required
- Google Fit sync for weight, blood pressure, heart rate, and blood glucose
- Google Sheets sync for all metrics including cholesterol, uric acid, and HbA1c
- HA ingress support (sidebar panel) plus direct port 8099 for OAuth redirect URI
- Pre-built Docker images for `amd64` and `aarch64` on `ghcr.io`
- `repository.yaml` so HA recognises the repo as a valid addon source

[Unreleased]: https://github.com/nsaputro/health-recorder/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/nsaputro/health-recorder/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/nsaputro/health-recorder/compare/v0.3.3...v0.4.0
[0.3.3]: https://github.com/nsaputro/health-recorder/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/nsaputro/health-recorder/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/nsaputro/health-recorder/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/nsaputro/health-recorder/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nsaputro/health-recorder/compare/v0.1.4...v0.2.0
[0.1.5]: https://github.com/nsaputro/health-recorder/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/nsaputro/health-recorder/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/nsaputro/health-recorder/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/nsaputro/health-recorder/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/nsaputro/health-recorder/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/nsaputro/health-recorder/releases/tag/v0.1.0
