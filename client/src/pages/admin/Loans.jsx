import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { lookupLoaders } from '../../lib/lookupApi'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { assignableEmployeesUrl } from '../../lib/employeeApi'
import toast from 'react-hot-toast'
import ExportBar from '../../components/ui/ExportBar'
import { FiPlus, FiX, FiCheck, FiRefreshCw, FiEdit2, FiAlertCircle, FiDollarSign, FiCalendar } from 'react-icons/fi'

const EMPTY = { employeeId: '', totalAmount: '', monthlyInstallment: '', repaymentMonths: '', startDate: new Date().toISOString().split('T')[0], reason: '', deductionType: 'salary', taxRate: 0 }
const PAY_EMPTY = { amount: '', date: new Date().toISOString().split('T')[0], note: '', method: 'salary_deduction', bankAccount: '' }

export default function AdminLoans() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [payTarget, setPayTarget] = useState(null)
  const [payForm, setPayForm] = useState(PAY_EMPTY)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [empSummary, setEmpSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (branchFilter) params.set('branch', branchFilter)
  if (dateFrom) params.set('from', dateFrom)
  if (dateTo) params.set('to', dateTo)

  const { data: loanData, isLoading } = useQuery({
    queryKey: ['loans', statusFilter, branchFilter, dateFrom, dateTo],
    queryFn: () => api.get(`/loans?${params.toString()}`).then(r => r.data),
  })
  const { data: empData } = useQuery({ queryKey: ['employees-mini', branchFilter], queryFn: () => api.get(assignableEmployeesUrl(branchFilter ? { branch: branchFilter } : {})).then(r => r.data) })
  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data) })
  const bankAccounts = bankData?.accounts || []

  const loans = loanData?.loans || []
  const employees = empData?.employees || []
  const totalOutstanding = loans.filter(l => l.status === 'active').reduce((s, l) => s + (l.outstandingBalance || 0), 0)

  const loadEmployeeSummary = async (empId) => {
    if (!empId) { setEmpSummary(null); return }
    setLoadingSummary(true)
    try {
      const { data } = await api.get(`/loans/employee-summary/${empId}`)
      setEmpSummary(data.summary)
    } catch { setEmpSummary(null) }
    setLoadingSummary(false)
  }

  const createMut = useMutation({
    mutationFn: p => api.post('/loans', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan recorded'); setShowCreate(false); setForm(EMPTY); setEmpSummary(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, ...p }) => api.put(`/loans/${id}`, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan updated'); setEditTarget(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const payMut = useMutation({
    mutationFn: ({ id, ...p }) => api.post(`/loans/${id}/pay`, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['bank-accounts'] }); toast.success('Payment recorded'); setPayTarget(null); setPayForm(PAY_EMPTY) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/loans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Deleted'); setDeleteId(null); setDeletePassword('') },
    onError: e => toast.error(e.response?.data?.message || 'Delete failed'),
  })

  const confirmDelete = async () => {
    if (!deletePassword) { toast.error('Password required'); return }
    setVerifying(true)
    try {
      await api.post('/auth/verify-password', { password: deletePassword })
      deleteMut.mutate(deleteId)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Invalid password')
    }
    setVerifying(false)
  }

  const calcInstallments = () => {
    if (form.repaymentMonths) return Number(form.repaymentMonths)
    if (form.totalAmount && form.monthlyInstallment) {
      const principal = Number(form.totalAmount)
      const interest = principal * (Number(form.taxRate || 0) / 100)
      return Math.ceil((principal + interest) / Number(form.monthlyInstallment))
    }
    return 0
  }

  const calcTotalWithInterest = () => {
    const p = Number(form.totalAmount || 0)
    const r = Number(form.taxRate || 0)
    return p + Math.round(p * (r / 100))
  }

  const updateLoanFields = (updates) => {
    setForm(s => {
      const next = { ...s, ...updates }
      if (updates.repaymentMonths || (updates.totalAmount !== undefined && next.repaymentMonths) || (updates.taxRate !== undefined && next.repaymentMonths)) {
        const total = Number(next.totalAmount || 0)
        const interest = total * (Number(next.taxRate || 0) / 100)
        const months = Number(next.repaymentMonths || 0)
        if (months > 0) {
          next.monthlyInstallment = Math.ceil((total + interest) / months)
        }
      }
      return next
    })
  }

  const exportCols = [
    { header: 'Employee', accessor: r => r.employee?.userId?.name || '—' },
    { header: 'Total Amount', accessor: 'totalAmount' },
    { header: 'Monthly', accessor: 'monthlyInstallment' },
    { header: 'Deduction Type', accessor: 'deductionType' },
    { header: 'Total Installments', accessor: 'totalInstallments' },
    { header: 'Paid', accessor: 'installmentsPaid' },
    { header: 'Outstanding', accessor: 'outstandingBalance' },
    { header: 'Status', accessor: 'status' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">{loans.filter(l => l.status === 'active').length} active · Outstanding: <strong className="text-red-600">LKR {totalOutstanding.toLocaleString()}</strong></p>
        </div>
        <div className="flex gap-2">
          <ExportBar data={loans} columns={exportCols} title="Loans Report" />
          <button onClick={() => { setForm(EMPTY); setEmpSummary(null); setShowCreate(true) }} className="btn-primary gap-2"><FiPlus size={14} />New Loan</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card kpi-red"><p className="text-xs text-slate-500 uppercase font-medium">Outstanding</p><p className="text-xl font-bold text-red-700">LKR {totalOutstanding.toLocaleString()}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase font-medium">Total Paid</p><p className="text-xl font-bold text-emerald-700">LKR {loans.reduce((s, l) => s + (l.totalPaid || 0), 0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase font-medium">Active Cases</p><p className="text-xl font-bold text-blue-700">{loans.filter(l => l.status === 'active').length}</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="form-select py-2 text-sm w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="cleared">Cleared</option>
        </select>
        <select className="form-select py-2 text-sm w-auto" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <FiCalendar size={14} className="text-slate-400" />
          <input type="date" className="form-input py-1.5 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" className="form-input py-1.5 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Employee</th><th>Total</th><th>Monthly</th><th>Type</th><th>Tax</th><th>Progress</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={9} className="text-center py-10"><div className="w-7 h-7 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" /></td></tr>
              : loans.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-slate-400">No loan records.</td></tr>
                : loans.map(l => (
                  <tr key={l._id}>
                    <td>
                      <p className="font-medium text-slate-800">{l.employee?.userId?.name || '—'}</p>
                      <p className="text-xs text-slate-400">{l.employee?.employeeNo}</p>
                    </td>
                    <td className="font-medium">LKR {(l.totalAmount || 0).toLocaleString()}</td>
                    <td className="text-sm text-slate-600">LKR {(l.monthlyInstallment || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${l.deductionType === 'salary' ? 'badge-blue' : 'badge-purple'} capitalize`}>
                        {l.deductionType === 'salary' ? 'Salary Deduct' : 'Separate'}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{l.taxRate > 0 ? `${l.taxRate}%` : '—'}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (l.totalPaid || 0) / (l.totalAmount || 1) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600">{Math.round((l.totalPaid || 0) / (l.totalAmount || 1) * 100)}%</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{l.installmentsPaid || 0}/{l.totalInstallments || 0} Paid</span>
                      </div>
                    </td>
                    <td className={`font-bold ${l.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>LKR {(l.outstandingBalance || 0).toLocaleString()}</td>
                    <td><span className={`badge ${l.status === 'cleared' ? 'badge-green' : 'badge-yellow'}`}>{l.status}</span></td>
                    <td>
                      <div className="flex gap-1">
                        {l.status === 'active' && (
                          <>
                            <button onClick={() => { setEditTarget(l); setForm({ monthlyInstallment: l.monthlyInstallment, reason: l.reason, deductionType: l.deductionType || 'salary', taxRate: l.taxRate || 0, startDate: l.startDate?.split('T')[0] || '' }) }}
                              title="Edit" className="p-1.5 hover:bg-blue-50 text-slate-300 hover:text-blue-500 rounded-lg"><FiEdit2 size={13} /></button>
                            <button onClick={() => { setPayTarget(l); setPayForm({ ...PAY_EMPTY, amount: l.monthlyInstallment }) }} title="Record Payment"
                              className="p-1.5 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-lg"><FiRefreshCw size={13} /></button>
                          </>
                        )}
                        <button onClick={() => setDeleteId(l._id)}
                          className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg"><FiX size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-primary font-heading">New Loan</h3>
              <button onClick={() => { setShowCreate(false); setEmpSummary(null) }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-xs">Filter by Branch</label>
                  <select className="form-select py-1.5 text-xs" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-xs">Select Employee *</label>
                  <SearchableSelect
                    value={form.employeeId}
                    onChange={(v) => { setForm(s => ({ ...s, employeeId: v })); loadEmployeeSummary(v) }}
                    loadOptions={lookupLoaders.employees({ branch: branchFilter })}
                    placeholder="Search employee…"
                  />
                </div>
              </div>

              {/* Employee Financial Summary */}
              {loadingSummary && <div className="text-center py-4 text-slate-400 text-sm">Loading employee info…</div>}
              {empSummary && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">📋 Employee Financial Summary</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <span className="text-slate-500">Basic Salary:</span><span className="font-semibold text-slate-800">LKR {empSummary.basicSalary?.toLocaleString()}</span>
                    <span className="text-slate-500">Allowances:</span><span className="font-medium text-slate-700">LKR {empSummary.allowances?.toLocaleString()}</span>
                    <span className="text-slate-500">Advance Balance:</span><span className={`font-medium ${empSummary.totalAdvanceBalance > 0 ? 'text-orange-600' : 'text-slate-700'}`}>LKR {empSummary.totalAdvanceBalance?.toLocaleString()}</span>
                    <span className="text-slate-500">Active Loans:</span><span className={`font-medium ${empSummary.activeLoansCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{empSummary.activeLoansCount} loan(s)</span>
                    <span className="text-slate-500">Loan Outstanding:</span><span className={`font-semibold ${empSummary.totalLoanBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>LKR {empSummary.totalLoanBalance?.toLocaleString()}</span>
                    <span className="text-slate-500">Monthly Deductions:</span><span className="font-medium text-red-500">LKR {empSummary.totalMonthlyLoanDeductions?.toLocaleString()}</span>
                  </div>
                  {empSummary.activeLoans?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><FiAlertCircle size={12} className="text-orange-500" /> Active Loans:</p>
                      {empSummary.activeLoans.map(al => (
                        <div key={al._id} className="text-xs text-slate-600 flex justify-between">
                          <span>{al.reason || 'Loan'}</span>
                          <span className="text-red-500 font-medium">LKR {al.outstandingBalance?.toLocaleString()} remaining</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Principal Amount (LKR) *</label>
                  <input type="number" className="form-input" value={form.totalAmount} onChange={e => updateLoanFields({ totalAmount: e.target.value })} /></div>
                <div><label className="form-label">Repayment Months</label>
                  <select className="form-select" value={form.repaymentMonths} onChange={e => updateLoanFields({ repaymentMonths: e.target.value })}>
                    <option value="">Manual / No fixed term</option>
                    {[3,6,12,18,24,36,48,60].map(m => <option key={m} value={m}>{m} Months</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tax / Interest Rate (%)</label>
                  <input type="number" className="form-input" min="0" max="50" value={form.taxRate} onChange={e => updateLoanFields({ taxRate: e.target.value })} placeholder="0" /></div>
                <div><label className="form-label">Monthly Installment (LKR) *</label>
                  <input type="number" className="form-input" value={form.monthlyInstallment} onChange={e => setForm(s => ({ ...s, monthlyInstallment: e.target.value }))} /></div>
              </div>

              {(form.totalAmount > 0 || form.taxRate > 0) && (
                <div className="bg-emerald-50 text-emerald-800 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span>Principal:</span><span>LKR {Number(form.totalAmount||0).toLocaleString()}</span></div>
                  <div className="flex justify-between text-red-600"><span>Interest ({form.taxRate}%):</span><span>+ LKR {Math.round(Number(form.totalAmount||0) * (Number(form.taxRate||0)/100)).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold border-t border-emerald-200 pt-1 mt-1"><span>Total Payable:</span><span>LKR {calcTotalWithInterest().toLocaleString()}</span></div>
                  {calcInstallments() > 0 && <p className="text-center pt-2 font-medium">Clearance in ~{calcInstallments()} months</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={form.startDate} onChange={e => setForm(s => ({ ...s, startDate: e.target.value }))} /></div>
                <div />
              </div>

              <div>
                <label className="form-label">Deduction Type</label>
                <div className="flex gap-3">
                  {[{ v: 'salary', label: '💼 Deduct from Salary', desc: 'Automatically deducted in payroll' }, { v: 'separate', label: '💰 Separate Repayment', desc: 'Employee repays independently' }].map(opt => (
                    <label key={opt.v} className={`flex-1 cursor-pointer p-3 rounded-xl border-2 transition-all ${form.deductionType === opt.v ? 'border-secondary bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" className="hidden" value={opt.v} checked={form.deductionType === opt.v} onChange={e => setForm(s => ({ ...s, deductionType: e.target.value }))} />
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div><label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={e => setForm(s => ({ ...s, reason: e.target.value }))} placeholder="Optional" /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => { setShowCreate(false); setEmpSummary(null) }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={() => { if (!form.employeeId || !form.totalAmount || !form.monthlyInstallment) { toast.error('Required fields missing'); return } createMut.mutate(form) }}
                disabled={createMut.isPending} className="btn-primary flex-1 justify-center gap-2">
                {createMut.isPending ? <span className="spinner" /> : <FiCheck size={14} />} Record Loan
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {/* Edit Modal */}
      {editTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-primary font-heading">Edit Loan — {editTarget.employee?.userId?.name}</h3>
              <button onClick={() => setEditTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-slate-700">Total Amount: LKR {editTarget.totalAmount?.toLocaleString()}</p>
                <p className="text-slate-500 text-xs mt-0.5">Outstanding: LKR {editTarget.outstandingBalance?.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label text-xs">Monthly Installment</label>
                  <input type="number" className="form-input" value={form.monthlyInstallment} onChange={e => setForm(s => ({ ...s, monthlyInstallment: e.target.value }))} /></div>
                <div><label className="form-label text-xs">Repayment Months</label>
                  <input type="number" className="form-input" value={form.repaymentMonths} onChange={e => setForm(s => ({ ...s, repaymentMonths: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label text-xs">Interest Rate (%)</label>
                  <input type="number" className="form-input" value={form.taxRate} onChange={e => setForm(s => ({ ...s, taxRate: e.target.value }))} /></div>
                <div><label className="form-label text-xs">Start Date</label>
                  <input type="date" className="form-input" value={form.startDate} onChange={e => setForm(s => ({ ...s, startDate: e.target.value }))} /></div>
              </div>
              <div>
                <label className="form-label">Deduction Type</label>
                <select className="form-select" value={form.deductionType} onChange={e => setForm(s => ({ ...s, deductionType: e.target.value }))}>
                  <option value="salary">Deduct from Salary</option>
                  <option value="separate">Separate Repayment</option>
                </select>
              </div>
              <div><label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={e => setForm(s => ({ ...s, reason: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => setEditTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={() => updateMut.mutate({ id: editTarget._id, ...form })} disabled={updateMut.isPending} className="btn-primary flex-1 justify-center gap-2">
                {updateMut.isPending ? <span className="spinner" /> : <FiCheck size={14} />} Save Changes
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {/* Payment Modal */}
      {payTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-primary font-heading">Record Loan Payment</h3>
              <button onClick={() => setPayTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2 border border-slate-200">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <p className="font-bold text-slate-800">{payTarget.employee?.userId?.name}</p>
                  <span className={`badge ${payTarget.deductionType === 'salary' ? 'badge-blue' : 'badge-purple'} text-[10px]`}>
                    {payTarget.deductionType === 'salary' ? 'Salary Deduction' : 'Separate'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400">Total Principal</p>
                    <p className="font-semibold text-slate-700">LKR {payTarget.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400">Repayment Period</p>
                    <p className="font-semibold text-slate-700">{payTarget.repaymentMonths || payTarget.totalInstallments || '—'} Months</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400">Interest Rate</p>
                    <p className="font-semibold text-slate-700">{payTarget.taxRate || 0}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400">Monthly Installment</p>
                    <p className="font-semibold text-slate-700">LKR {payTarget.monthlyInstallment?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                  <p className="text-slate-500 font-medium">Outstanding Balance</p>
                  <p className="text-lg font-bold text-red-600">LKR {(payTarget.outstandingBalance || 0).toLocaleString()}</p>
                </div>
              </div>
              <div><label className="form-label">Amount *</label>
                <input type="number" className="form-input" value={payForm.amount} onChange={e => setPayForm(s => ({ ...s, amount: e.target.value }))} /></div>
              <div><label className="form-label">Payment Method</label>
                <select className="form-select" value={payForm.method} onChange={e => setPayForm(s => ({ ...s, method: e.target.value, bankAccount: ['bank_transfer', 'card', 'online_transfer', 'payhere'].includes(e.target.value) ? s.bankAccount : '' }))}>
                  <option value="salary_deduction">Salary Deduction</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="online_transfer">Online Transfer</option>
                  <option value="payhere">PayHere</option>
                </select>
              </div>
              {['bank_transfer', 'card', 'online_transfer', 'payhere'].includes(payForm.method) && (
                <div>
                  <label className="form-label">Company bank account (deposit to)</label>
                  <select className="form-select" value={payForm.bankAccount || ''} onChange={e => setPayForm(s => ({ ...s, bankAccount: e.target.value }))}>
                    <option value="">Select account…</option>
                    {bankAccounts.map(b => <option key={b._id} value={b._id}>{b.bankName} ({b.accountNumber})</option>)}
                  </select>
                </div>
              )}
              <div><label className="form-label">Date</label>
                <input type="date" className="form-input" value={payForm.date} onChange={e => setPayForm(s => ({ ...s, date: e.target.value }))} /></div>
              <div><label className="form-label">Note</label>
                <input className="form-input" value={payForm.note} onChange={e => setPayForm(s => ({ ...s, note: e.target.value }))} placeholder="e.g. From May payroll" /></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => setPayTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={() => {
                if (!payForm.amount || Number(payForm.amount) <= 0) { toast.error('Valid amount required'); return }
                const payload = { id: payTarget._id, amount: payForm.amount, date: payForm.date, note: payForm.note, method: payForm.method }
                if (['bank_transfer', 'card', 'online_transfer', 'payhere'].includes(payForm.method) && payForm.bankAccount) {
                  payload.bankAccount = payForm.bankAccount
                }
                payMut.mutate(payload)
              }}
                disabled={payMut.isPending} className="btn-primary flex-1 justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                {payMut.isPending ? <span className="spinner" /> : <FiCheck size={14} />} Record Payment
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
      {/* Delete Confirmation Modal */}
      {deleteId && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto"><FiAlertCircle size={24} /></div>
              <h3 className="font-bold text-lg text-slate-800">Confirm Deletion</h3>
              <p className="text-sm text-slate-500">This action cannot be undone. Please enter your administrator password to proceed.</p>
            </div>
            <div>
              <input type="password" placeholder="Enter your password" disabled={verifying} className="form-input" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmDelete()} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setDeleteId(null); setDeletePassword('') }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={confirmDelete} disabled={verifying || !deletePassword} className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 border-red-600">
                {verifying || deleteMut.isPending ? <span className="spinner" /> : 'Confirm Delete'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
