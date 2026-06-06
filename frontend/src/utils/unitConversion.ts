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

export function labConvertedHint(
  testType: string,
  value: number,
  storedUnit: string,
  prefUnit: 'mg_dl' | 'mmol',
): string {
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
