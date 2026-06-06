import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { labResults as api, userPrefs } from '../api/client'
import LabResultForm from '../components/forms/LabResultForm'
import LabResultChart from '../components/charts/LabResultChart'
import TrendSummary from '../components/charts/TrendSummary'
import TimeRangeFilter, { sinceFromRange, type RangeLabel } from '../components/charts/TimeRangeFilter'
import type { LabResultCreate, LabReferenceRange } from '../types/health'

const LAB_COLORS: Record<string, string> = {
  cholesterol_total: '#6366f1',
  cholesterol_ldl:   '#ef4444',
  cholesterol_hdl:   '#22c55e',
  triglycerides:     '#f59e0b',
  glucose_fasting:   '#3b82f6',
  glucose_random:    '#60a5fa',
  glucose_hba1c:     '#0ea5e9',
  uric_acid:         '#8b5cf6',
  creatinine:        '#64748b',
  hemoglobin:        '#ec4899',
}

function StatusBadge({ value, range: r }: { value: number; range?: LabReferenceRange }) {
  if (!r) return null
  if (r.higher_better) {
    if (value >= (r.low ?? 0)) return <span className="badge-success">Good</span>
    return <span className="badge-danger">Low</span>
  }
  if (r.low != null && value < r.low) return <span className="badge-warning">Low</span>
  if (value <= (r.normal_max ?? Infinity)) return <span className="badge-success">Normal</span>
  if (value <= (r.borderline_max ?? Infinity)) return <span className="badge-warning">Borderline</span>
  return <span className="badge-danger">High</span>
}

function refRangeText(r: LabReferenceRange): string {
  if (r.higher_better) return `Good: ≥ ${r.low} ${r.unit}`
  const lo = r.low != null ? `${r.low}–` : '< '
  const hi = r.normal_max != null && r.normal_max < 900 ? `${r.normal_max}` : ''
  const bor = r.borderline_max != null && r.borderline_max < 900 ? ` · Border: ≤ ${r.borderline_max}` : ''
  return `Normal: ${lo}${hi} ${r.unit}${bor}`
}

export default function LabResultsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [range, setRange] = useState<{ label: RangeLabel; months: number }>({ label: '3M', months: 3 })

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['lab-results', filterType, range.months],
    queryFn: () => api.list({
      test_type: filterType || undefined,
      limit: 500,
      since: sinceFromRange(range.months),
    }),
  })

  const { data: prefs } = useQuery({ queryKey: ['user-prefs'], queryFn: userPrefs.get, retry: false })
  const gender = prefs?.gender !== 'unset' ? prefs?.gender : undefined

  const { data: labTypes = [] } = useQuery({
    queryKey: ['lab-types', gender],
    queryFn: () => api.types(gender),
  })

  const createMutation = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-results'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-results'] }),
  })

  const syncMutation = useMutation({
    mutationFn: api.sync,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-results'] }),
  })

  const handleCreate = async (data: LabResultCreate) => {
    await createMutation.mutateAsync(data)
  }

  const typeMap = Object.fromEntries(labTypes.map((t: LabReferenceRange) => [t.test_type, t]))

  // Chart records — when a type is selected, records are already filtered server-side
  const chartRecords = filterType ? records : []

  // Sorted ascending for TrendSummary
  const sortedAsc = [...chartRecords].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lab Results</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Result'}
        </button>
      </div>

      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-base font-semibold mb-4">Add Lab Result</h2>
          <LabResultForm onSubmit={handleCreate} loading={createMutation.isPending} />
        </div>
      )}

      {/* Filter + chart card */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h2 className="text-base font-semibold">Trend</h2>
          <select
            className="input max-w-xs"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Select test type to chart…</option>
            {labTypes.map((t: LabReferenceRange) => (
              <option key={t.test_type} value={t.test_type}>{t.display_name}</option>
            ))}
          </select>
          <TimeRangeFilter
            value={range.label}
            onChange={(label, months) => setRange({ label, months })}
          />
        </div>
        {filterType && chartRecords.length > 0 ? (
          <>
            <LabResultChart
              data={chartRecords}
              referenceRange={typeMap[filterType]}
              color={LAB_COLORS[filterType] ?? '#3b82f6'}
            />
            <TrendSummary
              values={sortedAsc.map((r) => r.value)}
              unit={typeMap[filterType]?.unit ?? chartRecords[0]?.unit ?? ''}
            />
          </>
        ) : filterType ? (
          <p className="text-gray-400 text-sm">No records for this test type in the selected period.</p>
        ) : null}
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">All Results ({records.length})</h2>
          {filterType && (
            <button className="text-xs text-blue-600 hover:underline" onClick={() => setFilterType('')}>
              Clear filter
            </button>
          )}
        </div>
        {isLoading ? (
          <p className="text-gray-400">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-gray-400 text-sm">No results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Test</th>
                  <th className="pb-2 pr-4">Result</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Lab</th>
                  <th className="pb-2 pr-4">Sync</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-600">{format(parseISO(r.measured_at), 'MMM d, yyyy')}</td>
                    <td className="py-2 pr-4 font-medium">{typeMap[r.test_type]?.display_name ?? r.test_type}</td>
                    <td className="py-2 pr-4">
                      <span className="font-semibold">{r.value} {r.unit}</span>
                      {typeMap[r.test_type] && (
                        <div className="text-xs text-gray-400 mt-0.5">{refRangeText(typeMap[r.test_type])}</div>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge value={r.value} range={typeMap[r.test_type]} />
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">{r.lab_name ?? '—'}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-1">
                        {r.synced_to_fit     ? <span className="badge-success">Fit</span>    : <span className="badge-gray">Fit</span>}
                        {r.synced_to_sheets  ? <span className="badge-success">Sheets</span> : <span className="badge-gray">Sheets</span>}
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-600 hover:underline text-xs"
                          onClick={() => syncMutation.mutate(r.id)}
                          disabled={syncMutation.isPending}
                        >Sync</button>
                        <button
                          className="text-red-500 hover:underline text-xs"
                          onClick={() => { if (confirm('Delete this result?')) deleteMutation.mutate(r.id) }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
