import { useState, useMemo } from 'react'

type ReportType = 'attendance' | 'payroll' | 'ot' | 'site' | 'worker' | 'monthly_summary'

interface ReportConfig {
  type: ReportType
  label: string
  icon: string
  description: string
}

const REPORT_TYPES: ReportConfig[] = [
  { type: 'attendance', label: 'Attendance', icon: '📋', description: 'Daily attendance records by site and worker' },
  { type: 'payroll', label: 'Payroll', icon: '💰', description: 'Payroll summaries and cost breakdowns' },
  { type: 'ot', label: 'Overtime', icon: '⏰', description: 'OT hours, consents, and cost analysis' },
  { type: 'site', label: 'Site', icon: '🏗️', description: 'Site-level workforce and productivity data' },
  { type: 'worker', label: 'Worker', icon: '👷', description: 'Individual worker performance and history' },
  { type: 'monthly_summary', label: 'Monthly Summary', icon: '📊', description: 'Comprehensive monthly overview' },
]

// Mock report data
const MOCK_ATTENDANCE_DATA = [
  { date: '2024-03-01', worker: 'Ali bin Hassan', site: 'Marina Bay Tower', status: 'present', hours: 8, ot: 2 },
  { date: '2024-03-01', worker: 'Kumar Rajan', site: 'Marina Bay Tower', status: 'present', hours: 8, ot: 0 },
  { date: '2024-03-01', worker: 'Chen Wei Ming', site: 'Jurong West HDB', status: 'present', hours: 8, ot: 1.5 },
  { date: '2024-03-02', worker: 'Ali bin Hassan', site: 'Marina Bay Tower', status: 'present', hours: 8, ot: 0 },
  { date: '2024-03-02', worker: 'Kumar Rajan', site: 'Marina Bay Tower', status: 'mc', hours: 0, ot: 0 },
  { date: '2024-03-02', worker: 'Chen Wei Ming', site: 'Jurong West HDB', status: 'present', hours: 8, ot: 2 },
  { date: '2024-03-03', worker: 'Ali bin Hassan', site: 'Marina Bay Tower', status: 'rest_day', hours: 0, ot: 0 },
  { date: '2024-03-03', worker: 'Kumar Rajan', site: 'Marina Bay Tower', status: 'rest_day', hours: 0, ot: 0 },
  { date: '2024-03-03', worker: 'Chen Wei Ming', site: 'Jurong West HDB', status: 'rest_day', hours: 0, ot: 0 },
]

const MOCK_PAYROLL_DATA = [
  { worker: 'Ali bin Hassan', basicPay: 2400, otPay: 450, allowance: 200, deductions: 50, netPay: 3000 },
  { worker: 'Kumar Rajan', basicPay: 2200, otPay: 0, allowance: 200, deductions: 50, netPay: 2350 },
  { worker: 'Chen Wei Ming', basicPay: 2600, otPay: 675, allowance: 200, deductions: 100, netPay: 3375 },
  { worker: 'Muthu Selvam', basicPay: 2000, otPay: 300, allowance: 200, deductions: 50, netPay: 2450 },
  { worker: 'Bao Tran', basicPay: 2200, otPay: 225, allowance: 200, deductions: 50, netPay: 2575 },
]

const MOCK_OT_DATA = [
  { worker: 'Ali bin Hassan', date: '2024-03-01', hours: 2, type: 'Weekday OT', rate: 1.5, cost: 45 },
  { worker: 'Chen Wei Ming', date: '2024-03-01', hours: 1.5, type: 'Weekday OT', rate: 1.5, cost: 33.75 },
  { worker: 'Chen Wei Ming', date: '2024-03-02', hours: 2, type: 'Weekday OT', rate: 1.5, cost: 45 },
  { worker: 'Ali bin Hassan', date: '2024-03-05', hours: 3, type: 'Weekday OT', rate: 1.5, cost: 67.50 },
  { worker: 'Muthu Selvam', date: '2024-03-06', hours: 2, type: 'Weekday OT', rate: 1.5, cost: 45 },
]

const MOCK_SITES = [
  { value: '', label: 'All Sites' },
  { value: 'Marina Bay Tower', label: 'Marina Bay Tower' },
  { value: 'Jurong West HDB', label: 'Jurong West HDB' },
  { value: 'Changi Terminal 5', label: 'Changi Terminal 5' },
]

const MOCK_WORKERS = [
  { value: '', label: 'All Workers' },
  { value: 'Ali bin Hassan', label: 'Ali bin Hassan' },
  { value: 'Kumar Rajan', label: 'Kumar Rajan' },
  { value: 'Chen Wei Ming', label: 'Chen Wei Ming' },
  { value: 'Muthu Selvam', label: 'Muthu Selvam' },
  { value: 'Bao Tran', label: 'Bao Tran' },
]

