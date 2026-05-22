import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { BodyMetric } from '../../types/health'

interface Props {
  data: BodyMetric[]
  showBmi?: boolean
}

export default function WeightChart({ data, showBmi }: Props) {
  const sorted = [...data].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  )
  const chartData = sorted.map((d) => ({
    date: format(parseISO(d.measured_at), 'MMM d'),
    weight: d.weight_kg,
    bmi: d.bmi,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="weight"
          domain={['auto', 'auto']}
          tick={{ fontSize: 11 }}
          label={{ value: 'kg', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
        />
        {showBmi && (
          <YAxis
            yAxisId="bmi"
            orientation="right"
            domain={[15, 35]}
            tick={{ fontSize: 11 }}
            label={{ value: 'BMI', angle: 90, position: 'insideRight', offset: 10, fontSize: 11 }}
          />
        )}
        <Tooltip
          formatter={(value: number, name: string) =>
            name === 'weight' ? [`${value} kg`, 'Weight'] : [`${value}`, 'BMI']
          }
        />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        {showBmi && (
          <Line
            yAxisId="bmi"
            type="monotone"
            dataKey="bmi"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 3 }}
            strokeDasharray="4 4"
          />
        )}
        {/* BMI healthy range reference lines */}
        {showBmi && <ReferenceLine yAxisId="bmi" y={18.5} stroke="#22c55e" strokeDasharray="2 2" label={{ value: '18.5', fontSize: 9, fill: '#22c55e' }} />}
        {showBmi && <ReferenceLine yAxisId="bmi" y={25}   stroke="#f59e0b" strokeDasharray="2 2" label={{ value: '25',   fontSize: 9, fill: '#f59e0b' }} />}
        {showBmi && <ReferenceLine yAxisId="bmi" y={30}   stroke="#ef4444" strokeDasharray="2 2" label={{ value: '30',   fontSize: 9, fill: '#ef4444' }} />}
      </LineChart>
    </ResponsiveContainer>
  )
}
