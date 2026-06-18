import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiStar, FiMessageSquare, FiSend, FiFilter, FiUser, FiClock, FiCheckCircle, FiXCircle, FiMail } from 'react-icons/fi'

function StarDisplay({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <FiStar key={s} size={size}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
          style={{ fill: s <= rating ? '#fbbf24' : 'transparent' }} />
      ))}
    </div>
  )
}

const STATUS_CFG = {
  pending:  { cls: 'badge-yellow', label: 'Pending', icon: FiClock },
  approved: { cls: 'badge-green', label: 'Approved', icon: FiCheckCircle },
  rejected: { cls: 'badge-red', label: 'Rejected', icon: FiXCircle },
  new:      { cls: 'badge-yellow', label: 'New', icon: FiClock },
  reviewed: { cls: 'badge-blue',   label: 'Reviewed', icon: FiMessageSquare },
  resolved: { cls: 'badge-green',  label: 'Resolved', icon: FiCheckCircle },
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d)
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminFeedbacks() {
  const qc = useQueryClient()
  const [responses, setResponses] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRating, setFilterRating] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: () => api.get('/feedback').then(r => r.data),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, response, status }) =>
      api.put(`/feedback/${id}/respond`, { response, status }).then(r => r.data),
    onSuccess: (_, { id }) => {
      toast.success('Response saved')
      qc.invalidateQueries({ queryKey: ['admin-feedbacks'] })
      setSelectedId(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to save response'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.put(`/feedback/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['admin-feedbacks'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to update status'),
  })

  const feedbacks = data?.feedbacks || []

  // KPIs
  const avg = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + Number(f.rating || 0), 0) / feedbacks.length).toFixed(1) : '0.0'
  const pending  = feedbacks.filter(f => f.status !== 'resolved').length
  const resolved = feedbacks.filter(f => f.status === 'resolved').length
  const fiveStars = feedbacks.filter(f => f.rating >= 5).length

  // Filtering
  const filtered = feedbacks.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || f.client?.name?.toLowerCase().includes(q) || f.message?.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || f.status === filterStatus
    const matchRating = filterRating === 'all' || f.rating === Number(filterRating)
    return matchSearch && matchStatus && matchRating
  })

  const selected = feedbacks.find(f => f._id === selectedId)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Feedback</h1>
          <p className="page-subtitle">Review, respond to, and resolve client satisfaction feedback.</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Feedback', val: feedbacks.length, sub: 'All time', color: 'kpi-blue' },
          { label: 'Avg Rating', val: `${avg} ★`, sub: 'Out of 5.0', color: 'kpi-green' },
          { label: 'Pending Response', val: pending, sub: 'Needs attention', color: pending > 0 ? 'kpi-orange' : 'kpi-gray' },
          { label: '5-Star Reviews', val: fiveStars, sub: 'Excellent ratings', color: 'kpi-navy' },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`kpi-card ${k.color} ${k.label === 'Pending Response' && pending > 0 ? 'ring-2 ring-offset-1 ring-amber-300' : ''}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{k.label}</p>
            <p className="text-2xl font-black text-primary mt-1">{k.val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiUser size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="form-input pl-9 w-full" placeholder="Search client or message..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[['all', 'All'], ['pending', 'Pending'], ['reviewed', 'Reviewed'], ['resolved', 'Resolved']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterStatus === v ? 'bg-white shadow text-secondary' : 'text-slate-500 hover:text-slate-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <select className="form-select w-auto" value={filterRating} onChange={e => setFilterRating(e.target.value)}>
          <option value="all">All Ratings</option>
          {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>)}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card card-body text-center py-16">
          <FiMessageSquare size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No feedback found{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map((item, i) => {
            const cfg = STATUS_CFG[item.status] || STATUS_CFG.pending
            const StatusIcon = cfg.icon
            const isOpen = selectedId === item._id

            return (
              <motion.div key={item._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`card border transition-all duration-200 overflow-hidden ${isOpen ? 'border-secondary/30 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(item.client?.name || item.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-primary text-sm">{item.client?.name || item.name || 'Anonymous'}</p>
                        <p className="text-xs text-slate-400">{item.client?.email || item.email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`badge text-xs ${cfg.cls} flex items-center gap-1`}>
                        <StatusIcon size={10} />{cfg.label}
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <StarDisplay rating={item.rating} />
                    <span className="text-xs font-bold text-slate-600">{item.rating}/5</span>
                  </div>

                  {/* Message */}
                  {item.message && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-3">
                      <p className="text-sm text-slate-600 leading-relaxed">{item.message}</p>
                    </div>
                  )}

                  {/* Existing response */}
                  {item.response && !isOpen && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><FiMessageSquare size={10} /> Your Response</p>
                      <p className="text-xs text-blue-600 leading-relaxed">{item.response}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isOpen && (
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => setSelectedId(item._id)}
                        className="btn-outline btn-sm flex-1 justify-center gap-1.5">
                        <FiSend size={12} /> {item.response ? 'Update Response' : 'Respond'}
                      </button>
                      {item.status !== 'approved' && (
                        <button onClick={() => statusMutation.mutate({ id: item._id, status: 'approved' })}
                          className="btn-primary bg-green-500 hover:bg-green-600 border-none btn-sm px-3 text-white flex items-center justify-center" title="Approve">
                          <FiCheckCircle size={14} />
                        </button>
                      )}
                      {item.status !== 'rejected' && (
                        <button onClick={() => statusMutation.mutate({ id: item._id, status: 'rejected' })}
                          className="btn-danger btn-sm px-3 flex items-center justify-center" title="Reject">
                          <FiXCircle size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Reply area */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-100 bg-slate-50">
                      <div className="p-4 space-y-3">
                        <label className="text-xs font-semibold text-slate-600 block">Reply to {item.client?.name || 'client'}</label>
                        <textarea
                          className="form-input resize-none text-sm"
                          rows={4}
                          value={responses[item._id] ?? item.response ?? ''}
                          onChange={e => setResponses(s => ({ ...s, [item._id]: e.target.value }))}
                          placeholder="Write a professional response..."
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedId(null)} className="btn-ghost btn-sm flex-1 justify-center">Cancel</button>
                          <button onClick={() => respondMutation.mutate({ id: item._id, response: responses[item._id] || '', status: 'reviewed' })}
                            disabled={respondMutation.isPending}
                            className="btn-outline btn-sm flex-1 justify-center gap-1">
                            <FiCheckCircle size={12} /> Mark Reviewed
                          </button>
                          <button onClick={() => respondMutation.mutate({ id: item._id, response: responses[item._id] || '', status: 'resolved' })}
                            disabled={respondMutation.isPending}
                            className="btn-primary btn-sm flex-1 justify-center gap-1">
                            <FiSend size={12} /> Resolve
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
