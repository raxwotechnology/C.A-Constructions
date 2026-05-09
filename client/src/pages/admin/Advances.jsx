import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import ExportBar from '../../components/ui/ExportBar'
import { FiPlus, FiX, FiCheck, FiDollarSign, FiRefreshCw } from 'react-icons/fi'

const EMPTY = { employeeId:'', amount:'', date: new Date().toISOString().split('T')[0], reason:'', repaymentType:'lump_sum', installments:1 }
const REPAY_EMPTY = { amount:'', date: new Date().toISOString().split('T')[0], note:'' }

export default function AdminAdvances() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [repayTarget, setRepayTarget] = useState(null)
  const [repayForm, setRepayForm] = useState(REPAY_EMPTY)
  const [statusFilter, setStatusFilter] = useState('')
  const [empFilter, setEmpFilter] = useState('')

  const [branchFilter, setBranchFilter] = useState('')

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const { data: advData, isLoading } = useQuery({
    queryKey: ['advances', statusFilter, empFilter, branchFilter],
    queryFn: () => api.get(`/advances?${statusFilter?`status=${statusFilter}&`:''}${empFilter?`employeeId=${empFilter}&`:''}${branchFilter?`branch=${branchFilter}`:''}`).then(r=>r.data),
  })
  const { data: empData } = useQuery({ queryKey: ['employees-mini', branchFilter], queryFn: () => api.get(`/employees?${branchFilter?`branch=${branchFilter}`:''}`).then(r=>r.data) })

  const advances = advData?.advances || []
  const employees = empData?.employees || []
  const totalOutstanding = advances.filter(a=>a.status==='active').reduce((s,a)=>s+(a.outstandingBalance||0),0)

  const createMut = useMutation({
    mutationFn: p => api.post('/advances', p),
    onSuccess: () => { qc.invalidateQueries({queryKey:['advances']}); toast.success('Advance recorded'); setShowCreate(false); setForm(EMPTY) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const repayMut = useMutation({
    mutationFn: ({id,...p}) => api.post(`/advances/${id}/repay`, p),
    onSuccess: () => { qc.invalidateQueries({queryKey:['advances']}); toast.success('Repayment recorded'); setRepayTarget(null); setRepayForm(REPAY_EMPTY) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/advances/${id}`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['advances']}); toast.success('Deleted') },
  })

  const exportCols = [
    { header:'Employee', accessor: r=>r.employee?.userId?.name||'—' },
    { header:'Amount', accessor:'amount' },
    { header:'Date', accessor: r=>new Date(r.date).toLocaleDateString('en-LK') },
    { header:'Repayment', accessor:'repaymentType' },
    { header:'Installments', accessor:'installments' },
    { header:'Recovered', accessor:'totalRecovered' },
    { header:'Outstanding', accessor:'outstandingBalance' },
    { header:'Status', accessor:'status' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Advance Payments</h1>
          <p className="page-subtitle">{advances.filter(a=>a.status==='active').length} active · Outstanding: <strong className="text-red-600">LKR {totalOutstanding.toLocaleString()}</strong></p>
        </div>
        <div className="flex gap-2">
          <ExportBar data={advances} columns={exportCols} title="Advance Payments Report" />
          <button onClick={()=>{setForm(EMPTY);setShowCreate(true)}} className="btn-primary gap-2"><FiPlus size={14}/>New Advance</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card kpi-red"><p className="text-xs text-slate-500 uppercase font-medium">Outstanding</p><p className="text-xl font-bold text-red-700">LKR {totalOutstanding.toLocaleString()}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase font-medium">Total Recovered</p><p className="text-xl font-bold text-emerald-700">LKR {advances.reduce((s,a)=>s+(a.totalRecovered||0),0).toLocaleString()}</p></div>
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase font-medium">Active Cases</p><p className="text-xl font-bold text-blue-700">{advances.filter(a=>a.status==='active').length}</p></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select className="form-select py-2 text-sm" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="cleared">Cleared</option>
        </select>
        <select className="form-select py-2 text-sm" value={empFilter} onChange={e=>setEmpFilter(e.target.value)}>
          <option value="">All Employees</option>
          {employees.map(e=><option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeNo})</option>)}
        </select>
        <select className="form-select py-2 text-sm" value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Employee</th><th>Amount</th><th>Date</th><th>Repayment</th><th>Recovered</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="text-center py-10"><div className="w-7 h-7 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></td></tr>
            : advances.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-slate-400">No advance records.</td></tr>
            : advances.map(a=>(
              <tr key={a._id}>
                <td>
                  <p className="font-medium text-slate-800">{a.employee?.userId?.name||'—'}</p>
                  <p className="text-xs text-slate-400">{a.employee?.employeeNo}</p>
                </td>
                <td className="font-medium">LKR {(a.amount||0).toLocaleString()}</td>
                <td className="text-sm text-slate-600">{new Date(a.date).toLocaleDateString('en-LK')}</td>
                <td className="text-sm text-slate-500 capitalize">
                  {a.repaymentType?.replace('_',' ')}
                  {a.installments>1&&<span className="text-xs text-slate-400 ml-1">({a.installments}×LKR {(a.monthlyDeduction||0).toLocaleString()})</span>}
                </td>
                <td className="text-emerald-700 font-medium">LKR {(a.totalRecovered||0).toLocaleString()}</td>
                <td className={`font-bold ${a.outstandingBalance>0?'text-red-600':'text-emerald-600'}`}>LKR {(a.outstandingBalance||0).toLocaleString()}</td>
                <td><span className={`badge ${a.status==='cleared'?'badge-green':'badge-yellow'}`}>{a.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {a.status==='active' && (
                      <button onClick={()=>{setRepayTarget(a);setRepayForm(REPAY_EMPTY)}} title="Record Repayment"
                        className="p-1.5 hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 rounded-lg"><FiRefreshCw size={13}/></button>
                    )}
                    <button onClick={()=>{if(window.confirm('Delete this advance?'))deleteMut.mutate(a._id)}}
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
              <h3 className="font-bold text-primary font-heading">New Advance Payment</h3>
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
                <div><label className="form-label">Amount (LKR) *</label>
                  <input type="number" className="form-input" value={form.amount} onChange={e=>setForm(s=>({...s,amount:e.target.value}))} placeholder="0"/></div>
                <div><label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e=>setForm(s=>({...s,date:e.target.value}))}/></div>
              </div>
              <div><label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={e=>setForm(s=>({...s,reason:e.target.value}))} placeholder="Optional"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Repayment Type</label>
                  <select className="form-select" value={form.repaymentType} onChange={e=>setForm(s=>({...s,repaymentType:e.target.value}))}>
                    <option value="lump_sum">Lump Sum</option>
                    <option value="installments">Installments</option>
                  </select></div>
                {form.repaymentType==='installments' && (
                  <div><label className="form-label">No. of Months</label>
                    <input type="number" className="form-input" min={1} value={form.installments} onChange={e=>setForm(s=>({...s,installments:Number(e.target.value)}))}/></div>
                )}
              </div>
              {form.amount&&form.repaymentType==='installments'&&form.installments>1&&(
                <div className="bg-blue-50 text-blue-700 rounded-xl p-3 text-sm">Monthly deduction: <strong>LKR {Math.ceil(Number(form.amount)/form.installments).toLocaleString()}</strong></div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={()=>setShowCreate(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={()=>{if(!form.employeeId||!form.amount){toast.error('Employee & amount required');return}createMut.mutate(form)}}
                disabled={createMut.isPending} className="btn-primary flex-1 justify-center gap-2">
                {createMut.isPending?<span className="spinner"/>:<FiCheck size={14}/>} Record Advance
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {/* Repayment Modal */}
      {repayTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-bold text-primary font-heading">Record Repayment</h3>
              <button onClick={()=>setRepayTarget(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
                <p className="font-medium">{repayTarget.employee?.userId?.name}</p>
                <p className="text-slate-500">Outstanding: <strong className="text-red-600">LKR {(repayTarget.outstandingBalance||0).toLocaleString()}</strong></p>
                {repayTarget.monthlyDeduction>0&&<p className="text-slate-400">Suggested: LKR {repayTarget.monthlyDeduction.toLocaleString()}</p>}
              </div>
              <div><label className="form-label">Repayment Amount *</label>
                <input type="number" className="form-input" value={repayForm.amount} onChange={e=>setRepayForm(s=>({...s,amount:e.target.value}))}
                  placeholder={repayTarget.monthlyDeduction||'0'}/></div>
              <div><label className="form-label">Date</label>
                <input type="date" className="form-input" value={repayForm.date} onChange={e=>setRepayForm(s=>({...s,date:e.target.value}))}/></div>
              <div><label className="form-label">Note</label>
                <input className="form-input" value={repayForm.note} onChange={e=>setRepayForm(s=>({...s,note:e.target.value}))} placeholder="e.g. From May payroll"/></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={()=>setRepayTarget(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={()=>{if(!repayForm.amount){toast.error('Amount required');return}repayMut.mutate({id:repayTarget._id,...repayForm})}}
                disabled={repayMut.isPending} className="btn-primary flex-1 justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                {repayMut.isPending?<span className="spinner"/>:<FiCheck size={14}/>} Record
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
