import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import ExportBar from '../../components/ui/ExportBar'
import { FiArrowLeft, FiFilter } from 'react-icons/fi'

const MODULE_SOURCES = ['manual', 'loans', 'cheques', 'payroll', 'invoices', 'advances', 'finance', 'income_tax', 'subscriptions', 'petty_cash']
const TX_TYPES = ['deposit', 'withdrawal', 'transfer_in', 'transfer_out']

export default function BankTransactionHistory() {
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    branch: '',
    bankAccount: '',
    moduleSource: '',
    type: '',
    paymentType: '',
  })
  const [page, setPage] = useState(1)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '100')
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v) })
    return p.toString()
  }, [filters, page])

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data) })
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bank-tx-history-all', qs],
    queryFn: () => api.get(`/bank-accounts/history/transactions?${qs}`).then(r => r.data),
  })

  const branches = branchData?.branches || []
  const accounts = bankData?.accounts || []
  const rows = data?.transactions || []

  const columns = [
    { header: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString('en-LK') },
    { header: 'Bank', accessor: (r) => r.bankName },
    { header: 'Account', accessor: (r) => r.accountNumber },
    { header: 'Type', accessor: (r) => r.type },
    { header: 'Module', accessor: (r) => r.moduleSource },
    { header: 'Description', accessor: (r) => r.description },
    { header: 'Amount', accessor: (r) => r.amount },
    { header: 'Balance After', accessor: (r) => r.balanceAfter },
    { header: 'By', accessor: (r) => r.performedBy },
  ]

  const f = (k) => (e) => { setPage(1); setFilters((s) => ({ ...s, [k]: e.target.value })) }

  return (
    <div className="erp-module space-y-6 animate-fade-in">
      <div className="page-header flex flex-wrap justify-between gap-4 items-start">
        <div>
          <Link to="/admin/bank-management" className="text-sm text-secondary flex items-center gap-1 mb-2"><FiArrowLeft /> Bank Management</Link>
          <h1 className="page-title">Bank Transaction History</h1>
          <p className="page-subtitle">Full ledger across all accounts · {data?.total || 0} records</p>
        </div>
        <ExportBar data={rows} columns={columns} title="Bank Transaction History" filters={filters} />
      </div>

      <div className="card card-body">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1"><FiFilter size={12} /> Filters</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div><label className="form-label text-xs">From</label><input type="date" className="form-input py-2 text-sm" value={filters.fromDate} onChange={f('fromDate')} /></div>
          <div><label className="form-label text-xs">To</label><input type="date" className="form-input py-2 text-sm" value={filters.toDate} onChange={f('toDate')} /></div>
          <div><label className="form-label text-xs">Branch</label>
            <select className="form-select py-2 text-sm" value={filters.branch} onChange={f('branch')}>
              <option value="">All</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select></div>
          <div><label className="form-label text-xs">Bank account</label>
            <select className="form-select py-2 text-sm" value={filters.bankAccount} onChange={f('bankAccount')}>
              <option value="">All</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.bankName} — {a.accountNumber}</option>)}
            </select></div>
          <div><label className="form-label text-xs">Module</label>
            <select className="form-select py-2 text-sm" value={filters.moduleSource} onChange={f('moduleSource')}>
              <option value="">All</option>
              {MODULE_SOURCES.map(m => <option key={m} value={m}>{m}</option>)}
            </select></div>
          <div><label className="form-label text-xs">Transaction type</label>
            <select className="form-select py-2 text-sm" value={filters.type} onChange={f('type')}>
              <option value="">All</option>
              {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className="form-label text-xs">Payment type</label>
            <select className="form-select py-2 text-sm" value={filters.paymentType} onChange={f('paymentType')}>
              <option value="">All</option>
              {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>
        </div>
        <button type="button" onClick={() => refetch()} className="btn-primary mt-4 text-sm">Apply filters</button>
      </div>

      {data?.summary && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="kpi-card kpi-green"><p className="text-xs text-slate-500">Total credits</p><p className="text-xl font-bold text-emerald-700">LKR {(data.summary.totalCredits || 0).toLocaleString()}</p></div>
          <div className="kpi-card kpi-red"><p className="text-xs text-slate-500">Total debits</p><p className="text-xl font-bold text-red-600">LKR {(data.summary.totalDebits || 0).toLocaleString()}</p></div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {columns.map(c => <th key={c.header} className="px-4 py-3 text-left font-semibold text-slate-600">{c.header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">No transactions</td></tr>
              ) : rows.map((r) => (
                <tr key={String(r._id)} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{new Date(r.date).toLocaleString('en-LK')}</td>
                  <td className="px-4 py-3 font-medium">{r.bankName}</td>
                  <td className="px-4 py-3 text-slate-500">{r.accountNumber}</td>
                  <td className="px-4 py-3"><span className={`badge text-[10px] ${['deposit', 'transfer_in'].includes(r.type) ? 'badge-green' : 'badge-red'}`}>{r.type}</span></td>
                  <td className="px-4 py-3 text-slate-500">{r.moduleSource}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{r.description}</td>
                  <td className={`px-4 py-3 font-semibold ${['deposit', 'transfer_in'].includes(r.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                    {['deposit', 'transfer_in'].includes(r.type) ? '+' : '-'} LKR {(r.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">LKR {(r.balanceAfter ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{r.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.hasMore && (
          <div className="p-4 border-t flex justify-center">
            <button type="button" className="btn-ghost" onClick={() => setPage(p => p + 1)}>Load more</button>
          </div>
        )}
      </div>
    </div>
  )
}
