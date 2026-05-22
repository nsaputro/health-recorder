import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { LabResult, LabReferenceRange } from '../../types/health'

interface Props {
  data: LabResult[]
  referenceRange?: LabReferenceRange
  color?: string
}

export default function LabResultChart({ data, referenceRange, color = '#3b82f6' }: Props) {
  const sorted = [...data].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  )
  const chartData = sorted.map((d) => ({
    date: format(parseISO(d.measured_at), 'MMM d, yy'),
    value: d.value,
  }))

  const unit = referenceRange?.unit ?? data[0]?.unit ?? ''

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 10 }}
          unit={` ${unit}`}
        />
        <Tooltip formatter={(v: number) => [`${v} ${unit}`, 'Value']} />
        <Legend />

        {/* Reference lines */}
        {referenceRange?.normal_max && referenceRange.normal_max < 999 && (
          <ReferenceLine
            y={referenceRange.normal_max}
            stroke="#22c55e"
            strokeDasharray="3 3"
            label={{ value: `Normal max: ${referenceRange.normal_max}`, fontSize: 9, fill: '#22c55e', position: 'right' }}
          />
        )}
        {referenceRange?.borderline_max && referenceRange.borderline_max < 999 && (
          <ReferenceLine
            y={referenceRange.borderline_max}
            stroke="#f59e0b"
            strokeDasharray="3 3"
            label={{ value: `Borderline: ${referenceRange.borderline_max}`, fontSize: 9, fill: '#f59e0b', position: 'right' }}
          />
        )}
        {referenceRange?.low && referenceRange.low > 0 && (
          <ReferenceLine
            y={referenceRange.low}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ value: `Low: ${referenceRange.low}`, fontSize: 9, fill: '#ef4444', position: 'right' }}
          />
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
