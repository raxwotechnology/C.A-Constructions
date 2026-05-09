import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import ExportBar from '../../components/ui/ExportBar'
import { FiPlus, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi'

const EMPTY = { employeeId:'', totalAmount:'', monthlyInstallment:'', startDate: new Date().toISOString().split('T')[0], reason:'' }
const PAY_EMPTY = { amount:'', date: new Date().toISOString().split('T')[0], note:'' }

export default function AdminLoans() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [payTarget, setPayTarget] = useState(null)
  const [payForm, setPayForm] = useState(PAY_EMPTY)
  const [statusFilter, setStatusFilter] = useState('')

  const [branchFilter, setBranchFilter] = useState('')

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const { data: loanData, isLoading } = useQuery({
    queryKey: ['loans', statusFilter, branchFilter],
    queryFn: () => api.get(`/loans?${statusFilter?`status=${statusFilter}&`:''}${branchFilter?`branch=${branchFilter}`:''}`).then(r=>r.data),
  })
  const { data: empData } = useQuery({ queryKey: ['employees-mini', branchFilter], queryFn: () => api.get(`/employees?${branchFilter?`branch=${branchFilter}`:''}`).then(r=>r.data) })

  const loans = loanData?.loans || []
  const employees = empData?.employees || []
  const totalOutstanding = loans.filter(l=>l.status==='active').reduce((s,l)=>s+(l.outstandingBalance||0),0)

  const createMut = useMutation({
    mutationFn: p => api.post('/loans', p),
    onSuccess: () => { qc.invalidateQueries({queryKey:['loans']}); toast.success('Loan recorded'); setShowCreate(false); setForm(EMPTY) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const payMut = useMutation({
    mutationFn: ({id,...p}) => api.post(`/loans/${id}/pay`, p),
    onSuccess: () => { qc.invalidateQueries({queryKey:['loans']}); toast.success('Payment recorded'); setPayTarget(null); setPayForm(PAY_EMPTY) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/loans/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['loans']}); toast.success('Deleted') },
  })

  const exportCols = [
    { header:'Employee', accessor: r=>r.employee?.userId?.name||'—' },
    { header:'Total Amount', accessor:'totalAmount' },
    { header:'Monthly', accessor:'monthlyInstallment' },
    { header:'Total Installments', accessor:'totalInstallments' },
    { header:'Paid', accessor:'installmentsPaid' },
    { header:'Outstanding', accessor:'outstandingBalance' },
    { header:'Status', accessor:'status' },
  ]

  const calcInstallments = () => {
    if (form.totalAmount && form.monthlyInstallment) return Math.ceil(Number(form.totalAmount)/Number(form.monthlyInstallment))
    return 0
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">{loans.filter(l=>l.status==='active').length} active · Outstanding: <strong className="text-red-600">LKR {totalOutstanding.toLocaleString()}</strong></p>
        </div>
        <div className="flex gap-2">
          <ExportBar data={loans} columns={exportCols} title="Loans Report" />
          <button onClick={()=>{setForm(EMPTY);setShowCreate(true)}} className="btn-primary gap-2"><FiPlus size={14}/>New Loan</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card kpi-red"><p className="text-xs text-slate-500 uppercase font-medium">Outstanding</p><p className="text-xl font-bold text-red-700">LKR {totalOutstanding.toLocaleString()}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase font-medium">Total Paid</p><p className="text-xl font-bold text-emerald-700">LKR {loans.reduce((s,l)=>s+(l.totalPaid||0),0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase font-medium">Active Cases</p><p className="text-xl font-bold text-blue-700">{loans.filter(l=>l.status==='active').length}</p></div>
      </div>

      <div className="flex gap-3">
        <select className="form-select py-2 text-sm w-auto" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="cleared">Cleared</option>
        </select>
        <select className="form-select py-2 text-sm w-auto" value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Employee</th><th>Total</th><th>Monthly</th><th>Progress</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="text-center py-10"><div className="w-7 h-7 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></td></tr>
            : loans.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-slate-400">No loan records.</td></tr>
            : loans.map(l=>(
              <tr key={l._id}>
                <td>
                  <p className="font-medium text-slate-800">{l.employee?.userId?.name||'—'}</p>
                  <p className="text-xs text-slate-400">{l.employee?.employeeNo}</p>
                </td>
                <td className="font-medium">LKR {(l.totalAmount||0).toLocaleString()}</td>
                <td className="text-sm text-slate-600">LKR {(l.monthlyInstallment||0).toLocaleString()}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{width:`${Math.min(100,(l.totalPaid||0)/(l.totalAmount||1)*100)}%`}}/>
                    </div>
                    <span className="text-xs text-slate-500">{l.installmentsPaid||0}/{l.totalInstallments||0}</span>
                  </div>
                </td>
                <td className={`font-bold ${l.outstandingBalance>0?'text-red-600':'text-emerald-600'}`}>LKR {(l.outstandingBalance||0).toLocaleString()}</td>
                <td><span className={`badge ${l.status==='cleared'?'badge-green':'badge-yellow'}`}>{l.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {l.status==='active' && (
                      <button onClick={()=>{setPayTarget(l);setPayForm({...PAY_EMPTY,amount:l.monthlyInstallment})}} title="Record Payment"
                        className="p-1.5 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-lg"><FiRefreshCw size={13}/></button>
                    )}
                    <button onClick={()=>{if(window.confirm('Delete?'))deleteMut.mutate(l._id)}}
                      className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg"><FiX size={13}/></button>
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
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-primary font-heading">New Loan</h3>
              <button onClick={()=>setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="form-label">Employee *</label>
                <select className="form-select" value={form.employeeId} onChange={e=>setForm(s=>({...s,employeeId:e.target.value}))}>
                  <option value="">Select employee</option>
                  {employees.map(e=><option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeNo})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Total Amount (LKR) *</label>
                  <input type="number" className="form-input" value={form.totalAmount} onChange={e=>setForm(s=>({...s,totalAmount:e.target.value}))}/></div>
                <div><label className="form-label">Monthly Installment *</label>
                  <input type="number" className="form-input" value={form.monthlyInstallment} onChange={e=>setForm(s=>({...s,monthlyInstallment:e.target.value}))}/></div>
              </div>
              {calcInstallments()>0 && (
                <div className="bg-blue-50 text-blue-700 rounded-xl p-3 text-sm">
                  Estimated <strong>{calcInstallments()} installments</strong> to clear this loan.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={form.startDate} onChange={e=>setForm(s=>({...s,startDate:e.target.value}))}/></div>
              </div>
              <div><label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={e=>setForm(s=>({...s,reason:e.target.value}))} placeholder="Optional"/></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={()=>setShowCreate(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={()=>{if(!form.employeeId||!form.totalAmount||!form.monthlyInstallment){toast.error('Required fields missing');return}createMut.mutate(form)}}
                disabled={createMut.isPending} className="btn-primary flex-1 justify-center gap-2">
                {createMut.isPending?<span className="spinner"/>:<FiCheck size={14}/>} Record Loan
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {/* Payment Modal */}
      {payTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-primary font-heading">Record Loan Payment</h3>
              <button onClick={()=>setPayTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
                <p className="font-medium">{payTarget.employee?.userId?.name}</p>
                <p className="text-slate-500">Outstanding: <strong className="text-red-600">LKR {(payTarget.outstandingBalance||0).toLocaleString()}</strong></p>
                <p className="text-slate-500">Installment: LKR {(payTarget.monthlyInstallment||0).toLocaleString()}</p>
              </div>
              <div><label className="form-label">Amount *</label>
                <input type="number" className="form-input" value={payForm.amount} onChange={e=>setPayForm(s=>({...s,amount:e.target.value}))}/></div>
              <div><label className="form-label">Date</label>
                <input type="date" className="form-input" value={payForm.date} onChange={e=>setPayForm(s=>({...s,date:e.target.value}))}/></div>
              <div><label className="form-label">Note</label>
                <input className="form-input" value={payForm.note} onChange={e=>setPayForm(s=>({...s,note:e.target.value}))} placeholder="e.g. From May payroll"/></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={()=>setPayTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={()=>{if(!payForm.amount){toast.error('Amount required');return}payMut.mutate({id:payTarget._id,...payForm})}}
                disabled={payMut.isPending} className="btn-primary flex-1 justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                {payMut.isPending?<span className="spinner"/>:<FiCheck size={14}/>} Record Payment
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
