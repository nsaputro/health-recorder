import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { bodyMetrics as api, userPrefs } from '../api/client'
import { kgToLb } from '../utils/unitConversion'
import BodyMetricForm from '../components/forms/BodyMetricForm'
import WeightChart from '../components/charts/WeightChart'
import TrendSummary from '../components/charts/TrendSummary'
import TimeRangeFilter, { sinceFromRange, type RangeLabel } from '../components/charts/TimeRangeFilter'
import type { BodyMetricCreate } from '../types/health'

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
  </svg>
)

export default function BodyMetricsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [range, setRange] = useState<{ label: RangeLabel; months: number }>({ label: '3M', months: 3 })

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['body-metrics', range.months],
    queryFn: () => api.list({ limit: 500, since: sinceFromRange(range.months) }),
  })

  const { data: prefs } = useQuery({ queryKey: ['user-prefs'], queryFn: userPrefs.get, retry: false })

  const createMutation = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-metrics'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-metrics'] }),
  })

  const syncMutation = useMutation({
    mutationFn: api.sync,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-metrics'] }),
  })

  const handleCreate = async (data: BodyMetricCreate) => {
    await createMutation.mutateAsync(data)
  }

  function bmiLabel(bmi: number | null) {
    if (!bmi) return null
    if (bmi < 18.5) return <span className="badge-warning">Underweight</span>
    if (bmi < 25)   return <span className="badge-success">Normal</span>
    if (bmi < 30)   return <span className="badge-warning">Overweight</span>
    return <span className="badge-danger">Obese</span>
  }

  // For TrendSummary: sort ascending for "latest = last element"
  const sortedAsc = [...records].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  )
  const weightValues = sortedAsc.map((r) => r.weight_kg)
  const bmiValues    = sortedAsc.filter((r) => r.bmi != null).map((r) => r.bmi as number)

  // Pre-fill height from the most recent record that has one
  const latestHeight = records.find((r) => r.height_cm != null)?.height_cm

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Body Weight & BMI</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Entry'}
        </button>
      </div>

      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-base font-semibold mb-4">Add Weight Entry</h2>
          <BodyMetricForm
            defaultValues={{ height_cm: latestHeight }}
            onSubmit={handleCreate}
            loading={createMutation.isPending}
            weightUnit={prefs?.weight_unit}
          />
          {createMutation.isError && (
            <p className="text-red-500 text-sm mt-2">Error saving entry.</p>
          )}
        </div>
      )}

      {/* Chart card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Trend</h2>
          <TimeRangeFilter
            value={range.label}
            onChange={(label, months) => setRange({ label, months })}
          />
        </div>
        {records.length > 1 ? (
          <>
            <WeightChart data={records} showBmi />
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Weight</p>
                <TrendSummary values={weightValues} unit="kg" decimals={1} />
              </div>
              {bmiValues.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">BMI</p>
                  <TrendSummary values={bmiValues} unit="" decimals={1} />
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-sm">Add 2+ entries to see the trend chart.</p>
        )}
      </div>

      {/* Table — edge-to-edge within card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold">All Entries ({records.length})</h2>
        </div>
        {isLoading ? (
          <p className="px-6 pb-6 text-gray-400">Loading…</p>
        ) : records.length === 0 ? (
          <p className="px-6 pb-6 text-gray-400">No entries yet. Add your first weight reading above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-3 pl-6">Date</th>
                  <th className="pb-2 pr-3">Weight</th>
                  <th className="pb-2 pr-3">Height</th>
                  <th className="pb-2 pr-3">BMI</th>
                  <th className="pb-2 pr-3">Sync</th>
                  <th className="pb-2 pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 pl-6 text-gray-600">
                      {format(parseISO(r.measured_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="py-2 pr-3 font-semibold">
                      {r.weight_kg} kg
                      {prefs?.weight_unit === 'lb' && (
                        <span className="text-gray-400 font-normal ml-1 text-xs">({kgToLb(r.weight_kg)} lb)</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{r.height_cm ? `${r.height_cm} cm` : '—'}</td>
                    <td className="py-2 pr-3">
                      {r.bmi ? (
                        <span className="flex items-center gap-1">
                          {r.bmi} {bmiLabel(r.bmi)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        {r.synced_to_fit     ? <span className="badge-success">Health</span>    : <span className="badge-gray">Health</span>}
                        {r.synced_to_sheets  ? <span className="badge-success">Sheets</span> : <span className="badge-gray">Sheets</span>}
                      </div>
                    </td>
                    <td className="py-2 pr-6">
                      <div className="flex gap-2 items-center">
                        <button
                          className="text-blue-600 hover:underline text-xs"
                          onClick={() => syncMutation.mutate(r.id)}
                          disabled={syncMutation.isPending}
                        >
                          Sync
                        </button>
                        <button
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Delete"
                          onClick={() => {
                            if (confirm('Delete this entry?')) deleteMutation.mutate(r.id)
                          }}
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
