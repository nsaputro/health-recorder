interface Props {
  /** Values in chronological order (oldest → newest). */
  values: number[]
  unit: string
  decimals?: number
}

export default function TrendSummary({ values, unit, decimals = 1 }: Props) {
  const valid = values.filter((v) => v != null && !isNaN(v))
  if (valid.length === 0) return null

  const fmt = (n: number) => n.toFixed(decimals)
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length
  const latest = valid[valid.length - 1]  // last = most recent (sorted asc)

  const cells = [
    { label: 'Latest', value: fmt(latest) },
    { label: 'Avg',    value: fmt(avg) },
    { label: 'Min',    value: fmt(Math.min(...valid)) },
    { label: 'Max',    value: fmt(Math.max(...valid)) },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 mt-4">
      {cells.map((c) => (
        <div key={c.label} className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-base font-semibold text-gray-800">{c.value}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-tight">
            {c.label}<br /><span className="text-gray-400">{unit}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
