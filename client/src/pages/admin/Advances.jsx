import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { lookupLoaders } from '../../lib/lookupApi'
import SearchableSelect from '../../components/ui/SearchableSelect'
import toast from 'react-hot-toast'
import ExportBar from '../../components/ui/ExportBar'
import { FiPlus, FiX, FiCheck, FiRefreshCw, FiCreditCard } from 'react-icons/fi'

const EMPTY = {
  employeeId: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  reason: '',
  repaymentType: 'lump_sum',
  installments: 1,
  paymentMethod: 'cash',
  bankAccount: '',
  paymentReference: '',
}
const REPAY_EMPTY = { amount: '', date: new Date().toISOString().split('T')[0], note: '' }

function isBankPaymentMethod(method) {
  const m = String(method || '').toLowerCase().replace(/[\s-]+/g, '_')
  return m === 'card' || m === 'bank_transfer' || m.includes('card') || (m.includes('bank') && m.includes('transfer'))
}

const PAYMENT_LABELS = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer' }

export default function AdminAdvances() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [empSummary, setEmpSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [repayTarget, setRepayTarget] = useState(null)
  const [repayForm, setRepayForm] = useState(REPAY_EMPTY)
  const [statusFilter, setStatusFilter] = useState('')
  const [empFilter, setEmpFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  const { data: advData, isLoading } = useQuery({
    queryKey: ['advances', statusFilter, empFilter, branchFilter],
    queryFn: () => api.get(`/advances?${statusFilter ? `status=${statusFilter}&` : ''}${empFilter ? `employeeId=${empFilter}&` : ''}${branchFilter ? `branch=${branchFilter}` : ''}`).then(r => r.data),
  })

  const advances = advData?.advances || []
  const totalOutstanding = advances.filter(a => a.status === 'active').reduce((s, a) => s + (a.outstandingBalance || 0), 0)

  const loadEmployeeSummary = async (empId) => {
    if (!empId) { setEmpSummary(null); return }
    setLoadingSummary(true)
    try {
      const { data } = await api.get(`/advances/employee-summary/${empId}`)
      setEmpSummary(data.summary)
    } catch {
      setEmpSummary(null)
    }
    setLoadingSummary(false)
  }

  const createMut = useMutation({
    mutationFn: p => api.post('/advances', p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advances'] })
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      toast.success('Advance recorded')
      setShowCreate(false)
      setForm(EMPTY)
      setEmpSummary(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const repayMut = useMutation({
    mutationFn: ({ id, ...p }) => api.post(`/advances/${id}/repay`, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); toast.success('Repayment recorded'); setRepayTarget(null); setRepayForm(REPAY_EMPTY) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/advances/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); qc.invalidateQueries({ queryKey: ['bank-accounts'] }); toast.success('Deleted') },
  })

  const exportCols = [
    { header: 'Employee', accessor: r => r.employee?.userId?.name || '—' },
    { header: 'Amount', accessor: 'amount' },
    { header: 'Payment', accessor: r => PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod },
    { header: 'Date', accessor: r => new Date(r.date).toLocaleDateString('en-LK') },
    { header: 'Repayment', accessor: 'repaymentType' },
    { header: 'Recovered', accessor: 'totalRecovered' },
    { header: 'Outstanding', accessor: 'outstandingBalance' },
    { header: 'Status', accessor: 'status' },
  ]

  const submitCreate = () => {
    if (!form.employeeId || !form.amount) { toast.error('Employee and amount required'); return }
    if (isBankPaymentMethod(form.paymentMethod) && !form.bankAccount) {
      toast.error('Select a bank account for card or bank transfer')
      return
    }
    createMut.mutate(form)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Advance Payments</h1>
          <p className="page-subtitle">{advances.filter(a => a.status === 'active').length} active · Outstanding: <strong className="text-red-600">LKR {totalOutstanding.toLocaleString()}</strong></p>
        </div>
        <div className="flex gap-2">
          <ExportBar data={advances} columns={exportCols} title="Advance Payments Report" />
          <button type="button" onClick={() => { setForm(EMPTY); setEmpSummary(null); setShowCreate(true) }} className="btn-primary gap-2"><FiPlus size={14} />New Advance</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card kpi-red"><p className="text-xs text-slate-500 uppercase font-medium">Outstanding</p><p className="text-xl font-bold text-red-700">LKR {totalOutstanding.toLocaleString()}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase font-medium">Total Recovered</p><p className="text-xl font-bold text-emerald-700">LKR {advances.reduce((s, a) => s + (a.totalRecovered || 0), 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase font-medium">Active Cases</p><p className="text-xl font-bold text-blue-700">{advances.filter(a => a.status === 'active').length}</p></div>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <select className="form-select py-2 text-sm w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="cleared">Cleared</option>
        </select>
        <div className="w-64">
          <label className="form-label text-xs mb-1">Employee</label>
          <SearchableSelect
            value={empFilter}
            onChange={(v) => setEmpFilter(v)}
            loadOptions={lookupLoaders.employeesAll({ branch: branchFilter })}
            placeholder="All employees"
            clearable
          />
        </div>
        <div className="w-48">
          <label className="form-label text-xs mb-1">Branch</label>
          <SearchableSelect
            value={branchFilter}
            onChange={(v) => setBranchFilter(v)}
            loadOptions={lookupLoaders.branches()}
            placeholder="All branches"
            clearable
          />
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Employee</th><th>Amount</th><th>Payment</th><th>Date</th><th>Repayment</th><th>Recovered</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={9} className="text-center py-10"><div className="w-7 h-7 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" /></td></tr>
              : advances.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-slate-400">No advance records.</td></tr>
                : advances.map(a => (
                  <tr key={a._id}>
                    <td>
                      <p className="font-medium text-slate-800">{a.employee?.userId?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{a.employee?.employeeNo}</p>
                    </td>
                    <td className="font-medium">LKR {(a.amount || 0).toLocaleString()}</td>
                    <td className="text-sm capitalize">{PAYMENT_LABELS[a.paymentMethod] || a.paymentMethod || '—'}
                      {a.bankAccount?.bankName && <span className="block text-xs text-slate-400">{a.bankAccount.bankName}</span>}
                    </td>
                    <td className="text-sm text-slate-600">{new Date(a.date).toLocaleDateString('en-LK')}</td>
                    <td className="text-sm text-slate-500 capitalize">{a.repaymentType?.replace('_', ' ')}</td>
                    <td className="text-emerald-700 font-medium">LKR {(a.totalRecovered || 0).toLocaleString()}</td>
                    <td className={`font-bold ${a.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>LKR {(a.outstandingBalance || 0).toLocaleString()}</td>
                    <td><span className={`badge ${a.status === 'cleared' ? 'badge-green' : 'badge-yellow'}`}>{a.status}</span></td>
                    <td>
                      <div className="flex gap-1">
                        {a.status === 'active' && (
                          <button type="button" onClick={() => { setRepayTarget(a); setRepayForm(REPAY_EMPTY) }} className="p-1.5 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-lg" title="Repay"><FiRefreshCw size={13} /></button>
                        )}
                        <button type="button" onClick={() => { if (window.confirm('Delete this advance? Bank payments will be reversed.')) deleteMut.mutate(a._id) }} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg"><FiX size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {showCreate && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-primary font-heading">New Advance Payment</h3>
              <button type="button" onClick={() => { setShowCreate(false); setEmpSummary(null) }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Employee *</label>
                <SearchableSelect
                  value={form.employeeId}
                  onChange={(v) => { setForm(s => ({ ...s, employeeId: v })); loadEmployeeSummary(v) }}
                  loadOptions={lookupLoaders.employees({ branch: branchFilter })}
                  placeholder="Search employee…"
                />
              </div>

              {loadingSummary && <p className="text-sm text-slate-400 text-center py-2">Loading balance info…</p>}
              {empSummary && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Advance balance — {empSummary.name}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                      <p className="text-xs text-slate-500">Previous advance total</p>
                      <p className="text-lg font-bold text-slate-800">LKR {empSummary.previousAdvanceTotal?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">Lifetime disbursed</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-orange-100">
                      <p className="text-xs text-slate-500">Remaining balance</p>
                      <p className="text-lg font-bold text-orange-600">LKR {empSummary.remainingBalance?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{empSummary.activeAdvancesCount} active case(s)</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <p className="text-xs text-slate-500">Available advance balance</p>
                      <p className="text-lg font-bold text-emerald-700">LKR {empSummary.availableAdvanceBalance?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">Recorded on employee</p>
                    </div>
                  </div>
                  {empSummary.activeAdvances?.length > 0 && (
                    <div className="text-xs space-y-1 pt-2 border-t border-slate-200">
                      {empSummary.activeAdvances.map(a => (
                        <div key={a._id} className="flex justify-between text-slate-600">
                          <span>{a.reason || 'Advance'} · {new Date(a.date).toLocaleDateString('en-LK')}</span>
                          <span className="font-medium text-red-500">LKR {a.outstandingBalance?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Amount (LKR) *</label>
                  <input type="number" className="form-input" value={form.amount} onChange={e => setForm(s => ({ ...s, amount: e.target.value }))} /></div>
                <div><label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm(s => ({ ...s, date: e.target.value }))} /></div>
              </div>

              <div>
                <label className="form-label">Payment method *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'card', 'bank_transfer'].map(m => (
                    <label key={m} className={`cursor-pointer p-3 rounded-xl border-2 text-center text-sm transition-all ${form.paymentMethod === m ? 'border-secondary bg-blue-50 font-semibold' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" className="hidden" value={m} checked={form.paymentMethod === m} onChange={() => setForm(s => ({ ...s, paymentMethod: m, bankAccount: m === 'cash' ? '' : s.bankAccount }))} />
                      {m === 'cash' && '💵 '}{m === 'card' && <FiCreditCard className="inline mr-1" size={14} />}{PAYMENT_LABELS[m]}
                    </label>
                  ))}
                </div>
              </div>

              {isBankPaymentMethod(form.paymentMethod) && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600">Bank account (required) — amount will be deducted</p>
                  <div>
                    <label className="form-label">Bank account *</label>
                    <SearchableSelect
                      value={form.bankAccount}
                      onChange={(v) => setForm(s => ({ ...s, bankAccount: v }))}
                      loadOptions={lookupLoaders.banks()}
                      placeholder="Search bank account…"
                    />
                  </div>
                  <div>
                    <label className="form-label">Reference (optional)</label>
                    <input className="form-input" value={form.paymentReference} onChange={e => setForm(s => ({ ...s, paymentReference: e.target.value }))} placeholder="Transfer ref / receipt no." />
                  </div>
                </div>
              )}

              <div><label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={e => setForm(s => ({ ...s, reason: e.target.value }))} placeholder="Optional" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Repayment type</label>
                  <select className="form-select" value={form.repaymentType} onChange={e => setForm(s => ({ ...s, repaymentType: e.target.value }))}>
                    <option value="lump_sum">Lump sum</option>
                    <option value="installments">Installments</option>
                  </select></div>
                {form.repaymentType === 'installments' && (
                  <div><label className="form-label">Months</label>
                    <input type="number" className="form-input" min={1} value={form.installments} onChange={e => setForm(s => ({ ...s, installments: Number(e.target.value) }))} /></div>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t sticky bottom-0 bg-white">
              <button type="button" onClick={() => { setShowCreate(false); setEmpSummary(null) }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="button" onClick={submitCreate} disabled={createMut.isPending} className="btn-primary flex-1 justify-center gap-2">
                {createMut.isPending ? <span className="spinner" /> : <FiCheck size={14} />} Record Advance
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {repayTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-primary font-heading">Record Repayment</h3>
              <button type="button" onClick={() => setRepayTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <p className="font-medium">{repayTarget.employee?.userId?.name}</p>
                <p className="text-slate-500">Outstanding: <strong className="text-red-600">LKR {(repayTarget.outstandingBalance || 0).toLocaleString()}</strong></p>
              </div>
              <div><label className="form-label">Amount *</label>
                <input type="number" className="form-input" value={repayForm.amount} onChange={e => setRepayForm(s => ({ ...s, amount: e.target.value }))} /></div>
              <div><label className="form-label">Date</label>
                <input type="date" className="form-input" value={repayForm.date} onChange={e => setRepayForm(s => ({ ...s, date: e.target.value }))} /></div>
              <div><label className="form-label">Note</label>
                <input className="form-input" value={repayForm.note} onChange={e => setRepayForm(s => ({ ...s, note: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button type="button" onClick={() => setRepayTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="button" onClick={() => { if (!repayForm.amount) { toast.error('Amount required'); return } repayMut.mutate({ id: repayTarget._id, ...repayForm }) }} disabled={repayMut.isPending} className="btn-primary flex-1 justify-center">Record</button>
            </div>
          </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
