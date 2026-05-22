import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { bodyMetrics as api } from '../api/client'
import BodyMetricForm from '../components/forms/BodyMetricForm'
import WeightChart from '../components/charts/WeightChart'
import type { BodyMetricCreate } from '../types/health'

export default function BodyMetricsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['body-metrics'],
    queryFn: () => api.list({ limit: 100 }),
  })

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
          <BodyMetricForm onSubmit={handleCreate} loading={createMutation.isPending} />
          {createMutation.isError && (
            <p className="text-red-500 text-sm mt-2">Error saving entry.</p>
          )}
        </div>
      )}

      {records.length > 1 && (
        <div className="card">
          <h2 className="text-base font-semibold mb-4">Trend</h2>
          <WeightChart data={records} showBmi />
        </div>
      )}

      <div className="card">
        <h2 className="text-base font-semibold mb-4">All Entries ({records.length})</h2>
        {isLoading ? (
          <p className="text-gray-400">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-gray-400">No entries yet. Add your first weight reading above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Weight</th>
                  <th className="pb-2 pr-4">Height</th>
                  <th className="pb-2 pr-4">BMI</th>
                  <th className="pb-2 pr-4">Sync</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-600">
                      {format(parseISO(r.measured_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="py-2 pr-4 font-semibold">{r.weight_kg} kg</td>
                    <td className="py-2 pr-4 text-gray-600">{r.height_cm ? `${r.height_cm} cm` : '—'}</td>
                    <td className="py-2 pr-4">
                      {r.bmi ? (
                        <span className="flex items-center gap-1">
                          {r.bmi} {bmiLabel(r.bmi)}
                        </span>
                      ) : '—'}
                    </td>
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
                        >
                          Sync
                        </button>
                        <button
                          className="text-red-500 hover:underline text-xs"
                          onClick={() => {
                            if (confirm('Delete this entry?')) deleteMutation.mutate(r.id)
                          }}
                        >
                          Delete
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
