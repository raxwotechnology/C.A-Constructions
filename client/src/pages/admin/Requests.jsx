import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheck, FiX, FiAlertCircle, FiFileText, FiChevronRight, FiMessageSquare } from 'react-icons/fi'
import useAuthStore from '../../store/authStore'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  manager_approved: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  admin_approved: { label: 'Fully Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
}

export default function AdminRequests() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('pending')
  const [expanded, setExpanded] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [note, setNote] = useState('')

  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery({
    queryKey: ['admin-requests', filter],
    queryFn: () => api.get(`/requests?status=${filter}`).then(r => r.data),
  })
  const requests = data?.requests || []

  const approveMut = useMutation({
    mutationFn: ({ id, n }) => api.put(`/requests/${id}/approve`, { note: n }),
    onSuccess: () => { toast.success('Request approved'); setActionTarget(null); setNote(''); qc.invalidateQueries({ queryKey: ['admin-requests'] }) },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/requests/${id}/reject`, { reason }),
    onSuccess: () => { toast.success('Request rejected'); setActionTarget(null); setNote(''); qc.invalidateQueries({ queryKey: ['admin-requests'] }) },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const FILTERS = isAdmin
    ? ['pending', 'manager_approved', 'admin_approved', 'rejected']
    : ['pending', 'rejected']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Request Management</h1>
          <p className="page-subtitle">Review and approve employee requests and letters.</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-full sm:w-fit overflow-x-auto no-scrollbar">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold whitespace-nowrap rounded-lg capitalize transition-colors ${filter === f ? 'bg-white shadow-sm text-secondary' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
            {STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
          <FiFileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No {filter} requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
            const emp = req.employee?.userId
            return (
              <motion.div key={req._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="card border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {emp?.avatar ? <img src={emp.avatar} className="w-full h-full object-cover" alt="" />
                        : <div className="font-bold text-slate-500 text-sm">{emp?.name?.charAt(0)}</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mb-1">
                        <p className="font-bold text-slate-800 text-sm truncate">{req.subject}</p>
                        <span className={`w-fit px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{emp?.name} <span className="mx-1.5 text-slate-300">•</span> {req.employeeRole} <span className="mx-1.5 text-slate-300">•</span> {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 mt-1 sm:mt-0">
                    {(req.status === 'pending' || (isAdmin && req.status === 'manager_approved')) && (
                      <div className="flex flex-1 sm:flex-none gap-2 mr-auto sm:mr-0">
                        <button onClick={() => { setActionTarget(req._id); setActionType('approve') }}
                          className="flex-1 sm:flex-none btn-primary btn-sm gap-1.5 bg-emerald-600 hover:bg-emerald-700 py-2 sm:py-1.5 px-4 text-xs font-semibold shadow-sm">
                          <FiCheck size={14} /> Approve
                        </button>
                        <button onClick={() => { setActionTarget(req._id); setActionType('reject') }}
                          className="flex-1 sm:flex-none btn-danger btn-sm gap-1.5 py-2 sm:py-1.5 px-4 text-xs font-semibold shadow-sm">
                          <FiX size={14} /> Reject
                        </button>
                      </div>
                    )}
                    <button onClick={() => setExpanded(expanded === req._id ? null : req._id)} className="btn-ghost btn-sm p-2 sm:p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors ml-auto">
                      <FiChevronRight size={16} className={`text-slate-500 transition-transform ${expanded === req._id ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expanded === req._id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100">
                      <div className="p-4 space-y-3 text-sm">
                        <p className="text-slate-700">{req.description || 'No description provided.'}</p>
                        {req.approvalChain?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Approval Chain</p>
                            {req.approvalChain.map((s, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs py-1">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${s.action === 'approved' ? 'bg-emerald-100 text-emerald-600' : s.action === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-slate-100'}`}>
                                  {s.action === 'approved' ? '✓' : s.action === 'rejected' ? '✗' : '○'}
                                </span>
                                <span className="font-medium capitalize">{s.role}</span>
                                {s.approvedBy?.name && <span className="text-slate-400">({s.approvedBy.name})</span>}
                                {s.note && <span className="text-slate-500 italic">— {s.note}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {actionTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                {actionType === 'approve'
                  ? <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><FiCheck className="text-emerald-600" size={20} /></div>
                  : <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><FiAlertCircle className="text-red-600" size={20} /></div>}
                <h2 className="font-bold text-primary text-lg capitalize">{actionType} Request</h2>
              </div>
              <div>
                <label className="form-label">{actionType === 'approve' ? 'Approval Note (Optional)' : 'Rejection Reason'}</label>
                <textarea className="form-input" rows="3" placeholder={actionType === 'approve' ? 'Add a note...' : 'Reason for rejection...'}
                  value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div className="flex gap-3">
                {actionType === 'approve' ? (
                  <button onClick={() => approveMut.mutate({ id: actionTarget, n: note })} disabled={approveMut.isPending}
                    className="flex-1 btn-primary justify-center bg-emerald-600 hover:bg-emerald-700">
                    {approveMut.isPending ? <span className="spinner" /> : 'Confirm Approval'}
                  </button>
                ) : (
                  <button onClick={() => rejectMut.mutate({ id: actionTarget, reason: note })} disabled={!note || rejectMut.isPending}
                    className="flex-1 btn-danger justify-center">
                    {rejectMut.isPending ? <span className="spinner" /> : 'Confirm Rejection'}
                  </button>
                )}
                <button onClick={() => { setActionTarget(null); setNote('') }} className="btn-ghost px-4"><FiX /></button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
