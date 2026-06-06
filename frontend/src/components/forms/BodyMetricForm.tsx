import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import type { BodyMetricCreate } from '../../types/health'
import { kgToLb } from '../../utils/unitConversion'

interface Props {
  onSubmit: (data: BodyMetricCreate) => Promise<void>
  defaultValues?: Partial<BodyMetricCreate>
  loading?: boolean
  weightUnit?: 'kg' | 'lb'
}

export default function BodyMetricForm({ onSubmit, defaultValues, loading, weightUnit }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BodyMetricCreate>({
    defaultValues: {
      measured_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      ...defaultValues,
    },
  })

  const watchedWeight = watch('weight_kg')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Measured At</label>
        <input
          type="datetime-local"
          className="input"
          {...register('measured_at', { required: 'Required' })}
        />
        {errors.measured_at && <p className="text-red-500 text-xs mt-1">{errors.measured_at.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            min="1"
            className="input"
            placeholder="e.g. 72.5"
            {...register('weight_kg', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Must be positive' } })}
          />
          {errors.weight_kg && <p className="text-red-500 text-xs mt-1">{errors.weight_kg.message}</p>}
          {weightUnit === 'lb' && watchedWeight > 0 && (
            <p className="text-xs text-gray-400 mt-1">= {kgToLb(watchedWeight)} lb</p>
          )}
        </div>
        <div>
          <label className="label">Height (cm) <span className="text-gray-400 font-normal">optional</span></label>
          <input
            type="number"
            step="0.1"
            min="1"
            className="input"
            placeholder="e.g. 170"
            {...register('height_cm', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div>
        <label className="label">Notes <span className="text-gray-400 font-normal">optional</span></label>
        <textarea className="input" rows={2} placeholder="Any context…" {...register('notes')} />
      </div>

      <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
        {loading ? 'Saving…' : 'Save Entry'}
      </button>
    </form>
  )
}
