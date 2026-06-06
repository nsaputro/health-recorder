import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { labResults as labApi, userPrefs } from '../../api/client'
import type { LabResultCreate, LabReferenceRange } from '../../types/health'

interface Props {
  onSubmit: (data: LabResultCreate) => Promise<void>
  defaultValues?: Partial<LabResultCreate>
  loading?: boolean
}

function hintText(r: LabReferenceRange): string {
  if (r.higher_better) return `Good: ≥ ${r.low} ${r.unit}`
  const lo = r.low != null ? `${r.low}–` : ''
  const hi = r.normal_max != null && r.normal_max < 900 ? `${r.normal_max}` : ''
  const bor = r.borderline_max != null && r.borderline_max < 900 ? ` · Border: ≤ ${r.borderline_max}` : ''
  return `Normal: ${lo}${hi} ${r.unit}${bor}`
}

export default function LabResultForm({ onSubmit, defaultValues, loading }: Props) {
  const { data: prefs } = useQuery({ queryKey: ['user-prefs'], queryFn: userPrefs.get, retry: false })
  const gender = prefs?.gender !== 'unset' ? prefs?.gender : undefined

  const { data: labTypes = [] } = useQuery({
    queryKey: ['lab-types', gender],
    queryFn: () => labApi.types(gender),
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LabResultCreate>({
    defaultValues: {
      measured_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      test_type: 'cholesterol_total',
      ...defaultValues,
    },
  })

  const selectedType = watch('test_type')
  const typeInfo = labTypes.find((t) => t.test_type === selectedType)

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
            <p className="text-xs text-gray-400 mt-1">{hintText(typeInfo)}</p>
          )}
        </div>
        <div>
          <label className="label">Unit</label>
          <input
            className="input"
            placeholder={typeInfo?.unit ?? 'mg/dL'}
            {...register('unit')}
          />
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
