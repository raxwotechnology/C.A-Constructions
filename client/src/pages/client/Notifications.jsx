import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBell, FiCheck, FiCheckSquare, FiFolder, FiCreditCard, FiClock, FiMessageSquare, FiGift, FiAlertCircle } from 'react-icons/fi'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { resolveNotificationLink } from '../../lib/notificationLink'
import ClientPageHeader from '../../components/ui/ClientPageHeader'

const TYPE_CFG = {
  project:  { icon: FiFolder,      color: 'text-blue-600 bg-blue-50',    label: 'Project' },
  invoice:  { icon: FiCreditCard,  color: 'text-green-600 bg-green-50',  label: 'Invoice' },
  payment:  { icon: FiCreditCard,  color: 'text-emerald-600 bg-emerald-50', label: 'Payment' },
  message:  { icon: FiMessageSquare, color: 'text-purple-600 bg-purple-50', label: 'Message' },
  reward:   { icon: FiGift,        color: 'text-amber-600 bg-amber-50',  label: 'Reward' },
  alert:    { icon: FiAlertCircle, color: 'text-red-600 bg-red-50',      label: 'Alert' },
  system:   { icon: FiBell,        color: 'text-slate-600 bg-slate-100', label: 'System' },
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d)
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })
}

const FILTERS = ['all', 'unread', 'project', 'invoice', 'message', 'reward']

export default function ClientNotifications() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['client-notifications-page'],
    queryFn: () => api.get('/system-metrics/notifications').then(r => r.data),
    refetchInterval: 30000,
  })

  const markAllRead = useMutation({
    mutationFn: () => api.put('/system-metrics/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notifications-page'] })
      qc.invalidateQueries({ queryKey: ['client-navbar-notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = data?.notifications || []
  const unread = notifications.filter(n => !n.read).length

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read
    return (n.type || '').toLowerCase().includes(filter)
  })

  const handleClick = async (item) => {
    try {
      if (!item.read) {
        await api.put(`/system-metrics/notifications/${item._id}/read`)
        qc.invalidateQueries({ queryKey: ['client-notifications-page'] })
        qc.invalidateQueries({ queryKey: ['client-navbar-notifications'] })
      }
    } catch (_) {}
    navigate(resolveNotificationLink(item.link, user?.role || 'client', item._id))
  }

  return (
    <div className="animate-fade-in">
      <ClientPageHeader 
        title="Notifications" 
        subtitle={
          unread > 0
            ? <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">{unread} unread message{unread !== 1 ? 's' : ''}</span>
            : 'You\'re all caught up!'
        }
      />

      <section className="section-padding bg-slate-50 min-h-screen">
        <div className="container-max max-w-3xl space-y-5">
          {/* Filter + Mark all */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 flex-wrap">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${filter === f ? 'bg-secondary text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f === 'all' ? `All (${notifications.length})` : f === 'unread' ? `Unread (${unread})` : f}
                </button>
              ))}
            </div>
            {unread > 0 && (
              <button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}
                className="btn-ghost btn-sm gap-1.5 text-xs">
                <FiCheckSquare size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <FiBell size={24} className="text-slate-300" />
              </div>
              <p className="font-semibold text-slate-500">
                {filter !== 'all' ? `No ${filter} notifications` : 'You\'re all caught up!'}
              </p>
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="btn-ghost btn-sm mt-3">Show all</button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map((item, i) => {
                  const cfg = TYPE_CFG[item.type?.toLowerCase()] || TYPE_CFG.system
                  const Icon = cfg.icon
                  return (
                    <motion.button key={item._id} type="button"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      onClick={() => handleClick(item)}
                      className={`card p-4 w-full text-left transition-all hover:shadow-md ${
                        !item.read ? 'bg-blue-50 border-blue-200 hover:bg-blue-100/70' : 'bg-white hover:bg-slate-50'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-sm font-semibold ${!item.read ? 'text-primary' : 'text-slate-700'}`}>{item.title}</p>
                              <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{item.message}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                              {!item.read && <div className="w-2 h-2 rounded-full bg-secondary" />}
                            </div>
                          </div>
                          {item.type && (
                            <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
