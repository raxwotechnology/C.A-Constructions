import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts'
import api from '../../lib/api'
import { FiDownload } from 'react-icons/fi'
import toast from 'react-hot-toast'

const DATASETS = [
  { value: 'financial_overview', label: 'Financial Overview' },
  { value: 'salary_payments', label: 'Salary Payments' },
  { value: 'epf_etf', label: 'EPF / ETF' },
  { value: 'employee_details', label: 'Employee Details' },
  { value: 'incomes', label: 'Incomes' },
  { value: 'expenses', label: 'Expenses' },
]

export default function AdminFinancial() {
  const now = new Date()
  const thisYear = now.getFullYear()
  const [from, setFrom] = useState(`${thisYear}-01-01`)
  const [to, setTo] = useState(now.toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [dataset, setDataset] = useState('financial_overview')
  const [branchFilter, setBranchFilter] = useState('')

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const { data } = useQuery({
    queryKey: ['finance-overview', from, to, branchFilter],
    queryFn: () => api.get(`/finance/overview?from=${from}&to=${to}${branchFilter ? `&branch=${branchFilter}` : ''}`).then((r) => r.data),
  })
  const { data: entriesData } = useQuery({
    queryKey: ['finance-entries-category', from, to, branchFilter],
    queryFn: () => api.get(`/finance/entries?from=${from}&to=${to}${branchFilter ? `&branch=${branchFilter}` : ''}`).then((r) => r.data),
  })

  const summary = data?.summary || {}
  const details = data?.details || {}
  const revenueSeries = data?.charts?.revenueByMonth || []
  const catSeries = data?.charts?.incomeExpenseByCategory || []
  const categories = useMemo(() => entriesData?.categories || [], [entriesData])
  const entries = entriesData?.entries || []

  const exportData = async (format) => {
    try {
      const params = new URLSearchParams({
        dataset,
        format,
        from,
        to,
      })
      if (category) params.set('category', category)
      if (branchFilter) params.set('branch', branchFilter)
      const res = await api.get(`/finance/export?${params.toString()}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${dataset}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
      toast.success(`Exported ${format.toUpperCase()}`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Export failed')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Dashboard</h1>
          <p className="page-subtitle">Revenue, income, expenses, salary costs and profit with export tools.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => exportData('excel')}><FiDownload size={14} /> Export Excel</button>
          <button className="btn-outline" onClick={() => exportData('pdf')}><FiDownload size={14} /> Export PDF</button>
        </div>
      </div>

      <div className="card card-body grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="form-label">From</label>
          <input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="form-label">To</label>
          <input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Dataset Category</label>
          <select className="form-select" value={dataset} onChange={(e) => setDataset(e.target.value)}>
            {DATASETS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Filter Category (optional)</label>
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Branch (optional)</label>
          <select className="form-select" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Revenue</p><p className="text-xl font-bold text-primary">LKR {(summary.revenue || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Total Income</p><p className="text-xl font-bold text-primary">LKR {(summary.totalIncome || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs text-slate-500 uppercase">Total Expense</p><p className="text-xl font-bold text-primary">LKR {(summary.totalExpense || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-navy"><p className="text-xs text-slate-500 uppercase">Profit</p><p className="text-xl font-bold text-primary">LKR {(summary.profit || 0).toLocaleString()}</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Paid Invoices</p><p className="text-lg font-bold text-primary">{details.paidInvoicesCount || 0}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Payroll Runs</p><p className="text-lg font-bold text-primary">{details.payrollRunsCount || 0}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Finance Entries</p><p className="text-lg font-bold text-primary">{details.entriesCount || 0}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Profit Margin</p><p className="text-lg font-bold text-primary">{(details.profitMarginPct || 0).toFixed(2)}%</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4">Revenue Trend</h3>
          <p className="text-xs text-slate-500 mb-3">Revenue updates when an invoice status becomes paid. The graph shows monthly paid-invoice totals for the selected year.</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `LKR ${Number(v).toLocaleString()}`} />
              <Area type="monotone" dataKey="total" stroke="#1d4ed8" fill="#93c5fd" fillOpacity={0.35} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4">Income/Expense by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(v) => `LKR ${Number(v).toLocaleString()}`} />
              <Bar dataKey="total" fill="#0f172a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4">Income Breakdown</h3>
          <div className="space-y-2">
            {(details.incomeBreakdown || []).map((row) => (
              <div key={`inc-${row.category}`} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1">
                <span className="text-slate-600">{row.category}</span>
                <span className="font-semibold text-green-700">LKR {Number(row.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            {(details.incomeBreakdown || []).length === 0 ? <p className="text-sm text-slate-400">No income entries in this period.</p> : null}
          </div>
        </div>
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4">Expense Breakdown</h3>
          <div className="space-y-2">
            {(details.expenseBreakdown || []).map((row) => (
              <div key={`exp-${row.category}`} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1">
                <span className="text-slate-600">{row.category}</span>
                <span className="font-semibold text-red-700">LKR {Number(row.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            {(details.expenseBreakdown || []).length === 0 ? <p className="text-sm text-slate-400">No expense entries in this period.</p> : null}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4">Top Revenue Invoices</h3>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Paid At</th></tr></thead>
              <tbody>
                {(details.topRevenueInvoices || []).map((i) => (
                  <tr key={i.invoiceNo}>
                    <td>{i.invoiceNo}</td>
                    <td>{i.clientName}</td>
                    <td>LKR {Number(i.total || 0).toLocaleString()}</td>
                    <td>{i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {(details.topRevenueInvoices || []).length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-slate-400">No paid invoices this period.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4">Recent Income/Expense Entries</h3>
          <div className="space-y-2">
            {(details.recentEntries || []).map((e, idx) => (
              <div key={`${e.title}-${idx}`} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
                <div>
                  <p className="text-sm font-medium text-primary">{e.title}</p>
                  <p className="text-xs text-slate-500">{e.category} • {new Date(e.date).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-semibold ${e.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                  {e.type === 'income' ? '+' : '-'} LKR {Number(e.amount || 0).toLocaleString()}
                </span>
              </div>
            ))}
            {(details.recentEntries || []).length === 0 ? <p className="text-sm text-slate-400">No finance entries in this period.</p> : null}
          </div>
        </div>
      </div>

      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-4">Financial Entries</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Category</th><th>Title</th><th>Amount</th><th>Note</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id}>
                  <td>{new Date(e.date).toLocaleDateString()}</td>
                  <td><span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'} capitalize`}>{e.type}</span></td>
                  <td>{e.category}</td>
                  <td>{e.title}</td>
                  <td>LKR {Number(e.amount || 0).toLocaleString()}</td>
                  <td>{e.note || '—'}</td>
                </tr>
              ))}
              {entries.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">No finance entries found for selected month/year.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

