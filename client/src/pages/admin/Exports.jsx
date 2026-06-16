import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiDownload, FiFileText, FiSearch, FiClock, FiFilter } from 'react-icons/fi'

const EXPORT_HISTORY_KEY = 'raxwo-export-history'

const DATASET_GROUPS = [
  {
    label: 'Finance',
    items: [
      { value: 'financial_overview', label: 'Financial Overview', supportsMonthYear: true, supportsDateRange: true, supportsCategory: true, supportsType: true },
      { value: 'incomes', label: 'Income Records', supportsMonthYear: true, supportsDateRange: true, supportsCategory: true },
      { value: 'expenses', label: 'Expense Records', supportsMonthYear: true, supportsDateRange: true, supportsCategory: true },
      { value: 'revenue_invoices', label: 'Invoices', supportsMonthYear: true, supportsDateRange: true },
      { value: 'quotations', label: 'Quotations', supportsMonthYear: true, supportsDateRange: true },
      { value: 'cheques', label: 'Cheques', supportsMonthYear: true, supportsDateRange: true },
      { value: 'petty_cash', label: 'Petty Cash', supportsMonthYear: true, supportsDateRange: true },
    ],
  },
  {
    label: 'HR & Payroll',
    items: [
      { value: 'employee_details', label: 'Employees', needsEmployee: false, supportsCategory: true },
      { value: 'salary_payments', label: 'Salary Payments', supportsMonthYear: true, supportsDateRange: true },
      { value: 'epf_etf', label: 'EPF / ETF', supportsMonthYear: true, supportsDateRange: true },
      { value: 'attendance_reports', label: 'Attendance', supportsMonthYear: true, supportsDateRange: true },
      { value: 'leave_reports', label: 'Leave Reports', supportsMonthYear: true, supportsDateRange: true },
    ],
  },
  {
    label: 'CRM & Operations',
    items: [
      { value: 'clients', label: 'Customers / Clients' },
      { value: 'project_history', label: 'Projects' },
    ],
  },
]

