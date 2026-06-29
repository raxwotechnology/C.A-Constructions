import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import ExportBar from '../../components/ui/ExportBar'
import { FiDownload, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart, FiFilter } from 'react-icons/fi'

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Cheque', 'Online Payment', 'Other']

function fmt(n) { return `LKR ${Number(n || 0).toLocaleString()}` }

function KPI({ label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    red: 'bg-red-50 border-red-100 text-red-800',
    purple: 'bg-purple-50 border-purple-100 text-purple-800',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function BarRow({ label, amount, max, color = 'bg-secondary' }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 truncate text-slate-600 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-28 text-right font-medium text-slate-800 shrink-0">{fmt(amount)}</span>
    </div>
  )
}

export default function FinancialReports() {
  const now = new Date()
  const thisYear = now.getFullYear()
  const [from, setFrom] = useState(`${thisYear}-01-01`)
  const [to, setTo] = useState(now.toISOString().split('T')[0])
  const [branchFilter, setBranchFilter] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [activeTab, setActiveTab] = useState('pl')
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const exportBarRef = useRef(null)

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const params = new URLSearchParams({ from, to })
  if (branchFilter) params.set('branch', branchFilter)
  if (paymentMethod) params.set('paymentMethod', paymentMethod)

  const { data, isLoading } = useQuery({
    queryKey: ['finance-pl', from, to, branchFilter, paymentMethod],
    queryFn: () => api.get(`/finance/profit-loss?${params.toString()}`).then(r => r.data),
  })

  const summary = data?.summary || {}
  const incomeCat = data?.incomeCategoryBreakdown || []
  const expenseCat = data?.expenseCategoryBreakdown || []
  const byMethod = data?.byMethod || []
  const invoicePayments = data?.invoicePayments || []
  const payrollRuns = data?.payrollRuns || []
  const incomeEntries = data?.incomeEntries || []
  const expenseEntries = data?.expenseEntries || []
  const bankEntries = data?.bankEntries || []
  const allEntries = [...incomeEntries, ...expenseEntries].sort((a, b) => new Date(b.date) - new Date(a.date))
  const maxIncome = Math.max(...incomeCat.map(c => c.amount), 1)
  const maxExpense = Math.max(...expenseCat.map(c => c.amount), 1)

  const exportReport = async (format, dataset = 'financial_overview') => {
    try {
      const p = new URLSearchParams({ dataset, format, from, to })
      if (branchFilter) p.set('branch', branchFilter)
      if (paymentMethod) p.set('paymentMethod', paymentMethod)
      const res = await api.get(`/finance/export?${p.toString()}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      a.download = `${dataset}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
      toast.success(`Report exported`)
    } catch { toast.error('Export failed') }
  }

  const tabs = [
    { id: 'pl', label: 'Profit & Loss' },
    { id: 'income', label: 'Income Breakdown' },
    { id: 'expense', label: 'Expense Breakdown' },
    { id: 'invoices', label: 'Invoice Payments' },
    { id: 'payroll', label: 'Salary Expense' },
    { id: 'petty', label: 'Petty Cash' },
    { id: 'cheques', label: 'Cheques' },
    { id: 'bank', label: 'Bank Transactions' },
    { id: 'loans', label: 'Advances & Loans' },
    { id: 'tax', label: 'Income Tax' },
    { id: 'method', label: 'By Payment Method' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Profit & Loss, Income & Expense breakdown by branch, category, and payment method.</p>
        </div>
        <div className="relative w-full sm:w-auto mt-2 sm:mt-0">
          <ExportBar 
            ref={exportBarRef}
            customTrigger={true}
            data={[
              ...incomeEntries.map(e => ({ ...e, type: 'Income' })),
              ...expenseEntries.map(e => ({ ...e, type: 'Expense' })),
            ]} 
            columns={[
              { header: 'Type', accessor: r => r.type || '—' },
              { header: 'Date', accessor: r => r.date ? new Date(r.date).toLocaleDateString() : '—' },
              { header: 'Category', accessor: r => r.category || '—' },
              { header: 'Title', accessor: r => r.title || '—' },
              { header: 'Method', accessor: r => r.paymentMethod || 'Cash' },
              { header: 'Amount', accessor: r => r.amount || 0 },
            ]} 
            title="Financial Report"
            filters={{ From: from, To: to, Branch: branchFilter || 'All', Method: paymentMethod || 'All' }}
          />

          <button
            type="button"
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            className="w-full sm:w-auto btn-primary justify-center py-2 px-4 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <FiDownload size={15} />
            <span>Export Reports</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExportDropdown && (
            <>
              <div 
                className="fixed inset-0 z-30 bg-transparent" 
                onClick={() => setShowExportDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-full sm:w-72 bg-white rounded-2xl border border-slate-200/80 shadow-xl py-2 z-40 animate-fade-in origin-top-right">
                
                <div className="px-3.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Summary Sheets (Server Export)
                </div>
                <button
                  type="button"
                  onClick={() => { setShowExportDropdown(false); exportReport('pdf') }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  Overview PDF Report
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExportDropdown(false); exportReport('excel') }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Overview Excel Sheet
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExportDropdown(false); exportReport('pdf', 'incomes') }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  Income Breakdown PDF
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExportDropdown(false); exportReport('pdf', 'expenses') }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Expense Breakdown PDF
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                <div className="px-3.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Filtered Ledger (Local Export)
                </div>
                <button
                  type="button"
                  onClick={() => { setShowExportDropdown(false); exportBarRef.current?.exportPDF() }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Filtered Ledger PDF Table
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExportDropdown(false); exportBarRef.current?.exportExcel() }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Filtered Ledger Excel Table
                </button>

                <div className="my-1.5 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => { setShowExportDropdown(false); window.print() }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm5-17V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3m6 0H9"/></svg>
                  Print Report page
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card card-body">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="form-label text-xs">From Date</label>
            <input type="date" className="form-input text-sm" value={from} onChange={e => setFrom(e.target.value)}/>
          </div>
          <div>
            <label className="form-label text-xs">To Date</label>
            <input type="date" className="form-input text-sm" value={to} onChange={e => setTo(e.target.value)}/>
          </div>
          <div>
            <label className="form-label text-xs">Branch</label>
            <select className="form-select text-sm" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Payment Method</label>
            <select className="form-select text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Total Income" value={fmt(summary.totalIncome)} sub={`Invoices ${fmt(summary.totalInvoiceRevenue)} · Other ${fmt(summary.totalIncomeEntries)} · Subs ${fmt(summary.subscriptionRevenue)}`} color="green"/>
            <KPI label="Total Expenses" value={fmt(summary.totalExpense)} sub={`Payroll ${fmt(summary.totalSalaryExpense)} · Other ${fmt(summary.totalExpenseEntries)} · Petty ${fmt(summary.pettyCashOut)}`} color="red"/>
            <KPI label="Net Profit" value={fmt(summary.netProfit)} color={summary.netProfit >= 0 ? 'green' : 'red'}
              sub={summary.totalIncome > 0 ? `${((summary.netProfit / summary.totalIncome) * 100).toFixed(1)}% margin` : ''}/>
            <KPI label="Invoice Payments" value={fmt(summary.invoiceRevenue ?? summary.totalInvoiceRevenue)} sub={`${incomeEntries.filter(e => e.category === 'Invoices').length} transactions`} color="blue"/>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-white rounded-t-xl">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t.id ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="card card-body">
            {/* P&L Tab */}
            {activeTab === 'pl' && (
              <div className="space-y-6">
                <h3 className="font-bold text-primary text-lg">Profit & Loss Statement</h3>
                <div className="space-y-1 text-sm max-w-2xl">
                  <div className="flex justify-between py-2 border-b border-slate-100 font-bold text-slate-500 uppercase text-xs tracking-wider">
                    <span>Item</span><span>Amount</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-emerald-700"><span>Invoice Payments</span><span className="font-semibold">{fmt(summary.invoiceRevenue ?? summary.totalInvoiceRevenue)}</span></div>
                  <div className="flex justify-between py-2.5 text-emerald-700"><span>Subscription Payments</span><span className="font-semibold">{fmt(summary.subscriptionRevenue)}</span></div>
                  <div className="flex justify-between py-2.5 text-emerald-700"><span>Cheques (In)</span><span className="font-semibold">{fmt(summary.chequeIn)}</span></div>
                  <div className="flex justify-between py-2.5 text-emerald-700"><span>Petty Cash (In)</span><span className="font-semibold">{fmt(summary.pettyCashIn)}</span></div>

                  <div className="flex justify-between py-2.5 text-emerald-700"><span>Loan Repayments</span><span className="font-semibold">{fmt(summary.loanRepayment)}</span></div>
                  <div className="flex justify-between py-2.5 text-emerald-700"><span>Other Income Entries</span><span className="font-semibold">{fmt(summary.otherIncomeEntries ?? summary.totalIncomeEntries)}</span></div>
                  <div className="flex justify-between py-2.5 border-t border-slate-200 font-bold text-emerald-800 text-base"><span>TOTAL INCOME</span><span>{fmt(summary.totalIncome)}</span></div>
                  <div className="flex justify-between py-2.5 text-red-700 mt-2"><span>Salary / Payroll Expense</span><span className="font-semibold">{fmt(summary.totalSalaryExpense)}</span></div>
                  <div className="flex justify-between py-2.5 text-red-700"><span>Petty Cash (Out)</span><span className="font-semibold">{fmt(summary.pettyCashOut)}</span></div>
                  <div className="flex justify-between py-2.5 text-red-700"><span>Cheques (Out)</span><span className="font-semibold">{fmt(summary.chequeOut)}</span></div>

                  <div className="flex justify-between py-2.5 text-red-700"><span>Salary Advances</span><span className="font-semibold">{fmt(summary.advanceExpense)}</span></div>
                  <div className="flex justify-between py-2.5 text-red-700"><span>Loan Disbursements</span><span className="font-semibold">{fmt(summary.loanDisbursement)}</span></div>
                  <div className="flex justify-between py-2.5 text-red-700"><span>Other Expense Entries</span><span className="font-semibold">{fmt(summary.otherExpenseEntries ?? summary.totalExpenseEntries)}</span></div>
                  <div className="flex justify-between py-2.5 border-t border-slate-200 font-bold text-red-800 text-base"><span>TOTAL EXPENSES</span><span>{fmt(summary.totalExpense)}</span></div>
                  <div className={`flex justify-between py-3 mt-2 border-t-2 border-slate-300 font-black text-xl ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    <span>NET PROFIT / LOSS</span><span>{fmt(summary.netProfit)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Income Breakdown */}
            {activeTab === 'income' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Income by Category</h3>
                <div className="space-y-3">
                  {incomeCat.map(c => <BarRow key={c.category} label={c.category} amount={c.amount} max={maxIncome} color="bg-emerald-500"/>)}
                  {incomeCat.length === 0 && <p className="text-slate-400 text-sm">No income entries for this period.</p>}
                </div>
                <div className="mt-6">
                  <h4 className="font-bold text-slate-700 mb-3">All Income Transactions</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead><tr><th>Date</th><th>Category</th><th>Title</th><th>Method</th><th>Amount</th></tr></thead>
                      <tbody>
                        {incomeEntries.map(e => (
                          <tr key={e._id}>
                            <td className="text-slate-500 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                            <td>{e.category}</td>
                            <td className="font-medium text-slate-800">{e.title}</td>
                            <td><span className="badge badge-gray text-xs">{e.paymentMethod || 'Cash'}</span></td>
                            <td className="text-emerald-600 font-semibold">{fmt(e.amount)}</td>
                          </tr>
                        ))}
                        {incomeEntries.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-slate-400">No income entries.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Expense Breakdown */}
            {activeTab === 'expense' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Expense by Category</h3>
                <div className="space-y-3">
                  {expenseCat.map(c => <BarRow key={c.category} label={c.category} amount={c.amount} max={maxExpense} color="bg-red-400"/>)}
                  {expenseCat.length === 0 && <p className="text-slate-400 text-sm">No expense entries for this period.</p>}
                </div>
                <div className="mt-6">
                  <h4 className="font-bold text-slate-700 mb-3">All Expense Transactions</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead><tr><th>Date</th><th>Category</th><th>Title</th><th>Method</th><th>Amount</th></tr></thead>
                      <tbody>
                        {expenseEntries.map(e => (
                          <tr key={e._id}>
                            <td className="text-slate-500 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                            <td>{e.category}</td>
                            <td className="font-medium text-slate-800">{e.title}</td>
                            <td><span className="badge badge-gray text-xs">{e.paymentMethod || 'Cash'}</span></td>
                            <td className="text-red-600 font-semibold">{fmt(e.amount)}</td>
                          </tr>
                        ))}
                        {expenseEntries.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-slate-400">No expense entries.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Payments */}
            {activeTab === 'invoices' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Invoice Payment Report ({invoicePayments.length})</h3>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Invoice No</th><th>Client</th><th>Paid At</th><th>Total</th></tr></thead>
                    <tbody>
                      {invoicePayments.map(i => (
                        <tr key={i._id}>
                          <td className="font-medium text-slate-800">{i.invoiceNo}</td>
                          <td>{i.client?.name || '—'}</td>
                          <td className="text-slate-500 text-sm">{i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '—'}</td>
                          <td className="text-emerald-600 font-semibold">{fmt(i.total)}</td>
                        </tr>
                      ))}
                      {invoicePayments.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-slate-400">No paid invoices.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Salary Expense */}
            {activeTab === 'payroll' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Salary Expense Report ({payrollRuns.length})</h3>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Employee</th><th>Period</th><th>Basic</th><th>Net Pay</th><th>EPF (Emp)</th><th>ETF</th></tr></thead>
                    <tbody>
                      {payrollRuns.map(p => (
                        <tr key={p._id}>
                          <td className="font-medium text-slate-800">{p.employee?.userId?.name || '—'}</td>
                          <td className="text-slate-500 text-sm">{p.month}/{p.year}</td>
                          <td>{fmt(p.basicSalary)}</td>
                          <td className="text-red-600 font-semibold">{fmt(p.netSalary)}</td>
                          <td className="text-slate-500 text-sm">{fmt(p.epfEmployee)}</td>
                          <td className="text-slate-500 text-sm">{fmt(p.etfEmployer)}</td>
                        </tr>
                      ))}
                      {payrollRuns.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-slate-400">No paid payrolls.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Petty Cash */}
            {activeTab === 'petty' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Petty Cash Transactions</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-xs text-emerald-600 uppercase font-bold">Cash In</p><p className="text-xl font-black text-emerald-800">{fmt(summary.pettyCashIn)}</p></div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-xs text-red-600 uppercase font-bold">Cash Out</p><p className="text-xl font-black text-red-800">{fmt(summary.pettyCashOut)}</p></div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-xs text-blue-600 uppercase font-bold">Balance</p><p className="text-xl font-black text-blue-800">{fmt((summary.pettyCashIn || 0) - (summary.pettyCashOut || 0))}</p></div>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
                    <tbody>
                      {allEntries.filter(e => e.category?.includes('Petty Cash')).map((e, i) => (
                        <tr key={e._id || i}>
                          <td className="text-slate-500 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                          <td><span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'}`}>{e.type === 'income' ? 'IN' : 'OUT'}</span></td>
                          <td>{e.category}</td>
                          <td className="font-medium text-slate-800">{e.title}</td>
                          <td className={e.type === 'income' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{fmt(e.amount)}</td>
                        </tr>
                      ))}
                      {allEntries.filter(e => e.category?.includes('Petty Cash')).length === 0 && <tr><td colSpan={5} className="text-center py-4 text-slate-400">No petty cash entries.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cheques */}
            {activeTab === 'cheques' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Cheque Transactions</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-xs text-emerald-600 uppercase font-bold">Cheques In</p><p className="text-xl font-black text-emerald-800">{fmt(summary.chequeIn)}</p></div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-xs text-red-600 uppercase font-bold">Cheques Out</p><p className="text-xl font-black text-red-800">{fmt(summary.chequeOut)}</p></div>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
                    <tbody>
                      {allEntries.filter(e => e.category?.includes('Cheque')).map((e, i) => (
                        <tr key={e._id || i}>
                          <td className="text-slate-500 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                          <td><span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'}`}>{e.type}</span></td>
                          <td>{e.category}</td>
                          <td className="font-medium text-slate-800">{e.title}</td>
                          <td className={e.type === 'income' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{fmt(e.amount)}</td>
                        </tr>
                      ))}
                      {allEntries.filter(e => e.category?.includes('Cheque')).length === 0 && <tr><td colSpan={5} className="text-center py-4 text-slate-400">No cheque entries.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bank Transactions */}
            {activeTab === 'bank' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Bank Transactions</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-xs text-emerald-600 uppercase font-bold">Deposits</p><p className="text-xl font-black text-emerald-800">{fmt(summary.bankDeposits)}</p></div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-xs text-red-600 uppercase font-bold">Withdrawals</p><p className="text-xl font-black text-red-800">{fmt(summary.bankWithdrawals)}</p></div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-xs text-blue-600 uppercase font-bold">Net Flow</p><p className="text-xl font-black text-blue-800">{fmt(summary.bankNetFlow)}</p></div>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Method</th><th>Amount</th></tr></thead>
                    <tbody>
                      {bankEntries.sort((a, b) => new Date(b.date) - new Date(a.date)).map((e, i) => (
                        <tr key={e._id || i}>
                          <td className="text-slate-500 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                          <td><span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'}`}>{e.type}</span></td>
                          <td>{e.category}</td>
                          <td className="font-medium text-slate-800">{e.title}</td>
                          <td><span className="badge badge-gray text-xs">{e.paymentMethod || '—'}</span></td>
                          <td className={e.type === 'income' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{fmt(e.amount)}</td>
                        </tr>
                      ))}
                      {bankEntries.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-slate-400">No bank transactions.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Advances & Loans */}
            {activeTab === 'loans' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Advances & Loans</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-xs text-red-600 uppercase font-bold">Advance Expense</p><p className="text-xl font-black text-red-800">{fmt(summary.advanceExpense)}</p></div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-xs text-red-600 uppercase font-bold">Loan Disbursements</p><p className="text-xl font-black text-red-800">{fmt(summary.loanDisbursement)}</p></div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-xs text-emerald-600 uppercase font-bold">Loan Repayments</p><p className="text-xl font-black text-emerald-800">{fmt(summary.loanRepayment)}</p></div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-xs text-blue-600 uppercase font-bold">Net Loan Exposure</p><p className="text-xl font-black text-blue-800">{fmt((summary.loanDisbursement || 0) - (summary.loanRepayment || 0))}</p></div>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
                    <tbody>
                      {allEntries.filter(e => e.category?.includes('Advance') || e.category?.includes('Loan')).map((e, i) => (
                        <tr key={e._id || i}>
                          <td className="text-slate-500 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                          <td><span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'}`}>{e.type}</span></td>
                          <td>{e.category}</td>
                          <td className="font-medium text-slate-800">{e.title}</td>
                          <td className={e.type === 'income' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{fmt(e.amount)}</td>
                        </tr>
                      ))}
                      {allEntries.filter(e => e.category?.includes('Advance') || e.category?.includes('Loan')).length === 0 && <tr><td colSpan={5} className="text-center py-4 text-slate-400">No advance/loan entries.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Income Tax */}
            {activeTab === 'tax' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Income Tax & Taxes</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-xs text-red-600 uppercase font-bold">Tax Paid</p><p className="text-xl font-black text-red-800">{fmt(allEntries.filter(e => e.category?.toLowerCase().includes('tax') || e.title?.toLowerCase().includes('tax')).reduce((s, e) => s + (e.type === 'expense' ? e.amount : 0), 0))}</p></div>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
                    <tbody>
                      {allEntries.filter(e => e.category?.toLowerCase().includes('tax') || e.title?.toLowerCase().includes('tax')).map((e, i) => (
                        <tr key={e._id || i}>
                          <td className="text-slate-500 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                          <td><span className={`badge ${e.type === 'income' ? 'badge-green' : 'badge-red'}`}>{e.type}</span></td>
                          <td>{e.category}</td>
                          <td className="font-medium text-slate-800">{e.title}</td>
                          <td className={e.type === 'income' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{fmt(e.amount)}</td>
                        </tr>
                      ))}
                      {allEntries.filter(e => e.category?.toLowerCase().includes('tax') || e.title?.toLowerCase().includes('tax')).length === 0 && <tr><td colSpan={5} className="text-center py-4 text-slate-400">No tax entries.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* By Payment Method */}
            {activeTab === 'method' && (
              <div className="space-y-4">
                <h3 className="font-bold text-primary text-lg">Breakdown by Payment Method</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byMethod.map(m => (
                    <div key={m.method} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <p className="font-bold text-slate-700 mb-3">{m.method}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-emerald-600">Income</span><span className="font-semibold">{fmt(m.income || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-red-600">Expense</span><span className="font-semibold">{fmt(m.expense || 0)}</span></div>
                        <div className="flex justify-between pt-2 border-t border-slate-100 font-bold">
                          <span className={m.income - m.expense >= 0 ? 'text-emerald-700' : 'text-red-700'}>Net</span>
                          <span className={m.income - m.expense >= 0 ? 'text-emerald-700' : 'text-red-700'}>{fmt((m.income || 0) - (m.expense || 0))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {byMethod.length === 0 && <p className="text-slate-400 text-sm col-span-full">No payment data for this period.</p>}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
