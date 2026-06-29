import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts'
import api from '../../lib/api'
import { FiDownload, FiLayers, FiMapPin } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { paymentPillClass, PaymentTypeIcon } from '../../lib/financeDisplay'

const DATASETS = [
  { value: 'financial_overview', label: 'Financial Overview' },
  { value: 'salary_payments', label: 'Salary Payments' },
  { value: 'epf_etf', label: 'EPF / ETF' },
  { value: 'employee_details', label: 'Employee Details' },
  { value: 'incomes', label: 'Incomes' },
  { value: 'expenses', label: 'Expenses' },
]

function formatLkr(amount) {
  return Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AdminFinancial() {
  const qc = useQueryClient()
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

  const syncSubIncomeMut = useMutation({
    mutationFn: () => api.post('/finance/sync-subscription-income').then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['finance-overview'] })
      qc.invalidateQueries({ queryKey: ['finance-entries-category'] })
      qc.invalidateQueries({ queryKey: ['finance-pl'] })
      toast.success(res.message || 'Subscription income synced')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Sync failed'),
  })

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
    <div className="erp-module space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Dashboard</h1>
          <p className="page-subtitle">Revenue, income, expenses, salary costs and profit with export tools.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn-outline btn-sm"
            disabled={syncSubIncomeMut.isPending}
            onClick={() => syncSubIncomeMut.mutate()}
            title="Backfill finance entries from recorded subscription payments"
          >
            {syncSubIncomeMut.isPending ? 'Syncing…' : 'Sync subscription income'}
          </button>
          <button type="button" className="btn-primary btn-sm" onClick={() => exportData('excel')}><FiDownload size={12} /> Excel</button>
          <button type="button" className="btn-outline btn-sm" onClick={() => exportData('pdf')}><FiDownload size={12} /> PDF</button>
        </div>
      </div>

      <div className="card card-body filter-toolbar grid md:grid-cols-4 gap-3 items-end">
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Revenue</p><p className="text-xl font-bold text-primary">LKR {(summary.revenue || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Total Income</p><p className="text-xl font-bold text-primary">LKR {(summary.totalIncome || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs text-slate-500 uppercase">Total Expense</p><p className="text-xl font-bold text-primary">LKR {(summary.totalExpense || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-navy"><p className="text-xs text-slate-500 uppercase">Profit</p><p className="text-xl font-bold text-primary">LKR {(summary.profit || 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Cash In Hand</p><p className="text-xl font-bold text-emerald-700">LKR {(summary.cashInHand || 0).toLocaleString()}</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Paid Invoices</p><p className="text-lg font-bold text-primary">{details.paidInvoicesCount || 0}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Payroll Runs</p><p className="text-lg font-bold text-primary">{details.payrollRunsCount || 0}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Ledger Items</p><p className="text-lg font-bold text-primary">{details.entriesCount || 0}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Invoice income</p><p className="text-lg font-bold text-primary">LKR {(summary.invoiceRevenue || summary.revenue || 0).toLocaleString()}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Subscriptions</p><p className="text-lg font-bold text-primary">LKR {(summary.subscriptionRevenue || 0).toLocaleString()}</p><p className="text-[11px] text-slate-400 mt-0.5">{details.subscriptionPaymentsCount || 0} payments</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Petty Cash</p><p className="text-lg font-bold text-emerald-700">+{(summary.pettyCashIn || 0).toLocaleString()}</p><p className="text-[11px] text-red-600">−{(summary.pettyCashOut || 0).toLocaleString()}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Salary Payout</p><p className="text-lg font-bold text-primary">LKR {(summary.salaryPayout || 0).toLocaleString()}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Advances</p><p className="text-lg font-bold text-red-600">−{(summary.advanceExpense || 0).toLocaleString()}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Loans</p><p className="text-sm font-semibold text-red-600">−{(summary.loanDisbursement || 0).toLocaleString()}</p><p className="text-sm font-semibold text-emerald-700">+{(summary.loanRepayment || 0).toLocaleString()}</p></div>
        <div className="card card-body"><p className="text-xs text-slate-500 uppercase">Bank Activity</p><p className="text-sm font-semibold text-emerald-700">+{(summary.bankDeposits || 0).toLocaleString()}</p><p className="text-sm font-semibold text-red-600">−{(summary.bankWithdrawals || 0).toLocaleString()}</p></div>
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
          <h3 className="font-bold text-primary font-heading mb-4">Recent income & expense activity</h3>
          <p className="text-xs text-slate-500 mb-3">Latest entries with payment method and account context.</p>
          <div className="space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
            {(details.recentEntries || []).map((e, idx) => {
              const pm = e.paymentMethod || 'Cash'
              return (
                <article
                  key={`${e.title}-${idx}`}
                  className={`finance-tx-shell overflow-hidden ${e.type === 'income' ? 'finance-tx-shell--income' : 'finance-tx-shell--expense'}`}
                >
                  <div className="finance-tx-accent" aria-hidden />
                  <div className="finance-tx-body py-3 sm:py-3.5">
                    <div className="finance-tx-main min-h-0">
                      <div className="finance-tx-meta">
                        <time className="finance-tx-date">{new Date(e.date).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                        <span className={`finance-tx-typepill capitalize ${e.type === 'income' ? 'finance-tx-typepill--income' : 'finance-tx-typepill--expense'}`}>{e.type}</span>
                        <span className={`finance-payment-pill ${paymentPillClass(pm)}`} title="Payment type">
                          <PaymentTypeIcon method={pm} />
                          {pm}
                        </span>
                      </div>
                      <p className="finance-tx-title text-sm sm:text-[15px]">{e.title}</p>
                      <p className="text-[11px] font-medium text-slate-500">{e.category}</p>
                      <div className="finance-tx-chips mt-1">
                        {e.bankName ? (
                          <span className="finance-tx-chip max-w-[200px]">
                            <FiLayers size={10} className="shrink-0 opacity-70" aria-hidden />
                            <span className="truncate">{e.bankName}</span>
                          </span>
                        ) : null}
                        {e.branchName ? (
                          <span className="finance-tx-chip max-w-[160px]">
                            <FiMapPin size={10} className="shrink-0 opacity-70" aria-hidden />
                            <span className="truncate">{e.branchName}</span>
                          </span>
                        ) : null}
                      </div>
                      {e.note ? <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-snug">{e.note}</p> : null}
                    </div>
                    <div className="finance-tx-aside sm:min-w-[7rem] py-0">
                      <p className={`finance-amount text-sm font-bold ${e.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {e.type === 'income' ? '+' : '−'} LKR {formatLkr(e.amount)}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })}
            {(details.recentEntries || []).length === 0 ? <p className="text-sm text-slate-400">No finance entries in this period.</p> : null}
          </div>
        </div>
      </div>

      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-4">Financial entries</h3>
        <p className="text-xs text-slate-500 mb-3">Ledger view with payment type; amounts use fixed-width digits for alignment.</p>
        <div className="table-container">
          <table className="table finance-ledger-table">
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Title</th>
                <th>Payment</th>
                <th>Bank / Branch</th>
                <th className="text-right">Amount (LKR)</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id}>
                  <td className="whitespace-nowrap text-sm">{new Date(e.date).toLocaleDateString()}</td>
                  <td><span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'} capitalize`}>{e.type}</span></td>
                  <td className="text-sm">{e.category}</td>
                  <td className="text-sm font-medium max-w-[1px] truncate" title={e.title}>{e.title}</td>
                  <td className="align-middle">
                    <span className={`finance-payment-pill ${paymentPillClass(e.paymentMethod)}`}>
                      <PaymentTypeIcon method={e.paymentMethod} />
                      {e.paymentMethod || '—'}
                    </span>
                  </td>
                  <td className="text-xs text-slate-600 align-middle">
                    {e.bankAccount?.bankName || e.branch?.name ? (
                      <div className="space-y-1">
                        {e.bankAccount?.bankName ? (
                          <div className="flex items-center gap-1 min-w-0">
                            <FiLayers size={12} className="text-slate-400 shrink-0" aria-hidden />
                            <span className="truncate">{e.bankAccount.bankName}</span>
                          </div>
                        ) : null}
                        {e.branch?.name ? (
                          <div className="flex items-center gap-1 min-w-0 text-slate-500">
                            <FiMapPin size={12} className="text-slate-400 shrink-0" aria-hidden />
                            <span className="truncate">{e.branch.name}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={`finance-amount text-sm font-semibold ${e.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {e.type === 'income' ? '+' : '−'} LKR {formatLkr(e.amount)}
                  </td>
                  <td className="text-xs text-slate-500 max-w-[140px] truncate" title={e.note || ''}>{e.note || '—'}</td>
                </tr>
              ))}
              {entries.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-slate-400">No finance entries found for selected month/year.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