const ALL_DATASETS = DATASET_GROUPS.flatMap((g) => g.items)

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(EXPORT_HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function pushHistory(entry) {
  const prev = loadHistory()
  const next = [entry, ...prev.filter((e) => !(e.dataset === entry.dataset && e.format === entry.format))].slice(0, 20)
  localStorage.setItem(EXPORT_HISTORY_KEY, JSON.stringify(next))
  return next
}

export default function AdminExports() {
  const now = new Date()
  const [employeeId, setEmployeeId] = useState('')
  const [dataset, setDataset] = useState('financial_overview')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [useDateRange, setUseDateRange] = useState(false)
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [history, setHistory] = useState(loadHistory)

  const { data } = useQuery({
    queryKey: ['admin-export-employees'],
    queryFn: () => api.get('/employees').then((r) => r.data),
  })
  const { data: financeMeta } = useQuery({
    queryKey: ['admin-export-finance-categories', month, year],
    queryFn: () => api.get(`/finance/entries?month=${month}&year=${year}`).then((r) => r.data),
  })
  const employees = data?.employees || []

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return DATASET_GROUPS
    return DATASET_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((d) => d.label.toLowerCase().includes(q) || d.value.includes(q)),
    })).filter((g) => g.items.length > 0)
  }, [search])

  const selected = useMemo(() => employees.find((e) => e._id === employeeId), [employees, employeeId])
  const selectedDataset = useMemo(() => ALL_DATASETS.find((d) => d.value === dataset), [dataset])
  const departmentOptions = useMemo(() => [...new Set(employees.map((e) => e.department).filter(Boolean))], [employees])
  const financeCategories = financeMeta?.categories || []

  const download = async (format) => {
    if (selectedDataset?.needsEmployee && !employeeId) {
      toast.error('Select an employee first')
      return
    }
    try {
      setDownloading(true)
      const params = new URLSearchParams({ dataset, format })
      if (employeeId) params.set('employeeId', employeeId)
      if (useDateRange && fromDate && toDate) {
        params.set('from', fromDate)
        params.set('to', toDate)
      } else if (selectedDataset?.supportsMonthYear) {
        params.set('month', String(month))
        params.set('year', String(year))
      }
      if (selectedDataset?.supportsCategory && category) params.set('category', category)
      if (selectedDataset?.supportsType && type) params.set('type', type)
      const res = await api.get(`/finance/export?${params.toString()}`, { responseType: 'blob' })
      const contentType = res.headers['content-type']
      const suffix = employeeId && selected ? `_${selected.employeeNo}` : ''
      const filename = `${dataset}${suffix}.${format === 'excel' ? 'xlsx' : format}`

      if (format === 'pdf' && contentType && contentType.includes('text/html')) {
        const htmlText = await res.data.text()
        const { htmlStringToPdfDownload } = await import('../../lib/pdfGenerator')
        await htmlStringToPdfDownload(htmlText, filename)
      } else {
        const mime = {
          pdf: 'application/pdf',
          excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          csv: 'text/csv',
        }
        const blob = new Blob([res.data], { type: contentType || mime[format] })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(a.href)
      }

      const entry = {
        dataset,
        label: selectedDataset?.label || dataset,
        format,
        at: new Date().toISOString(),
        filters: { employeeId, month, year, fromDate, toDate, category, type },
      }
      setHistory(pushHistory(entry))
      toast.success(`Exported ${format.toUpperCase()}`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Export failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Export & Reporting Center</h1>
          <p className="page-subtitle">Multi-module exports with filters, date ranges, and export history. PDF exports use your system letterhead.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="card card-body space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                className="form-input pl-9"
                placeholder="Search datasets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDataset(d.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          dataset === d.value ? 'bg-primary text-white font-semibold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {history.length > 0 && (
            <div className="card card-body space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <FiClock size={14} /> Recent exports
              </div>
              <ul className="space-y-1 max-h-48 overflow-y-auto text-xs text-slate-600">
                {history.slice(0, 8).map((h, i) => (
                  <li key={i} className="flex justify-between gap-2 border-b border-slate-100 py-1.5">
                    <span className="truncate">{h.label} · {h.format.toUpperCase()}</span>
                    <span className="shrink-0 text-slate-400">{new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 card card-body space-y-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b pb-3">
            <FiFilter size={14} /> Filters — {selectedDataset?.label}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Employee (optional)</label>
              <select className="form-select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">All employees</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.userId?.name} ({e.employeeNo}) — {e.department}
                  </option>
                ))}
              </select>
            </div>
            {(selectedDataset?.supportsMonthYear || selectedDataset?.supportsDateRange) && (
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 pb-2">
                  <input type="checkbox" checked={useDateRange} onChange={(e) => setUseDateRange(e.target.checked)} />
                  Custom date range
                </label>
              </div>
            )}
          </div>

          {useDateRange && selectedDataset?.supportsDateRange ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">From</label>
                <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label">To</label>
                <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          ) : selectedDataset?.supportsMonthYear ? (
            <div className="grid md:grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="form-label">Month</label>
                <input type="number" min={1} max={12} className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value || 1))} />
              </div>
              <div>
                <label className="form-label">Year</label>
                <input type="number" className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))} />
              </div>
            </div>
          ) : null}

          {(selectedDataset?.supportsCategory || selectedDataset?.supportsType) ? (
            <div className="grid md:grid-cols-2 gap-4">
              {selectedDataset?.supportsCategory ? (
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All</option>
                    {(dataset === 'employee_details' ? departmentOptions : financeCategories).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : <div />}
              {selectedDataset?.supportsType ? (
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="">All</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              ) : <div />}
            </div>
          ) : null}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            <p>Exporting <span className="font-semibold text-slate-800">{selectedDataset?.label}</span>
              {selected ? <> for <span className="font-semibold text-slate-800">{selected.userId?.name}</span></> : <> for <span className="font-semibold text-slate-800">all records</span></>}
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF exports include company letterhead from Admin Settings.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-danger btn-sm inline-flex items-center gap-1.5" disabled={downloading} onClick={() => download('pdf')}>
              <FiFileText size={13} /> PDF <FiDownload size={12} />
            </button>
            <button type="button" className="btn-success btn-sm inline-flex items-center gap-1.5" disabled={downloading} onClick={() => download('excel')}>
              <FiFileText size={13} /> Excel <FiDownload size={12} />
            </button>
            <button type="button" className="btn-secondary btn-sm inline-flex items-center gap-1.5" disabled={downloading} onClick={() => download('csv')}>
              <FiFileText size={13} /> CSV <FiDownload size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
