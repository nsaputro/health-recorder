import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { VitalSign } from '../../types/health'

interface Props {
  data: VitalSign[]
}

export default function VitalSignChart({ data }: Props) {
  const sorted = [...data].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  )
  const chartData = sorted
    .filter((d) => d.systolic_bp != null || d.diastolic_bp != null)
    .map((d) => ({
      date: format(parseISO(d.measured_at), 'MMM d'),
      systolic:  d.systolic_bp,
      diastolic: d.diastolic_bp,
    }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[40, 180]} tick={{ fontSize: 11 }} unit=" mmHg" />
        <Tooltip formatter={(v: number, name: string) => [`${v} mmHg`, name]} />
        <Legend />
        <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="3 3"
          label={{ value: '120', fontSize: 9, fill: '#22c55e' }} />
        <ReferenceLine y={80}  stroke="#22c55e" strokeDasharray="3 3"
          label={{ value: '80',  fontSize: 9, fill: '#22c55e' }} />
        <Line type="monotone" dataKey="systolic"  name="Systolic"
          stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="diastolic" name="Diastolic"
          stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
