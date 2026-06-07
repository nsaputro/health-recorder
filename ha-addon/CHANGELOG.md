# Changelog

## [0.4.3] - 2026-06-07

### Added
- **ALT and ALP liver function tests**: new lab test types `alt` (ALT, U/L) and `alp` (ALP, U/L)
  with reference ranges (ALT normal 7–56 U/L, female ≤45; ALP normal 44–147 U/L) and a new
  "Liver" category in the Reference Ranges tab.
- **eGFR**: new lab test type `egfr` (mL/min/1.73m²); higher-is-better, normal ≥ 60, shown in the
  Kidney category.
- **Albumin**: new lab test type `albumin` (g/dL / g/L); serum albumin normal 3.5–5.0 g/dL,
  grouped under Blood.
- **Urine Creatinine**: new lab test type `urine_creatinine` (mg/dL / mmol/L); normal 20–300 mg/dL,
  grouped under Kidney; conversion hint mg/dL ↔ mmol/L.
- **Vitamin D**: new lab test type `vitamin_d` (ng/mL / nmol/L); normal 30–100 ng/mL, grouped
  under a new Vitamins category; conversion hint ng/mL ↔ nmol/L.
- **Alternative names and info icon in Reference Ranges**: each test shows its common clinical
  alternative name (e.g. SGPT for ALT, GFR for eGFR, 25-OH for Vitamin D) and a ⓘ info button
  with a brief description of the test.

[0.4.3]: https://github.com/nsaputro/health-recorder/releases/tag/v0.4.3
