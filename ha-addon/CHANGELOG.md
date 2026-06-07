# Changelog

## [0.4.4] - 2026-06-07

### Changed
- **Google Fit removed; Google Health API v4 adopted**: all Google Fit integration has been
  removed. Weight, heart rate, and blood glucose are now synced via the **Google Health API v4**
  (`health.googleapis.com`). Blood pressure is not supported by the Google Health API v4 and
  is no longer synced to Google — it continues to be recorded locally and synced to Google Sheets.
  OAuth scopes updated: all `fitness.*` scopes removed, replaced by
  `googlehealth.health_metrics_and_measurements`. Existing users must re-authorise their Google
  account to obtain the new scope.
- Database column `synced_to_fit` renamed to `synced_to_google` across all health tables
  (migration runs automatically on startup).
- Sync result key renamed from `google_fit` to `google_health` in all API responses and
  frontend sync success messages.
- "Fit" sync badge in data tables renamed to "Health".

[0.4.4]: https://github.com/nsaputro/health-recorder/releases/tag/v0.4.4
