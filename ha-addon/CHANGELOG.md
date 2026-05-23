# Changelog

All notable changes to the Health Recorder HA addon are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions match `config.yaml` and the GitHub release tags.

---

## [Unreleased]

## [0.1.3] - unreleased

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

[Unreleased]: https://github.com/nsaputro/health-recorder/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/nsaputro/health-recorder/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/nsaputro/health-recorder/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/nsaputro/health-recorder/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/nsaputro/health-recorder/releases/tag/v0.1.0
