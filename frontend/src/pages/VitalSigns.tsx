import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { vitalSigns as api } from '../api/client'
import VitalSignForm from '../components/forms/VitalSignForm'
import VitalSignChart from '../components/charts/VitalSignChart'
import HeartRateChart from '../components/charts/HeartRateChart'
import TrendSummary from '../components/charts/TrendSummary'
import TimeRangeFilter, { sinceFromRange, type RangeLabel } from '../components/charts/TimeRangeFilter'
import type { VitalSignCreate } from '../types/health'

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
  </svg>
)

function BPStatus({ s, d }: { s: number | null; d: number | null }) {
  if (!s || !d) return null
  if (s < 120 && d < 80) return <span className="badge-success">Normal</span>
  if (s < 130 && d < 80) return <span className="badge-warning">Elevated</span>
  if (s < 140 || d < 90) return <span className="badge-warning">Stage 1 HT</span>
  return <span className="badge-danger">Stage 2 HT</span>
}

export default function VitalSignsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [range, setRange] = useState<{ label: RangeLabel; months: number }>({ label: '3M', months: 3 })

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['vital-signs', range.months],
    queryFn: () => api.list({ limit: 500, since: sinceFromRange(range.months) }),
  })

  const createMutation = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital-signs'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vital-signs'] }),
  })

  const syncMutation = useMutation({
    mutationFn: api.sync,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vital-signs'] }),
  })

  const handleCreate = async (data: VitalSignCreate) => {
    await createMutation.mutateAsync(data)
  }

  // Sort ascending for TrendSummary (latest = last element)
  const sortedAsc = [...records].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  )
  const bpRecords = sortedAsc.filter((r) => r.systolic_bp != null && r.diastolic_bp != null)
  const hrRecords = sortedAsc.filter((r) => r.heart_rate != null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blood Pressure & Heart Rate</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Reading'}
        </button>
      </div>

      {showForm && (
        <div className="card max-w-lg">
          <h2 className="text-base font-semibold mb-4">Add Vitals Reading</h2>
          <VitalSignForm onSubmit={handleCreate} loading={createMutation.isPending} />
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
            {/* Blood pressure chart */}
            {bpRecords.length > 1 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                  Blood Pressure
                </p>
                <VitalSignChart data={records} />
                <TrendSummary
                  values={bpRecords.map((r) => r.systolic_bp as number)}
                  unit="mmHg sys"
                  decimals={0}
                />
              </div>
            )}

            {/* Heart rate chart */}
            {hrRecords.length > 1 && (
              <div className={bpRecords.length > 1 ? 'mt-6' : ''}>
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                  Heart Rate
                </p>
                <HeartRateChart data={records} />
                <TrendSummary
                  values={hrRecords.map((r) => r.heart_rate as number)}
                  unit="bpm"
                  decimals={0}
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-400 text-sm">Add 2+ readings to see trend charts.</p>
        )}
      </div>

      {/* Table — edge-to-edge within card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold">All Readings ({records.length})</h2>
        </div>
        {isLoading ? (
          <p className="px-6 pb-6 text-gray-400">Loading…</p>
        ) : records.length === 0 ? (
          <p className="px-6 pb-6 text-gray-400 text-sm">No readings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-3 pl-6">Date</th>
                  <th className="pb-2 pr-3">BP</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Heart Rate</th>
                  <th className="pb-2 pr-3">Sync</th>
                  <th className="pb-2 pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 pl-6 text-gray-600">{format(parseISO(r.measured_at), 'MMM d, yyyy HH:mm')}</td>
                    <td className="py-2 pr-3 font-semibold">
                      {r.systolic_bp && r.diastolic_bp
                        ? `${r.systolic_bp}/${r.diastolic_bp} mmHg`
                        : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <BPStatus s={r.systolic_bp} d={r.diastolic_bp} />
                    </td>
                    <td className="py-2 pr-3">{r.heart_rate ? `${r.heart_rate} bpm` : '—'}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        {r.synced_to_fit    ? <span className="badge-success">Health</span>    : <span className="badge-gray">Health</span>}
                        {r.synced_to_sheets ? <span className="badge-success">Sheets</span> : <span className="badge-gray">Sheets</span>}
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
                          onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(r.id) }}
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
