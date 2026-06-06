import axios from 'axios'
import type {
  BodyMetric, BodyMetricCreate,
  LabResult, LabResultCreate,
  VitalSign, VitalSignCreate,
  LabReferenceRange,
  GoogleCredential,
  SyncResult,
  UserPreference,
} from '../types/health'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Body Metrics ─────────────────────────────────────────────────────────────
export const bodyMetrics = {
  list: (params?: { limit?: number; offset?: number; since?: string }) =>
    http.get<BodyMetric[]>('/health/body-metrics', { params }).then((r) => r.data),
  create: (data: BodyMetricCreate) =>
    http.post<BodyMetric>('/health/body-metrics', data).then((r) => r.data),
  update: (id: number, data: BodyMetricCreate) =>
    http.put<BodyMetric>(`/health/body-metrics/${id}`, data).then((r) => r.data),
  delete: (id: number) => http.delete(`/health/body-metrics/${id}`),
  sync: (id: number) => http.post(`/sync/body-metrics/${id}`).then((r) => r.data),
}

// ── Lab Results ───────────────────────────────────────────────────────────────
export const labResults = {
  list: (params?: { test_type?: string; limit?: number; offset?: number; since?: string }) =>
    http.get<LabResult[]>('/health/lab-results', { params }).then((r) => r.data),
  create: (data: LabResultCreate) =>
    http.post<LabResult>('/health/lab-results', data).then((r) => r.data),
  update: (id: number, data: LabResultCreate) =>
    http.put<LabResult>(`/health/lab-results/${id}`, data).then((r) => r.data),
  delete: (id: number) => http.delete(`/health/lab-results/${id}`),
  sync: (id: number) => http.post(`/sync/lab-results/${id}`).then((r) => r.data),
  types: (gender?: string) =>
    http.get<LabReferenceRange[]>('/health/lab-types', { params: gender ? { gender } : {} }).then((r) => r.data),
}

// ── Vital Signs ────────────────────────────────────────────────────────────────
export const vitalSigns = {
  list: (params?: { limit?: number; offset?: number; since?: string }) =>
    http.get<VitalSign[]>('/health/vital-signs', { params }).then((r) => r.data),
  create: (data: VitalSignCreate) =>
    http.post<VitalSign>('/health/vital-signs', data).then((r) => r.data),
  update: (id: number, data: VitalSignCreate) =>
    http.put<VitalSign>(`/health/vital-signs/${id}`, data).then((r) => r.data),
  delete: (id: number) => http.delete(`/health/vital-signs/${id}`),
  sync: (id: number) => http.post(`/sync/vital-signs/${id}`).then((r) => r.data),
}

// ── Google Auth ────────────────────────────────────────────────────────────────
export const googleAuth = {
  status: () => http.get<GoogleCredential>('/auth/google/status').then((r) => r.data),
  disconnect: () => http.delete('/auth/google/disconnect').then((r) => r.data),
  loginUrl: () => `${http.defaults.baseURL}/auth/google/login`,
}

// ── User Preferences ──────────────────────────────────────────────────────────
export const userPrefs = {
  get:    () => http.get<UserPreference>('/auth/preferences').then((r) => r.data),
  update: (data: UserPreference) => http.put<UserPreference>('/auth/preferences', data).then((r) => r.data),
}

// ── Sync All ───────────────────────────────────────────────────────────────────
export const syncAll = () =>
  http.post<SyncResult>('/sync/all').then((r) => r.data)
