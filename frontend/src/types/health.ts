export interface BodyMetric {
  id: number
  measured_at: string
  weight_kg: number
  height_cm: number | null
  bmi: number | null
  notes: string | null
  synced_to_fit: boolean
  synced_to_sheets: boolean
  created_at: string
}

export interface BodyMetricCreate {
  measured_at: string
  weight_kg: number
  height_cm?: number | null
  notes?: string | null
}

export interface LabResult {
  id: number
  measured_at: string
  test_type: string
  value: number
  unit: string
  lab_name: string | null
  notes: string | null
  synced_to_fit: boolean
  synced_to_sheets: boolean
  created_at: string
}

export interface LabResultCreate {
  measured_at: string
  test_type: string
  value: number
  unit?: string
  lab_name?: string | null
  notes?: string | null
}

export interface VitalSign {
  id: number
  measured_at: string
  systolic_bp: number | null
  diastolic_bp: number | null
  heart_rate: number | null
  notes: string | null
  synced_to_fit: boolean
  synced_to_sheets: boolean
  created_at: string
}

export interface VitalSignCreate {
  measured_at: string
  systolic_bp?: number | null
  diastolic_bp?: number | null
  heart_rate?: number | null
  notes?: string | null
}

export interface LabReferenceRange {
  test_type: string
  display_name: string
  unit: string
  low: number | null
  normal_max: number | null
  borderline_max: number | null
  higher_better: boolean
}

export interface UserPreference {
  gender: 'male' | 'female' | 'unset'
}

export interface GoogleCredential {
  user_email: string
  user_name: string | null
  sheets_spreadsheet_id: string | null
  created_at: string
}

export interface SyncResult {
  google_fit: { body_metrics: number; vital_signs: number; lab_results: number; errors: number }
  google_sheets: { body_metrics: number; vital_signs: number; lab_results: number; errors: number }
}
