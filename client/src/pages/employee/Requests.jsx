import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiX, FiClock, FiCheck, FiAlertCircle, FiFileText, FiUpload, FiChevronRight } from 'react-icons/fi'

const REQUEST_TYPES = [
  { value: 'experience_letter', label: '📄 Experience Letter' },
  { value: 'salary_confirmation', label: '💰 Salary Confirmation Letter' },
  { value: 'leave_letter', label: '🏖️ Leave Letter' },
  { value: 'hr_document', label: '📋 HR Document' },
  { value: 'tool_request', label: '🔧 Tool/Software Request' },
  { value: 'general', label: '📝 General Request' },
  { value: 'other', label: '🗂️ Other' },
]

const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: FiClock },
  manager_approved: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FiCheck },
  admin_approved: { label: 'Fully Approved ✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: FiCheck },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: FiAlertCircle },
}

const TABS = ['all', 'pending', 'manager_approved', 'admin_approved', 'rejected']

export default function EmployeeRequests() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [form, setForm] = useState({ type: 'general', subject: '', description: '' })
  const [files, setFiles] = useState([])
  const [expanded, setExpanded] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => api.get('/requests/my').then(r => r.data),
  })

  const requests = (data?.requests || []).filter(r => activeTab === 'all' || r.status === activeTab)

  const submitMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('type', form.type)
      fd.append('subject', form.subject)
      fd.append('description', form.description)
      files.forEach(f => fd.append('attachments', f))
      return api.post('/requests', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
    },
    onSuccess: () => {
      toast.success('Request submitted!')
      setShowForm(false)
      setForm({ type: 'general', subject: '', description: '' })
      setFiles([])
      qc.invalidateQueries({ queryKey: ['my-requests'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to submit')
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Requests</h1>
          <p className="page-subtitle">Submit and track your HR requests and letters.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
          <FiPlus size={14} /> New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${activeTab === t ? 'bg-white shadow text-secondary' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'all' ? 'All' : STATUS_CONFIG[t]?.label || t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FiFileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No requests yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Submit First Request</button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
            const Icon = cfg.icon
            return (
              <motion.div key={req._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="card border border-slate-200 overflow-hidden">
                <button className="w-full p-4 text-left flex items-center gap-4" onClick={() => setExpanded(expanded === req._id ? null : req._id)}>
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <FiFileText size={18} className="text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary truncate">{req.subject}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{REQUEST_TYPES.find(t => t.value === req.type)?.label || req.type} · {new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} flex items-center gap-1 shrink-0`}>
                    <Icon size={11} /> {cfg.label}
                  </span>
                  <FiChevronRight size={16} className={`text-slate-400 transition-transform ${expanded === req._id ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {expanded === req._id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden border-t border-slate-100">
                      <div className="p-4 space-y-3">
                        {req.description && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Description</p>
                            <p className="text-sm text-slate-700">{req.description}</p>
                          </div>
                        )}
                        {req.rejectionReason && (
                          <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                            <p className="text-xs font-bold text-red-700 mb-1">Rejection Reason</p>
                            <p className="text-sm text-red-700">{req.rejectionReason}</p>
                          </div>
                        )}
                        {/* Approval Timeline */}
                        {req.approvalChain?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Approval Timeline</p>
                            <div className="space-y-2">
                              {req.approvalChain.map((step, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.action === 'approved' ? 'bg-emerald-100 text-emerald-600' : step.action === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {step.action === 'approved' ? '✓' : step.action === 'rejected' ? '✗' : '○'}
                                  </div>
                                  <div>
                                    <span className="font-medium capitalize">{step.role}</span>
                                    {step.approvedBy?.name && <span className="text-slate-400 ml-1">({step.approvedBy.name})</span>}
                                    {step.note && <span className="text-slate-500 ml-2 italic">— {step.note}</span>}
                                  </div>
                                  {step.approvedAt && <span className="text-xs text-slate-400 ml-auto">{new Date(step.approvedAt).toLocaleDateString()}</span>}
                                </div>
                              ))}
                            </div>
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

      {/* Submit Request Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h2 className="font-bold text-primary text-lg">Submit Request</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-xl"><FiX /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <label className="form-label">Request Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(s => ({ ...s, type: e.target.value }))}>
                    {REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Subject</label>
                  <input className="form-input" placeholder="Brief subject line..." value={form.subject} onChange={e => setForm(s => ({ ...s, subject: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows="4" placeholder="Provide details about your request..." value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Attachments (Optional)</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-secondary transition-colors"
                    onClick={() => document.getElementById('req-files').click()}>
                    <FiUpload size={20} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">{files.length > 0 ? `${files.length} file(s) selected` : 'Click to attach files'}</p>
                    <input id="req-files" type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files).slice(0, 5))} />
                  </div>
                </div>
              </div>
              <div className="p-5 border-t bg-slate-50 rounded-b-2xl">
                <button onClick={() => submitMut.mutate()} disabled={!form.subject || submitMut.isPending} className="btn-primary w-full justify-center">
                  {submitMut.isPending ? <span className="spinner" /> : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
