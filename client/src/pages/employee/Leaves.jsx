import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiCalendar } from 'react-icons/fi'

const LEAVE_TYPES = ['annual','sick','casual','maternity','paternity','unpaid']

export default function EmployeeLeaves() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, watch } = useForm()
  const start = watch('startDate'), end = watch('endDate')
  const days = start && end ? Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1) : 0

  const { data, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => api.get('/leaves/my').then(r => r.data),
  })
  const requestMut = useMutation({
    mutationFn: d => api.post('/leaves', d),
    onSuccess: () => { qc.invalidateQueries(['my-leaves']); toast.success('Leave submitted!'); reset(); setShowModal(false) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const leaves = data?.leaves || []
  const statusColor = { pending:'badge-yellow', approved:'badge-green', rejected:'badge-red' }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Leave Requests</h1>
          <p className="page-subtitle">{leaves.filter(l=>l.status==='approved').length} approved · {leaves.filter(l=>l.status==='pending').length} pending</p>
        </div>
        <button onClick={()=>setShowModal(true)} className="btn-primary"><FiPlus size={15}/> Request Leave</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label:'Days Approved', count: leaves.filter(l=>l.status==='approved').reduce((a,b)=>a+b.days,0), color:'kpi-green' },
          { label:'Pending', count: leaves.filter(l=>l.status==='pending').length, color:'kpi-blue' },
          { label:'Rejected', count: leaves.filter(l=>l.status==='rejected').length, color:'kpi-navy' },
        ].map(s=>(
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-primary font-heading">{s.count}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
        : leaves.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><FiCalendar size={40} className="mx-auto mb-2 opacity-30"/><p>No leave requests yet</p></div>
        ) : leaves.map(l=>(
          <motion.div key={l._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="card card-body card-hover">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex gap-2 mb-1">
                  <span className="badge badge-blue capitalize">{l.leaveType} Leave</span>
                  <span className={`badge ${statusColor[l.status]} capitalize`}>{l.status}</span>
                  <span className="badge badge-navy">{l.days} day{l.days>1?'s':''}</span>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <FiCalendar size={13}/>{new Date(l.startDate).toLocaleDateString('en-LK')} → {new Date(l.endDate).toLocaleDateString('en-LK')}
                </p>
                <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Reason:</span> {l.reason}</p>
                {l.remarks && <p className="text-xs text-gray-400 mt-0.5"><span className="font-medium">Remarks:</span> {l.remarks}</p>}
              </div>
              <p className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleDateString('en-LK')}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-primary font-heading">Request Leave</h3>
                <button onClick={()=>{setShowModal(false);reset()}} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>
              <form onSubmit={handleSubmit(d=>requestMut.mutate(d))} className="p-6 space-y-4">
                <div><label className="form-label">Leave Type *</label>
                  <select {...register('leaveType',{required:true})} className="form-select">
                    <option value="">Select type</option>
                    {LEAVE_TYPES.map(t=><option key={t} value={t} className="capitalize">{t}</option>)}
                  </select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Start Date *</label>
                    <input {...register('startDate',{required:true})} type="date" className="form-input"/></div>
                  <div><label className="form-label">End Date *</label>
                    <input {...register('endDate',{required:true})} type="date" className="form-input"/></div>
                </div>
                {days>0 && <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">{days} day{days>1?'s':''} requested</div>}
                <div><label className="form-label">Reason *</label>
                  <textarea {...register('reason',{required:true})} rows={3} placeholder="Reason for leave..." className="form-input resize-none"/></div>
                <div className="flex gap-3">
                  <button type="button" onClick={()=>{setShowModal(false);reset()}} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={requestMut.isPending} className="btn-primary flex-1 justify-center">
                    {requestMut.isPending?<span className="spinner"/>:'Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
