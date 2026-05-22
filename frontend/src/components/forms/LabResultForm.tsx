import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { labResults as labApi } from '../../api/client'
import type { LabResultCreate } from '../../types/health'

interface Props {
  onSubmit: (data: LabResultCreate) => Promise<void>
  defaultValues?: Partial<LabResultCreate>
  loading?: boolean
}

export default function LabResultForm({ onSubmit, defaultValues, loading }: Props) {
  const { data: labTypes = [] } = useQuery({
    queryKey: ['lab-types'],
    queryFn: labApi.types,
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
          {typeInfo && (typeInfo.normal_max || typeInfo.low) && (
            <p className="text-xs text-gray-400 mt-1">
              Normal: {typeInfo.low != null ? `${typeInfo.low}–` : '< '}{typeInfo.normal_max} {typeInfo.unit}
            </p>
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
