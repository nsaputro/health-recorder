# Changelog

## [0.4.7] - 2026-06-16

### Fixed
- **Google sync crash**: every sync attempt failed with an internal error because the
  sync audit log was written with a user ID field that didn't exist in the database.
  The `sync_logs` table now stores `ha_user_id` (migration runs automatically), and
  Google Sheets sync logs record the user as well.
- **Stale Google tokens**: refreshed OAuth access tokens are now persisted back to the
  database instead of being refreshed in memory on every request after expiry.
- **HTML injection in addon UI**: user-entered lab names, the Google account name/email,
  and the OAuth error query parameter are now HTML-escaped before rendering.

### Added
- **Input validation**: lab results reject unknown test types and negative values;
  vital signs reject non-positive values and blood pressure readings where systolic
  is not greater than diastolic.
- **Reference Ranges → Lab Results navigation**: clicking a latest result value in the
  Reference Ranges tab navigates directly to the Lab Results tab (React) or panel (HA addon)
  with that test type pre-selected in both the filter and the chart dropdown, so the full
  history and trend chart are shown immediately.

[0.4.7]: https://github.com/nsaputro/health-recorder/releases/tag/v0.4.7
