import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { VitalSign } from '../../types/health'

interface Props {
  data: VitalSign[]
}

export default function HeartRateChart({ data }: Props) {
  const withHR = data.filter((d) => d.heart_rate != null)
  if (withHR.length < 2) return null

  const sorted = [...withHR].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  )
  const chartData = sorted.map((d) => ({
    date: format(parseISO(d.measured_at), 'MMM d'),
    hr: d.heart_rate,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" bpm" />
        <Tooltip formatter={(v: number) => [`${v} bpm`, 'Heart Rate']} />
        <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3"
          label={{ value: 'Tachy 100', fontSize: 9, fill: '#f59e0b' }} />
        <ReferenceLine y={60}  stroke="#f59e0b" strokeDasharray="3 3"
          label={{ value: 'Brady 60',  fontSize: 9, fill: '#f59e0b' }} />
        <Line type="monotone" dataKey="hr" name="Heart Rate"
          stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
