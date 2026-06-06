import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { labResults as labApi, userPrefs } from '../../api/client'
import type { LabResultCreate, LabReferenceRange } from '../../types/health'

const UNIT_OPTIONS: Record<string, string[]> = {
  cholesterol_total: ['mg/dL', 'mmol/L'],
  cholesterol_ldl:   ['mg/dL', 'mmol/L'],
  cholesterol_hdl:   ['mg/dL', 'mmol/L'],
  triglycerides:     ['mg/dL', 'mmol/L'],
  glucose_fasting:   ['mg/dL', 'mmol/L'],
  glucose_random:    ['mg/dL', 'mmol/L'],
  uric_acid:         ['mg/dL', 'mmol/L'],
  glucose_hba1c:     ['%', 'mmol/mol'],
  creatinine:        ['mg/dL', 'µmol/L'],
  hemoglobin:        ['g/dL', 'g/L'],
  other:             ['units'],
}

interface Props {
  onSubmit: (data: LabResultCreate) => Promise<void>
  defaultValues?: Partial<LabResultCreate>
  loading?: boolean
  labUnit?: 'mg_dl' | 'mmol'
}

function hintText(r: LabReferenceRange, currentUnit?: string): string {
  if (r.test_type === 'glucose_hba1c' && currentUnit === 'mmol/mol') {
    const toMmolMol = (v: number) => Math.round((v - 2.152) / 0.09148)
    const lo = r.low != null ? `${toMmolMol(r.low)}–` : ''
    const hi = r.normal_max != null && r.normal_max < 900 ? `${toMmolMol(r.normal_max)}` : ''
    const bor = r.borderline_max != null && r.borderline_max < 900 ? ` · Border: ≤ ${toMmolMol(r.borderline_max)}` : ''
    return `Normal: ${lo}${hi} mmol/mol${bor}`
  }
  if (r.higher_better) return `Good: ≥ ${r.low} ${r.unit}`
  const lo = r.low != null ? `${r.low}–` : ''
  const hi = r.normal_max != null && r.normal_max < 900 ? `${r.normal_max}` : ''
  const bor = r.borderline_max != null && r.borderline_max < 900 ? ` · Border: ≤ ${r.borderline_max}` : ''
  return `Normal: ${lo}${hi} ${r.unit}${bor}`
}

export default function LabResultForm({ onSubmit, defaultValues, loading, labUnit }: Props) {
  const { data: prefs } = useQuery({ queryKey: ['user-prefs'], queryFn: userPrefs.get, retry: false })
  const gender = prefs?.gender !== 'unset' ? prefs?.gender : undefined
  const effectiveLabUnit = labUnit ?? prefs?.lab_unit ?? 'mg_dl'

  const { data: labTypes = [] } = useQuery({
    queryKey: ['lab-types', gender],
    queryFn: () => labApi.types(gender),
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<LabResultCreate>({
    defaultValues: {
      measured_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      test_type: 'cholesterol_total',
      ...defaultValues,
    },
  })

  const selectedType = watch('test_type')
  const selectedUnit = watch('unit')
  const typeInfo = labTypes.find((t) => t.test_type === selectedType)
  const unitOptions = UNIT_OPTIONS[selectedType] ?? ['units']

  // Pre-select preferred unit whenever the test type changes
  useEffect(() => {
    let preferred: string
    if (selectedType === 'glucose_hba1c') {
      preferred = effectiveLabUnit === 'mmol' ? 'mmol/mol' : '%'
    } else {
      preferred = effectiveLabUnit === 'mmol' ? 'mmol/L' : 'mg/dL'
    }
    const best = unitOptions.includes(preferred) ? preferred : unitOptions[0]
    setValue('unit', best)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, effectiveLabUnit])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Measured At</label>
        <input
          type="datetime-local"
          className="input"
          {...register('measured_at', { required: 'Required' })}
        />
      </div>

      <div>
        <label className="label">Test Type</label>
        <select className="input" {...register('test_type', { required: 'Required' })}>
          {labTypes.map((t) => (
            <option key={t.test_type} value={t.test_type}>
              {t.display_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">
            Value {typeInfo && <span className="text-gray-400 font-normal">({typeInfo.unit})</span>}
          </label>
          <input
            type="number"
            step="0.01"
            className="input"
            placeholder="e.g. 180"
            {...register('value', { required: 'Required', valueAsNumber: true })}
          />
          {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value.message}</p>}
          {typeInfo && (
            <p className="text-xs text-gray-400 mt-1">{hintText(typeInfo, selectedUnit)}</p>
          )}
        </div>
        <div>
          <label className="label">Unit</label>
          <select className="input" {...register('unit')}>
            {unitOptions.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Lab Name <span className="text-gray-400 font-normal">optional</span></label>
        <input className="input" placeholder="e.g. City Lab" {...register('lab_name')} />
      </div>

      <div>
        <label className="label">Notes <span className="text-gray-400 font-normal">optional</span></label>
        <textarea className="input" rows={2} placeholder="Fasting? Medication? Context…" {...register('notes')} />
      </div>

      <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
        {loading ? 'Saving…' : 'Save Result'}
      </button>
    </form>
  )
}