export function OfficeReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('attendance')
  const [dateFrom, setDateFrom] = useState('2024-03-01')
  const [dateTo, setDateTo] = useState('2024-03-31')
  const [siteFilter, setSiteFilter] = useState('')
  const [workerFilter, setWorkerFilter] = useState('')

  // Filter data based on selections
  const filteredData = useMemo(() => {
    if (selectedReport === 'attendance') {
      return MOCK_ATTENDANCE_DATA.filter((row) => {
        if (siteFilter && row.site !== siteFilter) return false
        if (workerFilter && row.worker !== workerFilter) return false
        return true
      })
    }
    if (selectedReport === 'payroll') {
      return MOCK_PAYROLL_DATA.filter((row) => {
        if (workerFilter && row.worker !== workerFilter) return false
        return true
      })
    }
    if (selectedReport === 'ot') {
      return MOCK_OT_DATA.filter((row) => {
        if (workerFilter && row.worker !== workerFilter) return false
        return true
      })
    }
    return []
  }, [selectedReport, siteFilter, workerFilter])

  // Chart data for attendance summary
  const chartData = useMemo(() => {
    if (selectedReport === 'attendance') {
      const statusCounts: Record<string, number> = {}
      MOCK_ATTENDANCE_DATA.forEach((row) => {
        statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
      })
      return Object.entries(statusCounts).map(([status, count]) => ({
        label: status.replace('_', ' '),
        value: count,
        color: status === 'present' ? '#22c55e' : status === 'mc' ? '#ef4444' : '#94a3b8',
      }))
    }
    if (selectedReport === 'payroll') {
      return MOCK_PAYROLL_DATA.map((row) => ({
        label: row.worker.split(' ')[0],
        value: row.netPay,
        color: '#3b82f6',
      }))
    }
    return []
  }, [selectedReport])

  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1)

  function exportCSV() {
    let headers: string[] = []
    let rows: string[][] = []

    if (selectedReport === 'attendance') {
      headers = ['Date', 'Worker', 'Site', 'Status', 'Hours', 'OT Hours']
      rows = (filteredData as typeof MOCK_ATTENDANCE_DATA).map((r) => [
        r.date, r.worker, r.site, r.status, String(r.hours), String(r.ot),
      ])
    } else if (selectedReport === 'payroll') {
      headers = ['Worker', 'Basic Pay', 'OT Pay', 'Allowance', 'Deductions', 'Net Pay']
      rows = (filteredData as typeof MOCK_PAYROLL_DATA).map((r) => [
        r.worker, String(r.basicPay), String(r.otPay), String(r.allowance), String(r.deductions), String(r.netPay),
      ])
    } else if (selectedReport === 'ot') {
      headers = ['Worker', 'Date', 'Hours', 'Type', 'Rate', 'Cost']
      rows = (filteredData as typeof MOCK_OT_DATA).map((r) => [
        r.worker, r.date, String(r.hours), r.type, String(r.rate), String(r.cost),
      ])
    }

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedReport}_report_${dateFrom}_${dateTo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Generate and export reports for your company</p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {REPORT_TYPES.map((report) => (
          <button
            key={report.type}
            onClick={() => setSelectedReport(report.type)}
            className={`p-3 rounded-xl border text-center transition-colors ${
              selectedReport === report.type
                ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-white hover:bg-gray-50'
            }`}
          >
            <span className="text-xl block mb-1">{report.icon}</span>
            <span className="text-xs font-medium">{report.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Site</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
            >
              {MOCK_SITES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Worker</label>
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
            >
              {MOCK_WORKERS.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
            <button
              onClick={exportPDF}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Chart Summary */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold text-sm mb-4">
            {selectedReport === 'attendance' ? 'Attendance Distribution' : 'Net Pay by Worker'}
          </h3>
          <div className="space-y-2">
            {chartData.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-muted)] w-24 text-right capitalize">{item.label}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(item.value / maxChartValue) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium w-16">
                  {selectedReport === 'payroll' ? `$${item.value.toLocaleString()}` : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          {selectedReport === 'attendance' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Worker</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Site</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Hours</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {(filteredData as typeof MOCK_ATTENDANCE_DATA).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 font-medium">{row.worker}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{row.site}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.status === 'present' ? 'bg-green-100 text-green-800' :
                        row.status === 'mc' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.hours}h</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{row.ot > 0 ? `${row.ot}h` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedReport === 'payroll' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Worker</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Basic Pay</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">OT Pay</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Allowance</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Deductions</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {(filteredData as typeof MOCK_PAYROLL_DATA).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.worker}</td>
                    <td className="px-4 py-3 text-right">${row.basicPay.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">${row.otPay.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">${row.allowance}</td>
                    <td className="px-4 py-3 text-right text-red-600">-${row.deductions}</td>
                    <td className="px-4 py-3 text-right font-semibold">${row.netPay.toLocaleString()}</td>
                  </tr>
                ))}
                {(filteredData as typeof MOCK_PAYROLL_DATA).length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">
                      ${(filteredData as typeof MOCK_PAYROLL_DATA).reduce((s, r) => s + r.basicPay, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${(filteredData as typeof MOCK_PAYROLL_DATA).reduce((s, r) => s + r.otPay, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${(filteredData as typeof MOCK_PAYROLL_DATA).reduce((s, r) => s + r.allowance, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      -${(filteredData as typeof MOCK_PAYROLL_DATA).reduce((s, r) => s + r.deductions, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${(filteredData as typeof MOCK_PAYROLL_DATA).reduce((s, r) => s + r.netPay, 0).toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {selectedReport === 'ot' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Worker</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Hours</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Rate</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {(filteredData as typeof MOCK_OT_DATA).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.worker}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{row.date}</td>
                    <td className="px-4 py-3 text-right">{row.hours}h</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{row.type}</td>
                    <td className="px-4 py-3 text-right">{row.rate}x</td>
                    <td className="px-4 py-3 text-right font-medium">${row.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {(selectedReport === 'site' || selectedReport === 'worker' || selectedReport === 'monthly_summary') && (
            <div className="px-4 py-12 text-center text-[var(--color-text-muted)]">
              <p className="text-lg mb-1">{REPORT_TYPES.find((r) => r.type === selectedReport)?.icon}</p>
              <p className="font-medium">{REPORT_TYPES.find((r) => r.type === selectedReport)?.label} Report</p>
              <p className="text-sm mt-1">Select date range and filters, then generate the report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
