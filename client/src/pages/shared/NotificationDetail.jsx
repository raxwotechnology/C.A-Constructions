import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import api from '../../lib/api'

export default function NotificationDetail() {
  const { id } = useParams()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notification-detail', id],
    queryFn: () => api.get(`/analytics/notifications/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })

  const markRead = useMutation({
    mutationFn: () => api.put(`/analytics/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['developer-notifications'] })
      qc.invalidateQueries({ queryKey: ['client-notifications-page'] })
      qc.invalidateQueries({ queryKey: ['client-navbar-notifications'] })
      qc.invalidateQueries({ queryKey: ['notification-detail', id] })
    },
  })

  const n = data?.notification

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notification Details</h1>
          <p className="page-subtitle">Full details and quick action for this notification.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-10 text-center"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" /></div>
      ) : !n ? (
        <div className="card p-10 text-center text-slate-400">Notification not found.</div>
      ) : (
        <div className="card card-body space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">{n.type}</p>
              <h2 className="text-2xl font-bold text-primary font-heading mt-1">{n.title}</h2>
            </div>
            {!n.read ? <span className="badge badge-blue">Unread</span> : <span className="badge badge-green">Read</span>}
          </div>
          <p className="text-slate-700">{n.message}</p>
          <p className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
          <div className="flex gap-3">
            {!n.read ? <button type="button" className="btn-primary btn-sm" onClick={() => markRead.mutate()}>Mark as read</button> : null}
            {n.link ? <Link to={n.link} className="btn-outline btn-sm">Open related page</Link> : null}
          </div>
        </div>
      )}
    </div>
  )
}

