import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiDownload, FiFileText } from 'react-icons/fi'

const DATASETS = [
  { value: 'employee_details', label: 'Employee Details', needsEmployee: false, supportsCategory: true },
  { value: 'salary_payments', label: 'Employee Salary Payments', needsEmployee: false, supportsMonthYear: true },
  { value: 'epf_etf', label: 'EPF / ETF', needsEmployee: false, supportsMonthYear: true },
  { value: 'attendance_reports', label: 'Attendance Reports', needsEmployee: false, supportsMonthYear: true },
  { value: 'leave_reports', label: 'Leave Reports', needsEmployee: false, supportsMonthYear: true },
  { value: 'project_history', label: 'Project History', needsEmployee: false },
  { value: 'revenue_invoices', label: 'Revenue / Invoice Report', needsEmployee: false, supportsMonthYear: true },
  { value: 'incomes', label: 'Incomes', needsEmployee: false, supportsMonthYear: true, supportsCategory: true },
  { value: 'expenses', label: 'Expenses', needsEmployee: false, supportsMonthYear: true, supportsCategory: true },
  { value: 'financial_overview', label: 'Financial Overview', needsEmployee: false, supportsMonthYear: true, supportsCategory: true, supportsType: true },
]

export default function AdminExports() {
  const now = new Date()
  const [employeeId, setEmployeeId] = useState('')
  const [dataset, setDataset] = useState('employee_details')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [downloading, setDownloading] = useState(false)

  const { data } = useQuery({
    queryKey: ['admin-export-employees'],
    queryFn: () => api.get('/employees').then((r) => r.data),
  })
  const { data: financeMeta } = useQuery({
    queryKey: ['admin-export-finance-categories', month, year],
    queryFn: () => api.get(`/finance/entries?month=${month}&year=${year}`).then((r) => r.data),
  })
  const employees = data?.employees || []

  const selected = useMemo(() => employees.find((e) => e._id === employeeId), [employees, employeeId])
  const selectedDataset = useMemo(() => DATASETS.find((d) => d.value === dataset), [dataset])
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
      if (selectedDataset?.supportsMonthYear) {
        params.set('month', String(month))
        params.set('year', String(year))
      }
      if (selectedDataset?.supportsCategory && category) params.set('category', category)
      if (selectedDataset?.supportsType && type) params.set('type', type)
      const res = await api.get(`/finance/export?${params.toString()}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: res.headers['content-type'] || (format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const suffix = employeeId && selected ? `_${selected.employeeNo}` : ''
      a.download = `${dataset}${suffix}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
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
          <h1 className="page-title">Admin Export Center</h1>
          <p className="page-subtitle">Export employee-level and organization-level reports with scoped filters.</p>
        </div>
      </div>

      <div className="card card-body space-y-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Dataset</label>
            <select className="form-select" value={dataset} onChange={(e) => setDataset(e.target.value)}>
              {DATASETS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Employee</label>
            <select className="form-select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">All employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.userId?.name} ({e.employeeNo}) - {e.department}
                </option>
              ))}
            </select>
          </div>
          {selectedDataset?.supportsMonthYear ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Month</label>
                <input type="number" min={1} max={12} className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value || 1))} />
              </div>
              <div>
                <label className="form-label">Year</label>
                <input type="number" className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))} />
              </div>
            </div>
          ) : <div />}
        </div>

        {(selectedDataset?.supportsCategory || selectedDataset?.supportsType) ? (
          <div className="grid md:grid-cols-2 gap-4">
            {selectedDataset?.supportsCategory ? (
              <div>
                <label className="form-label">Category Filter</label>
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All</option>
                  {(dataset === 'employee_details' ? departmentOptions : financeCategories).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ) : <div />}
            {selectedDataset?.supportsType ? (
              <div>
                <label className="form-label">Type Filter</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">All</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            ) : <div />}
          </div>
        ) : null}

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
          Exporting: <span className="font-semibold text-slate-800">{selectedDataset?.label}</span>
          {selected ? <span> for <span className="font-semibold text-slate-800">{selected.userId?.name}</span></span> : <span> for <span className="font-semibold text-slate-800">All Employees</span></span>}
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn-primary" disabled={downloading} onClick={() => download('pdf')}>
            <FiFileText size={15} /> Export PDF <FiDownload size={14} />
          </button>
          <button type="button" className="btn-outline" disabled={downloading} onClick={() => download('excel')}>
            <FiFileText size={15} /> Export Excel <FiDownload size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

