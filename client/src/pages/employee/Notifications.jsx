import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'
import useAuthStore from '../../store/authStore'
import { resolveNotificationLink } from '../../lib/notificationLink'

export default function DeveloperNotifications() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const markOne = useMutation({
    mutationFn: (id) => api.put(`/analytics/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['developer-notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const { data } = useQuery({
    queryKey: ['developer-notifications'],
    queryFn: () => api.get('/analytics/notifications').then((r) => r.data),
  })
  const markRead = useMutation({
    mutationFn: () => api.put('/analytics/notifications/read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['developer-notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const notifications = data?.notifications || []

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Notifications"
        subtitle="Salary, leave, announcement, and operational alerts in one place."
        action={<button className="btn-outline btn-sm" onClick={() => markRead.mutate()}>Mark all read</button>}
      />
      <div className="space-y-3">
        {notifications.map((n) => (
          <button
            type="button"
            key={n._id}
            onClick={() => {
              if (!n.read) markOne.mutate(n._id)
              navigate(resolveNotificationLink(n.link, user?.role || 'developer', n._id))
            }}
            className={`card p-4 w-full text-left transition-colors ${n.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50 border-blue-200 hover:bg-blue-100/70'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-primary">{n.title}</p>
                <p className="text-sm text-slate-600 mt-1">{n.message}</p>
              </div>
              <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
            </div>
          </button>
        ))}
        {notifications.length === 0 ? <div className="card p-8 text-center text-slate-400">No notifications.</div> : null}
      </div>
    </div>
  )
}
