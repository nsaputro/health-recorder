import type { LabReferenceRange } from '../types/health'

const MMOL_FACTORS: Record<string, number> = {
  cholesterol_total: 0.02586,
  cholesterol_ldl:   0.02586,
  cholesterol_hdl:   0.02586,
  triglycerides:     0.01129,
  glucose_fasting:   0.05551,
  glucose_random:    0.05551,
  uric_acid:         0.05948,
}

export function mgdlToMmol(testType: string, mgdl: number): number | null {
  const f = MMOL_FACTORS[testType]
  return f != null ? Math.round(mgdl * f * 100) / 100 : null
}

export function mmolToMgdl(testType: string, mmol: number): number | null {
  const f = MMOL_FACTORS[testType]
  return f != null ? Math.round((mmol / f) * 10) / 10 : null
}

// HbA1c uses an affine formula, not a simple multiplication factor
export function hba1cToPercent(mmolMol: number): number {
  return Math.round((0.09148 * mmolMol + 2.152) * 10) / 10
}

export function hba1cToMmolMol(percent: number): number {
  return Math.round((percent - 2.152) / 0.09148)
}

// µmol/L character comes in two Unicode forms (U+00B5 and U+03BC) — normalise before comparing
const isUmolPerL = (u: string) => u === 'µmol/L' || u === 'μmol/L'

// Normalise a lab value to the unit used in reference ranges before badge comparison.
// Reference ranges are always stored in primary units: mg/dL, %, g/dL, ng/mL, mL/min/1.73m².
export function normalizeForBadge(testType: string, value: number, unit: string): number {
  if (testType === 'glucose_hba1c'    && unit === 'mmol/mol') return hba1cToPercent(value)
  if (testType === 'creatinine'       && isUmolPerL(unit))    return Math.round(value / 88.42    * 100) / 100
  if ((testType === 'hemoglobin' || testType === 'albumin') && unit === 'g/L') return Math.round(value / 10 * 100) / 100
  if (testType === 'urine_creatinine' && unit === 'mmol/L')   return Math.round(value / 0.08842  * 10)  / 10
  if (testType === 'vitamin_d'        && unit === 'nmol/L')   return Math.round(value / 2.496    * 10)  / 10
  const f = MMOL_FACTORS[testType]
  if (f && unit === 'mmol/L') return Math.round(value / f * 10) / 10
  return value
}

export function labConvertedHint(
  testType: string,
  value: number,
  storedUnit: string,
  prefUnit: 'mg_dl' | 'mmol',
): string {
  // HbA1c: affine conversion — independent of the mmol/L preference
  if (testType === 'glucose_hba1c') {
    if (storedUnit === 'mmol/mol' && prefUnit === 'mg_dl') return `(${hba1cToPercent(value)} %)`
    if (storedUnit === '%' && prefUnit === 'mmol') return `(${hba1cToMmolMol(value)} mmol/mol)`
    return ''
  }
  // Creatinine (serum): µmol/L ↔ mg/dL (1 mg/dL = 88.42 µmol/L)
  if (testType === 'creatinine') {
    if (isUmolPerL(storedUnit)) return `(${Math.round(value / 88.42 * 100) / 100} mg/dL)`
    if (storedUnit === 'mg/dL' && prefUnit === 'mmol') return `(${Math.round(value * 88.42)} µmol/L)`
    return ''
  }
  // Hemoglobin / Albumin: g/L ↔ g/dL (1 g/dL = 10 g/L)
  if (testType === 'hemoglobin' || testType === 'albumin') {
    if (storedUnit === 'g/L')  return `(${Math.round(value / 10 * 100) / 100} g/dL)`
    if (storedUnit === 'g/dL' && prefUnit === 'mmol') return `(${Math.round(value * 10 * 10) / 10} g/L)`
    return ''
  }
  // Urine creatinine: mmol/L ↔ mg/dL (1 mg/dL = 0.08842 mmol/L)
  if (testType === 'urine_creatinine') {
    if (storedUnit === 'mmol/L') return `(${Math.round(value / 0.08842 * 10) / 10} mg/dL)`
    if (storedUnit === 'mg/dL' && prefUnit === 'mmol') return `(${Math.round(value * 0.08842 * 100) / 100} mmol/L)`
    return ''
  }
  // Vitamin D: nmol/L ↔ ng/mL (1 ng/mL = 2.496 nmol/L)
  if (testType === 'vitamin_d') {
    if (storedUnit === 'nmol/L') return `(${Math.round(value / 2.496 * 10) / 10} ng/mL)`
    if (storedUnit === 'ng/mL' && prefUnit === 'mmol') return `(${Math.round(value * 2.496 * 10) / 10} nmol/L)`
    return ''
  }
  // Standard mg/dL ↔ mmol/L (cholesterol, triglycerides, glucose, uric acid)
  const wantsMgdl = prefUnit === 'mg_dl'
  const storedIsMgdl = storedUnit === 'mg/dL'
  if (wantsMgdl === storedIsMgdl) return ''
  if (wantsMgdl) {
    const v = mmolToMgdl(testType, value)
    return v != null ? `(${v} mg/dL)` : ''
  } else {
    const v = mgdlToMmol(testType, value)
    return v != null ? `(${v} mmol/L)` : ''
  }
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10
}

export function convertRangeToMmol(r: LabReferenceRange, testType: string): LabReferenceRange {
  const f = MMOL_FACTORS[testType]
  if (!f) return r
  const c = (v: number | null) =>
    v != null && v < 900 ? Math.round(v * f * 100) / 100 : v
  return {
    ...r,
    unit:           'mmol/L',
    low:            c(r.low),
    normal_max:     c(r.normal_max),
    borderline_max: c(r.borderline_max),
  }
}
