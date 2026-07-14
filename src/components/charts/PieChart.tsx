interface PieChartItem {
  label: string
  value: number
  color: string
}

interface PieChartProps {
  data: PieChartItem[]
  title?: string
  size?: number
}

export function PieChart({ data, title, size = 120 }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return null

  // Calculate SVG donut segments
  const radius = 40
  const circumference = 2 * Math.PI * radius
  let cumulativeOffset = 0

  const segments = data.map((item) => {
    const percentage = item.value / total
    const dashLength = percentage * circumference
    const dashOffset = -cumulativeOffset * circumference
    cumulativeOffset += percentage
    return { ...item, percentage, dashLength, dashOffset }
  })

  return (
    <div>
      {title && <h4 className="text-sm font-medium mb-3">{title}</h4>}
      <div className="flex items-center gap-6">
        <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
              strokeDashoffset={seg.dashOffset}
              transform="rotate(-90 50 50)"
            />
          ))}
          <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold" fill="var(--color-text)">
            {total}
          </text>
        </svg>
        <div className="space-y-1.5">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-[var(--color-text-muted)]">{seg.label}</span>
              <span className="text-xs font-medium">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
