import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { labResults as labApi, userPrefs } from '../api/client'
import type { LabReferenceRange, LabResult } from '../types/health'
import { convertRangeToMmol, labConvertedHint, normalizeForBadge } from '../utils/unitConversion'

const CATEGORIES: { label: string; types: string[] }[] = [
  { label: 'Lipids',    types: ['cholesterol_total', 'cholesterol_ldl', 'cholesterol_hdl', 'triglycerides'] },
  { label: 'Glucose',   types: ['glucose_fasting', 'glucose_random', 'glucose_hba1c'] },
  { label: 'Kidney',    types: ['creatinine', 'uric_acid'] },
  { label: 'Blood',     types: ['hemoglobin'] },
  { label: 'Liver',     types: ['alt', 'alp'] },
]

const LAB_ALT_NAMES: Record<string, string> = {
  glucose_fasting:   'FBS · FPG',
  glucose_random:    'RBS',
  glucose_hba1c:     'A1C · Glycated Hemoglobin',
  cholesterol_ldl:   'Bad Cholesterol',
  cholesterol_hdl:   'Good Cholesterol',
  creatinine:        'SCr',
  hemoglobin:        'Hb · Hgb',
  alt:               'SGPT',
  alp:               'Alk Phos',
}

const LAB_DESCRIPTIONS: Record<string, string> = {
  cholesterol_total: 'Total cholesterol in the blood. High levels increase risk of heart disease and stroke.',
  cholesterol_ldl:   "'Bad' cholesterol that builds up in artery walls. Lower levels reduce cardiovascular risk.",
  cholesterol_hdl:   "'Good' cholesterol that removes other cholesterol from the bloodstream. Higher is better.",
  triglycerides:     'Fat in the blood stored from unused calories. High levels are linked to heart disease.',
  glucose_fasting:   'Blood sugar after an 8-hour fast. Key test for screening diabetes and prediabetes.',
  glucose_random:    'Blood sugar at any time regardless of meals. Used for quick diabetes assessment.',
  glucose_hba1c:     'Reflects average blood glucose over 2–3 months. A standard diabetes management marker.',
  uric_acid:         'Waste product from purine metabolism. Elevated levels can cause gout and kidney stones.',
  creatinine:        'Waste product filtered by the kidneys. Elevated levels indicate reduced kidney function.',
  hemoglobin:        'Protein in red blood cells that carries oxygen. Low levels indicate anemia.',
  alt:               'Liver enzyme released when liver cells are damaged. Elevated levels may indicate hepatitis, fatty liver, or other liver disease.',
  alp:               'Enzyme found in the liver and bone. Elevated levels can signal liver disease, bile duct obstruction, or bone disorders.',
}

function refRangeText(r: LabReferenceRange): string {
  if (r.higher_better) return `≥ ${r.low} ${r.unit} (higher is better)`
  const hi = r.normal_max != null && r.normal_max < 900 ? `${r.normal_max}` : ''
  const lo = r.low != null && r.low > 0 ? `${r.low}–` : (hi ? '< ' : '')
  const bor = r.borderline_max != null && r.borderline_max < 900 ? ` · border ≤ ${r.borderline_max}` : ''
  return `${lo}${hi} ${r.unit}${bor}`
}

function StatusBadge({ value, unit, range: r }: { value: number; unit: string; range: LabReferenceRange }) {
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

export default function ReferenceRangesPage() {
  const { data: prefs } = useQuery({ queryKey: ['user-prefs'], queryFn: userPrefs.get, retry: false })
  const gender = prefs?.gender !== 'unset' ? prefs?.gender : undefined

  const { data: labTypes = [], isLoading } = useQuery({
    queryKey: ['lab-types', gender],
    queryFn: () => labApi.types(gender),
  })

  const { data: allResults = [] } = useQuery({
    queryKey: ['lab-results-all'],
    queryFn: () => labApi.list({ limit: 500 }),
  })

  const wantsMmol = prefs?.lab_unit === 'mmol'
  const resolvedTypes = wantsMmol
    ? labTypes.map((t) => convertRangeToMmol(t, t.test_type))
    : labTypes
  const typeMap = Object.fromEntries(resolvedTypes.map((t) => [t.test_type, t]))

  // Latest result per test type
  const latestByType = allResults.reduce<Record<string, LabResult>>((acc, r) => {
    const prev = acc[r.test_type]
    if (!prev || new Date(r.measured_at) > new Date(prev.measured_at)) acc[r.test_type] = r
    return acc
  }, {})

  const genderLabel = gender ? ` (${gender} ranges)` : ' (universal ranges)'

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">Reference Ranges</h1>
        <span className="text-sm text-gray-500">{genderLabel}</span>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        CATEGORIES.map(({ label, types }) => {
          const rows = types.map((t) => typeMap[t]).filter(Boolean)
          if (!rows.length) return null
          return (
            <div key={label} className="card">
              <h2 className="text-base font-semibold mb-3">{label}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                      <th className="pb-2 pr-6">Test</th>
                      <th className="pb-2 pr-6">Normal Range</th>
                      <th className="pb-2 pr-6">Your Latest</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r) => {
                      const latest = latestByType[r.test_type]
                      return (
                        <tr key={r.test_type} className="hover:bg-gray-50">
                          <td className="py-2.5 pr-6">
                            <div className="font-medium">{r.display_name}</div>
                            {LAB_ALT_NAMES[r.test_type] && (
                              <div className="text-xs text-gray-400">{LAB_ALT_NAMES[r.test_type]}</div>
                            )}
                            {LAB_DESCRIPTIONS[r.test_type] && (
                              <div className="relative inline-block group mt-0.5">
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-blue-500 focus:text-blue-500 focus:outline-none text-sm leading-none"
                                  aria-label={`About ${r.display_name}`}
                                >
                                  ⓘ
                                </button>
                                <div className="invisible group-hover:visible group-focus-within:visible absolute left-0 top-5 z-50 w-64 p-3 rounded-lg bg-white border border-gray-200 shadow-lg text-xs text-gray-600 font-normal whitespace-normal">
                                  {LAB_DESCRIPTIONS[r.test_type]}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 pr-6 text-gray-600">{refRangeText(r)}</td>
                          <td className="py-2.5 pr-6">
                            {latest ? (
                              <div>
                                <span className="font-semibold">
                                  {latest.value} {latest.unit}
                                  {prefs?.lab_unit && (() => {
                                    const hint = labConvertedHint(latest.test_type, latest.value, latest.unit, prefs.lab_unit)
                                    return hint ? <span className="text-gray-400 font-normal ml-1 text-xs">{hint}</span> : null
                                  })()}
                                </span>
                                <div className="text-xs text-gray-400 mt-0.5">{format(parseISO(latest.measured_at), 'MMM d, yyyy')}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5">
                            {latest ? <StatusBadge value={latest.value} unit={latest.unit} range={typeMap[r.test_type]} /> : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}

      <p className="text-xs text-gray-400">
        Set your biological sex in <a href="/settings" className="text-blue-600 hover:underline">Settings</a> to see gender-adjusted ranges for hemoglobin, creatinine, uric acid, and HDL cholesterol.
      </p>
    </div>
  )
}
