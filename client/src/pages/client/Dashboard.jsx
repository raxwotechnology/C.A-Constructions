import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import {
  FiFolder, FiCreditCard, FiCheckCircle, FiClock, FiTrendingUp,
  FiGift, FiServer, FiArrowRight, FiCalendar, FiMessageSquare,
  FiBriefcase, FiStar, FiBell
} from 'react-icons/fi'
import { formatMoney } from '../../lib/currencies'

const QuickAction = ({ to, icon: Icon, label, color, badge }) => (
  <Link to={to}
    className={`card p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-all group border ${color}`}>
    <div className="w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center group-hover:scale-110 transition-transform relative">
      <Icon size={20} className="text-current" />
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>
      )}
    </div>
    <span className="text-xs font-semibold text-slate-700">{label}</span>
  </Link>
)

export default function ClientDashboard() {
  const { user } = useAuthStore()

  const { data: projData }    = useQuery({ queryKey: ['client-projects'],              queryFn: () => api.get('/projects').then(r => r.data) })
  const { data: invData }     = useQuery({ queryKey: ['client-invoices'],              queryFn: () => api.get('/invoices').then(r => r.data) })
  const { data: rewardsData } = useQuery({ queryKey: ['client-rewards-dashboard'],     queryFn: () => api.get('/rewards/me').then(r => r.data) })
  const { data: subData }     = useQuery({ queryKey: ['client-subscriptions-dashboard'], queryFn: () => api.get('/subscriptions/my-summary').then(r => r.data) })
  const { data: notifData }   = useQuery({ queryKey: ['notifications'],                queryFn: () => api.get('/analytics/notifications').then(r => r.data) })
  const { data: bookingData } = useQuery({ queryKey: ['client-bookings-dash'],         queryFn: () => api.get('/bookings').then(r => r.data) })

  const projects     = projData?.projects  || []
  const invoices     = invData?.invoices   || []
  const bookings     = bookingData?.bookings || []
  const activeProjects  = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const pendingInvoices = invoices.filter(i => i.status === 'sent').length
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((a, b) => a + (b.total || 0), 0)
  const rewardPoints = rewardsData?.reward?.totalPoints || 0
  const rewardTier   = rewardsData?.reward?.tier || 'Silver'
  const activeSubs   = subData?.summary?.active || 0
  const overdueSubs  = subData?.summary?.overdue || 0
  const unreadNotifs = (notifData?.notifications || []).filter(n => !n.read).length
  const pendingBookings = bookings.filter(b => b.status === 'pending').length

  const tierColors = {
    Silver:   'text-slate-600 bg-slate-100',
    Gold:     'text-amber-700 bg-amber-100',
    Platinum: 'text-violet-700 bg-violet-100',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="bg-gradient-hero rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-white/60 text-sm mb-1">Welcome back 👋</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-heading">{user?.name}</h1>
            <p className="text-white/60 mt-1 text-sm">Client Portal · Raxwo Technology</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${tierColors[rewardTier]}`}>
                {rewardTier === 'Platinum' ? '💎' : rewardTier === 'Gold' ? '🥇' : '🥈'} {rewardTier} Member
              </span>
              <span className="text-white/70 text-xs">{rewardPoints.toLocaleString()} pts</span>
            </div>
          </div>
          <Link to="/client/booking" className="btn-primary bg-white/20 hover:bg-white/30 border-white/30 text-white gap-2 shrink-0 self-start sm:self-auto">
            <FiBriefcase size={14} /> Book a Service <FiArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { to: '/client/projects',      icon: FiFolder,       label: 'Projects',       color: 'text-blue-600 border-blue-100',    badge: 0 },
          { to: '/client/invoices',      icon: FiCreditCard,   label: 'Invoices',       color: 'text-emerald-600 border-emerald-100', badge: pendingInvoices },
          { to: '/client/subscriptions', icon: FiServer,       label: 'Subscriptions',  color: 'text-purple-600 border-purple-100', badge: overdueSubs },
          { to: '/client/booking',       icon: FiBriefcase,    label: 'Book Service',   color: 'text-orange-600 border-orange-100', badge: 0 },
          { to: '/client/rewards',       icon: FiGift,         label: 'Rewards',        color: 'text-amber-600 border-amber-100',  badge: 0 },
          { to: '/client/messages',      icon: FiMessageSquare,label: 'Messages',       color: 'text-teal-600 border-teal-100',    badge: 0 },
          { to: '/client/feedback',      icon: FiStar,         label: 'Feedback',       color: 'text-pink-600 border-pink-100',    badge: 0 },
          { to: '/client/notifications', icon: FiBell,         label: 'Alerts',         color: 'text-slate-600 border-slate-100',  badge: unreadNotifs },
        ].map((a, i) => (
          <motion.div key={a.to} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
            <QuickAction {...a} />
          </motion.div>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Active Projects',   value: activeProjects,          icon: FiFolder,     color: 'kpi-blue' },
          { label: 'Completed',         value: completedProjects,        icon: FiCheckCircle,color: 'kpi-green' },
          { label: 'Pending Invoices',  value: pendingInvoices,          icon: FiClock,      color: overdueSubs > 0 ? 'kpi-orange' : 'kpi-blue' },
          { label: 'Active Subs',       value: activeSubs,               icon: FiServer,     color: 'kpi-navy' },
          { label: 'Total Paid',        value: formatMoney(totalPaid),   icon: FiCreditCard, color: 'kpi-purple' },
          { label: 'Reward Points',     value: rewardPoints.toLocaleString(), icon: FiGift, color: 'kpi-green' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`kpi-card ${s.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-xl font-bold text-primary font-heading">{s.value}</p>
              </div>
              <s.icon size={18} className="text-gray-300 mt-0.5" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projects panel */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary font-heading">My Projects</h3>
            <Link to="/client/projects" className="text-secondary text-xs hover:underline flex items-center gap-1">
              View all <FiArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 4).map(p => (
              <div key={p._id} className="p-3 bg-gray-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800 text-sm truncate flex-1">{p.title}</h4>
                  <span className={`badge text-xs capitalize ml-2 shrink-0 ${p.status === 'active' ? 'badge-green' : p.status === 'completed' ? 'badge-blue' : 'badge-gray'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${p.progress || 0}%` }} transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-secondary to-blue-500" />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Progress</span>
                  <span className="font-medium">{p.progress || 0}%</span>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="text-center py-6">
                <FiFolder size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-gray-400 text-sm">No projects yet</p>
                <Link to="/client/booking" className="text-secondary text-xs hover:underline mt-1 block">Book a service →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Invoices + Bookings panel */}
        <div className="space-y-4">
          {/* Recent invoices */}
          <div className="card card-body">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-primary font-heading text-sm">Recent Invoices</h3>
              <Link to="/client/invoices" className="text-secondary text-xs hover:underline flex items-center gap-1">View all <FiArrowRight size={11} /></Link>
            </div>
            <div className="space-y-2">
              {invoices.slice(0, 4).map(inv => (
                <div key={inv._id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{inv.invoiceNo}</p>
                    <p className="text-xs text-gray-400">LKR {inv.total?.toLocaleString()}</p>
                  </div>
                  <span className={`badge text-xs capitalize ${inv.status === 'paid' ? 'badge-green' : inv.status === 'sent' ? 'badge-blue' : inv.status === 'overdue' ? 'badge-red' : 'badge-gray'}`}>
                    {inv.status}
                  </span>
                </div>
              ))}
              {invoices.length === 0 && <p className="text-gray-400 text-xs text-center py-3">No invoices yet</p>}
            </div>
          </div>

          {/* Bookings summary */}
          <div className="card card-body">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-primary font-heading text-sm">My Bookings</h3>
              <Link to="/client/booking" className="btn-primary btn-sm gap-1 text-xs"><FiBriefcase size={11} /> New Booking</Link>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-4">
                <FiBriefcase size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-gray-400">No bookings yet</p>
                <Link to="/client/booking" className="text-secondary text-xs hover:underline">Book your first service →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.slice(0, 3).map(b => (
                  <div key={b._id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate">{b.service}</p>
                      <p className="text-xs text-gray-400">LKR {(b.budget || 0).toLocaleString()}</p>
                    </div>
                    <span className={`badge text-xs capitalize ${b.status === 'confirmed' ? 'badge-green' : b.status === 'pending' ? 'badge-blue' : b.status === 'cancelled' ? 'badge-red' : 'badge-purple'}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rewards CTA */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <FiGift size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">Rewards & Loyalty</p>
              <p className="text-xs text-amber-700">You have <strong>{rewardPoints.toLocaleString()} points</strong> · {rewardTier} tier</p>
            </div>
          </div>
          <Link to="/client/rewards" className="btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500 text-white btn-sm gap-1.5 shrink-0">
            Redeem Points <FiArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}
