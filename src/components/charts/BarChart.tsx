interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartItem[]
  title?: string
  unit?: string
  maxValue?: number
}

export function BarChart({ data, title, unit = '', maxValue }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1)

  return (
    <div>
      {title && <h4 className="text-sm font-medium mb-3">{title}</h4>}
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-muted)] w-16 text-right truncate" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((item.value / max) * 100, 2)}%`,
                  backgroundColor: item.color ?? 'var(--color-primary)',
                }}
              />
            </div>
            <span className="text-xs font-medium w-12 text-right">
              {item.value}{unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
