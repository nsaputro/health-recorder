export const TIME_RANGES = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: 'All', months: 0 },
] as const

export type RangeLabel = typeof TIME_RANGES[number]['label']

/** Returns an ISO string `months` ago, or undefined for "All". */
export function sinceFromRange(months: number): string | undefined {
  if (!months) return undefined
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString()
}

interface Props {
  value: RangeLabel
  onChange: (label: RangeLabel, months: number) => void
}

export default function TimeRangeFilter({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {TIME_RANGES.map((r) => (
        <button
          key={r.label}
          onClick={() => onChange(r.label, r.months)}
          className={`px-3 py-1 text-xs rounded-full border transition-colors font-medium ${
            value === r.label
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-500'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
