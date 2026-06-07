import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bodyMetrics, labResults, vitalSigns, syncAll, googleAuth } from '../api/client'
import WeightChart from '../components/charts/WeightChart'
import LabResultChart from '../components/charts/LabResultChart'
import { format, parseISO } from 'date-fns'
import type { LabReferenceRange } from '../types/health'

const LAB_COLORS: Record<string, string> = {
  cholesterol_total: '#6366f1',
  cholesterol_ldl:   '#ef4444',
  cholesterol_hdl:   '#22c55e',
  triglycerides:     '#f59e0b',
  glucose_fasting:   '#3b82f6',
  uric_acid:         '#8b5cf6',
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()

  const { data: weights = [] } = useQuery({ queryKey: ['body-metrics'], queryFn: () => bodyMetrics.list({ limit: 30 }) })
  const { data: labs = [] }    = useQuery({ queryKey: ['lab-results'],  queryFn: () => labResults.list({ limit: 200 }) })
  const { data: vitals = [] }  = useQuery({ queryKey: ['vital-signs'],  queryFn: () => vitalSigns.list({ limit: 500 }) })
  const { data: labTypes = [] }= useQuery({ queryKey: ['lab-types'],    queryFn: () => labResults.types() })
  const { data: gCred }        = useQuery({ queryKey: ['google-status'], queryFn: googleAuth.status, retry: false })

  const syncMutation = useMutation({
    mutationFn: syncAll,
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })

  const latestWeight = weights[0]
  const latestBP = vitals.find((v) => v.systolic_bp != null && v.diastolic_bp != null)
  const latestHR = vitals.find((v) => v.heart_rate != null)

  const labTypeMap = Object.fromEntries(labTypes.map((t: LabReferenceRange) => [t.test_type, t]))

  // Group labs by test type for the overview charts
  const labByType = labs.reduce<Record<string, typeof labs>>((acc, r) => {
    acc[r.test_type] = acc[r.test_type] ?? []
    acc[r.test_type].push(r)
    return acc
  }, {})

  const featuredLabTypes = ['cholesterol_total', 'cholesterol_ldl', 'glucose_fasting', 'uric_acid']

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Health Dashboard</h1>
        {gCred && (
          <button
            className="btn-primary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              '⏳ Syncing…'
            ) : (
              <>↑ Sync All to Google</>
            )}
          </button>
        )}
      </div>

      {syncMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">
          ✅ Sync complete — Fit: {JSON.stringify(syncMutation.data?.google_fit)}, Sheets: {JSON.stringify(syncMutation.data?.google_sheets)}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Latest Weight"
          value={latestWeight ? `${latestWeight.weight_kg} kg` : '—'}
          sub={latestWeight ? format(parseISO(latestWeight.measured_at), 'MMM d, yyyy') : undefined}
        />
        <StatCard
          label="BMI"
          value={latestWeight?.bmi ?? '—'}
          sub={
            latestWeight?.bmi
              ? latestWeight.bmi < 18.5 ? 'Underweight'
                : latestWeight.bmi < 25 ? 'Normal'
                : latestWeight.bmi < 30 ? 'Overweight'
                : 'Obese'
              : undefined
          }
        />
        <StatCard
          label="Blood Pressure"
          value={latestBP ? `${latestBP.systolic_bp}/${latestBP.diastolic_bp}` : '—'}
          sub={latestBP ? `mmHg · ${format(parseISO(latestBP.measured_at), 'MMM d, yyyy')}` : 'mmHg'}
        />
        <StatCard
          label="Heart Rate"
          value={latestHR ? `${latestHR.heart_rate} bpm` : '—'}
          sub={latestHR ? format(parseISO(latestHR.measured_at), 'MMM d, yyyy') : undefined}
        />
      </div>

      {/* Weight chart */}
      {weights.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold mb-4">Weight Over Time</h2>
          <WeightChart data={weights} showBmi />
        </div>
      )}

      {/* Lab result mini-charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {featuredLabTypes.map((type) => {
          const typeData = labByType[type]
          if (!typeData || typeData.length === 0) return null
          const typeInfo = labTypeMap[type]
          return (
            <div key={type} className="card">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">
                {typeInfo?.display_name ?? type}
              </h3>
              <LabResultChart
                data={typeData}
                referenceRange={typeInfo}
                color={LAB_COLORS[type] ?? '#3b82f6'}
              />
            </div>
          )
        })}
      </div>

      {/* Recent entries */}
      <div className="card">
        <h2 className="text-base font-semibold mb-4">Recent Lab Results</h2>
        {labs.length === 0 ? (
          <p className="text-gray-400 text-sm">No lab results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Test</th>
                  <th className="pb-2 pr-4">Result</th>
                  <th className="pb-2">Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {labs.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 text-gray-600">{format(parseISO(r.measured_at), 'MMM d, yyyy')}</td>
                    <td className="py-2 pr-4 font-medium">{labTypeMap[r.test_type]?.display_name ?? r.test_type}</td>
                    <td className="py-2 pr-4">{r.value} {r.unit}</td>
                    <td className="py-2">
                      {r.synced_to_sheets
                        ? <span className="badge-success">Sheets ✓</span>
                        : <span className="badge-gray">Unsynced</span>}
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
