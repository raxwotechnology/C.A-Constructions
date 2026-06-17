import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { resolveNotificationLink } from '../../lib/notificationLink'
import { FiBell, FiCheck, FiTrash2, FiCheckSquare, FiFilter, FiAlertCircle, FiDollarSign, FiClipboard, FiStar } from 'react-icons/fi'

const TYPE_CONFIG = {
  payroll:  { label: 'Payroll',  icon: FiDollarSign,   color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  leave:    { label: 'Leave',    icon: FiCheckSquare,  color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  system:   { label: 'System',   icon: FiAlertCircle,  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  request:  { label: 'Request',  icon: FiClipboard,    color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
  reward:   { label: 'Reward',   icon: FiStar,         color: 'bg-yellow-100 text-yellow-700',dot: 'bg-yellow-500' },
  default:  { label: 'General',  icon: FiBell,         color: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400' },
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'leave', label: 'Leave' },
  { value: 'system', label: 'System' },
]

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(date).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })
}

export default function EmployeeNotifications() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['employee-notifications'],
    queryFn: () => api.get('/system-metrics/notifications').then(r => r.data),
    refetchInterval: 30000,
  })

  const all = data?.notifications || []
  const unreadCount = all.filter(n => !n.read).length

  const filtered = all.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter !== 'all') return n.type === filter
    return true
  })

  const markOne = useMutation({
    mutationFn: (id) => api.put(`/system-metrics/notifications/${id}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-notifications'] }); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const markAll = useMutation({
    mutationFn: () => api.put('/system-metrics/notifications/read'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-notifications'] }); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}` : 'All caught up ✓'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAll.mutate()} disabled={markAll.isPending}
            className="btn-outline btn-sm gap-1.5">
            <FiCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter === f.value ? 'bg-white shadow text-secondary' : 'text-slate-500 hover:text-slate-700'}`}>
            {f.label}
            {f.value === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-secondary text-white rounded-full text-[10px]">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card card-body text-center py-16">
          <FiBell size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
          {filter !== 'all' && <button onClick={() => setFilter('all')} className="btn-ghost mt-2 text-sm">Show all</button>}
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-2">
            {filtered.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default
              const Icon = cfg.icon
              return (
                <motion.div key={n._id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.02 }}
                  className={`card border transition-all duration-200 overflow-hidden ${!n.read ? 'border-secondary/20 bg-blue-50/40' : 'border-slate-100 hover:border-slate-200'}`}>
                  <button className="w-full p-4 text-left"
                    onClick={() => {
                      if (!n.read) markOne.mutate(n._id)
                      navigate(resolveNotificationLink(n.link, user?.role || 'developer', n._id))
                    }}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-semibold text-sm text-primary ${!n.read ? 'font-bold' : ''}`}>{n.title}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {!n.read && <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />}
                            <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
