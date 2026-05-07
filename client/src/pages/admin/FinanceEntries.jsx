import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiDownload } from 'react-icons/fi'

const EXPENSE_CATEGORIES = ['Salary', 'Hosting', 'Equipment', 'Marketing', 'Transport', 'Utilities', 'Other']
const INCOME_CATEGORIES = ['Client Payment', 'Subscription', 'Service Revenue', 'Other']

export default function FinanceEntries() {
  const qc = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [form, setForm] = useState({ type: 'income', category: '', title: '', amount: 0, note: '' })
  const [customCategory, setCustomCategory] = useState('')

  const { data } = useQuery({
    queryKey: ['finance-entries', month, year, typeFilter, categoryFilter],
    queryFn: () => api.get(`/finance/entries?month=${month}&year=${year}${typeFilter ? `&type=${typeFilter}` : ''}${categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : ''}${fromDate ? `&from=${fromDate}` : ''}${toDate ? `&to=${toDate}` : ''}`).then((r) => r.data),
  })
  const entries = data?.entries || []
  const categories = data?.categories || []
  const totals = data?.totals || { income: 0, expense: 0, profit: 0 }

  const activeCategories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const finalCategory = form.category === 'Other' ? customCategory : form.category

  const addMut = useMutation({
    mutationFn: (payload) => api.post('/finance/entries', payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Entry added')
      setForm({ type: 'income', category: '', title: '', amount: 0, note: '' })
      qc.invalidateQueries({ queryKey: ['finance-entries'] })
      qc.invalidateQueries({ queryKey: ['finance-entries-category'] })
      qc.invalidateQueries({ queryKey: ['finance-overview'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const exportData = async (format) => {
    try {
      const params = new URLSearchParams({
        dataset: typeFilter === 'income' ? 'incomes' : typeFilter === 'expense' ? 'expenses' : 'financial_overview',
        format,
        month: String(month),
        year: String(year),
      })
      if (categoryFilter) params.set('category', categoryFilter)
      if (typeFilter) params.set('type', typeFilter)
      const res = await api.get(`/finance/export?${params.toString()}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `finance_entries.${format === 'excel' ? 'xlsx' : 'pdf'}`
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
          <h1 className="page-title">Income & Expenses</h1>
          <p className="page-subtitle">Add and manage financial entries by category with export support.</p>
        </div>
      </div>

      <div className="card card-body space-y-3">
        <h3 className="font-bold text-primary font-heading">Add Entry</h3>
        <div className="grid md:grid-cols-5 gap-3">
          <select className="form-select" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select className="form-select" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
            <option value="">Select category</option>
            {activeCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input className="form-input" placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          <input type="number" className="form-input" placeholder="Amount" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: Number(e.target.value || 0) }))} />
          <input className="form-input" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
        </div>
        {form.category === 'Other' ? (
          <input className="form-input max-w-md" placeholder="Enter custom category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
        ) : null}
        <button className="btn-primary w-fit" onClick={() => addMut.mutate({ ...form, category: finalCategory, date: new Date(year, month - 1, 1).toISOString() })}><FiPlus size={14} /> Add Entry</button>
      </div>

      <div className="card card-body grid md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
        <div><label className="form-label">Month</label><input type="number" min={1} max={12} className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value || 1))} /></div>
        <div><label className="form-label">Year</label><input type="number" className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))} /></div>
        <div><label className="form-label">Type</label><select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="">All</option><option value="income">Income</option><option value="expense">Expense</option></select></div>
        <div><label className="form-label">Category</label><select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="">All</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className="form-label">From</label><input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
        <div><label className="form-label">To</label><input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
        <button className="btn-success" onClick={() => exportData('excel')}><FiDownload size={14} /> Excel</button>
        <button className="btn-danger" onClick={() => exportData('pdf')}><FiDownload size={14} /> PDF</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card kpi-green"><p className="text-xs uppercase text-slate-500">Income</p><p className="text-xl font-bold text-primary">LKR {(totals.income || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs uppercase text-slate-500">Expense</p><p className="text-xl font-bold text-primary">LKR {(totals.expense || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-blue"><p className="text-xs uppercase text-slate-500">Profit</p><p className="text-xl font-bold text-primary">LKR {(totals.profit || 0).toLocaleString()}</p></div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Title</th><th>Amount</th><th>Note</th></tr></thead>
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
            {entries.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">No entries found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

