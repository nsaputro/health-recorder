import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import type { VitalSignCreate } from '../../types/health'

interface Props {
  onSubmit: (data: VitalSignCreate) => Promise<void>
  defaultValues?: Partial<VitalSignCreate>
  loading?: boolean
}

export default function VitalSignForm({ onSubmit, defaultValues, loading }: Props) {
  const { register, handleSubmit } = useForm<VitalSignCreate>({
    defaultValues: {
      measured_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      ...defaultValues,
    },
  })

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
        <label className="label">Blood Pressure</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="number"
              min="60" max="250"
              className="input"
              placeholder="Systolic (mmHg)"
              {...register('systolic_bp', { valueAsNumber: true })}
            />
          </div>
          <div>
            <input
              type="number"
              min="40" max="150"
              className="input"
              placeholder="Diastolic (mmHg)"
              {...register('diastolic_bp', { valueAsNumber: true })}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Normal: ≤ 120/80 mmHg</p>
      </div>

      <div>
        <label className="label">Heart Rate <span className="text-gray-400 font-normal">optional</span></label>
        <input
          type="number"
          min="30" max="250"
          className="input"
          placeholder="bpm (e.g. 72)"
          {...register('heart_rate', { valueAsNumber: true })}
        />
        <p className="text-xs text-gray-400 mt-1">Normal resting: 60–100 bpm</p>
      </div>

      <div>
        <label className="label">Notes <span className="text-gray-400 font-normal">optional</span></label>
        <textarea className="input" rows={2} placeholder="Resting? After exercise? Arm used?" {...register('notes')} />
      </div>

      <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
        {loading ? 'Saving…' : 'Save Reading'}
      </button>
    </form>
  )
}
