import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import { resolveNotificationLink } from '../../lib/notificationLink'

export default function ClientNotifications() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['client-notifications-page'],
    queryFn: () => api.get('/analytics/notifications').then((r) => r.data),
  })

  const notifications = data?.notifications || []

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero pt-32 pb-10">
        <div className="container-max">
          <p className="text-white/70 text-sm">Client Portal</p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mt-2">Notifications</h1>
          <p className="text-white/75 mt-2">Track all updates from projects, billing, and support.</p>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-max space-y-5">
          <SectionHeader title="Updates" subtitle="Latest alerts and announcements." />

      {isLoading ? (
        <div className="card p-10 text-center">
          <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-10 text-center">
          <FiBell className="mx-auto text-slate-300" size={32} />
          <p className="mt-3 text-slate-500">You are all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={async () => {
                try { if (!item.read) await api.put(`/analytics/notifications/${item._id}/read`) } catch (_) {}
                qc.invalidateQueries({ queryKey: ['client-notifications-page'] })
                qc.invalidateQueries({ queryKey: ['notifications'] })
                navigate(resolveNotificationLink(item.link, user?.role || 'client', item._id))
              }}
              className={`card p-4 w-full text-left transition-colors ${item.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50 border-blue-200 hover:bg-blue-100/70'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-primary">{item.title}</p>
                  <p className="text-sm text-slate-600 mt-1">{item.message}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
        </div>
      </section>
    </div>
  )
}
