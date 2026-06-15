import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { labResults as api, userPrefs } from '../api/client'
import { labConvertedHint, normalizeForBadge } from '../utils/unitConversion'
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

function StatusBadge({ value, unit, range: r }: { value: number; unit: string; range?: LabReferenceRange }) {
  if (!r) return null
  const v = normalizeForBadge(r.test_type, value, unit)
  if (r.higher_better) {
    if (v >= (r.low ?? 0)) return <span className="badge-success">Good</span>
    return <span className="badge-danger">Low</span>
  }
  if (r.low != null && v < r.low) return <span className="badge-warning">Low</span>
  if (v <= (r.normal_max ?? Infinity)) return <span className="badge-success">Normal</span>
  if (v <= (r.borderline_max ?? Infinity)) return <span className="badge-warning">Borderline</span>
  return <span className="badge-danger">High</span>
}

function refRangeText(r: LabReferenceRange, compact = false): string {
  if (r.higher_better) return `Good: ≥ ${r.low} ${r.unit}`
  const hi  = r.normal_max != null && r.normal_max < 900 ? `${r.normal_max}` : ''
  const lo  = r.low != null && r.low > 0 ? `${r.low}–` : (hi ? '< ' : '')
  const bor = !compact && r.borderline_max != null && r.borderline_max < 900
    ? ` · Border: ≤ ${r.borderline_max}` : ''
  return `Normal: ${lo}${hi} ${r.unit}${bor}`
}

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
  </svg>
)

export default function LabResultsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [showForm, setShowForm] = useState(false)
  const [lastLabDate, setLastLabDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterType, setFilterType] = useState(() => searchParams.get('type') ?? '')
  const [range, setRange] = useState<{ label: RangeLabel; months: number }>(
    () => searchParams.get('type') ? { label: 'All', months: 0 } : { label: '3M', months: 3 }
  )

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
    setLastLabDate(data.measured_at)
    await createMutation.mutateAsync(data)
  }

  const typeMap = Object.fromEntries(labTypes.map((t: LabReferenceRange) => [t.test_type, t]))

  // Chart records — when a type is selected, records are already filtered server-side.
  // Normalize all values to the reference unit so mixed-unit records chart consistently.
  const chartRecords = filterType
    ? records.map((r) => ({ ...r, value: normalizeForBadge(filterType, r.value, r.unit) }))
    : []

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
          <LabResultForm onSubmit={handleCreate} loading={createMutation.isPending} labUnit={prefs?.lab_unit} defaultValues={{ measured_at: lastLabDate }} />
        </div>
      )}

      {/* Single filter card — controls chart + table */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <select
            className="input max-w-xs"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All test types</option>
            {labTypes.map((t: LabReferenceRange) => (
              <option key={t.test_type} value={t.test_type}>{t.display_name}</option>
            ))}
          </select>
          <TimeRangeFilter
            value={range.label}
            onChange={(label, months) => setRange({ label, months })}
          />
          {filterType && (
            <button className="text-xs text-blue-600 hover:underline" onClick={() => setFilterType('')}>
              Clear
            </button>
          )}
        </div>

        {filterType && chartRecords.length > 0 && (
          <div className="mt-4">
            <LabResultChart
              data={chartRecords}
              referenceRange={typeMap[filterType]}
              color={LAB_COLORS[filterType] ?? '#3b82f6'}
            />
            <TrendSummary
              values={sortedAsc.map((r) => r.value)}
              unit={typeMap[filterType]?.unit ?? chartRecords[0]?.unit ?? ''}
            />
          </div>
        )}
        {filterType && chartRecords.length === 0 && (
          <p className="text-gray-400 text-sm mt-4">No records for this test type in the selected period.</p>
        )}
      </div>

      {/* Table — edge-to-edge within card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold">Results ({records.length})</h2>
        </div>
        {isLoading ? (
          <p className="px-6 pb-6 text-gray-400">Loading…</p>
        ) : records.length === 0 ? (
          <p className="px-6 pb-6 text-gray-400 text-sm">No results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-3 pl-6">Date</th>
                  <th className="pb-2 pr-3">Test</th>
                  <th className="pb-2 pr-3">Result</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Lab</th>
                  <th className="pb-2 pr-3">Sync</th>
                  <th className="pb-2 pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 pl-6 text-gray-600">{format(parseISO(r.measured_at), 'MMM d, yyyy')}</td>
                    <td className="py-2 pr-3 font-medium">{typeMap[r.test_type]?.display_name ?? r.test_type}</td>
                    <td className="py-2 pr-3">
                      <span className="font-semibold">
                        {r.value} {r.unit}
                        {prefs?.lab_unit && (() => {
                          const hint = labConvertedHint(r.test_type, r.value, r.unit, prefs.lab_unit)
                          return hint ? <span className="text-gray-400 font-normal ml-1 text-xs">{hint}</span> : null
                        })()}
                      </span>
                      {typeMap[r.test_type] && (
                        <div className="text-xs text-gray-400 mt-0.5">{refRangeText(typeMap[r.test_type], true)}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge value={r.value} unit={r.unit} range={typeMap[r.test_type]} />
                    </td>
                    <td className="py-2 pr-3 text-gray-500 text-xs">{r.lab_name ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        {r.synced_to_google     ? <span className="badge-success">Health</span>    : <span className="badge-gray">Health</span>}
                        {r.synced_to_sheets  ? <span className="badge-success">Sheets</span> : <span className="badge-gray">Sheets</span>}
                      </div>
                    </td>
                    <td className="py-2 pr-6">
                      <div className="flex gap-2 items-center">
                        <button
                          className="text-blue-600 hover:underline text-xs"
                          onClick={() => syncMutation.mutate(r.id)}
                          disabled={syncMutation.isPending}
                        >Sync</button>
                        <button
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Delete"
                          onClick={() => { if (confirm('Delete this result?')) deleteMutation.mutate(r.id) }}
                        >
                          <TrashIcon />
                        </button>
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
