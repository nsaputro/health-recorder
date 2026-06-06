# Changelog

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

[0.4.1]: https://github.com/nsaputro/health-recorder/releases/tag/v0.4.1
