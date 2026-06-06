# Changelog

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

[0.4.0]: https://github.com/nsaputro/health-recorder/releases/tag/v0.4.0
