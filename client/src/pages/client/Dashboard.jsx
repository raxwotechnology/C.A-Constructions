import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { FiFolder, FiCreditCard, FiCheckCircle, FiClock, FiTrendingUp, FiGift, FiServer } from 'react-icons/fi'

export default function ClientDashboard() {
  const { user } = useAuthStore()

  const { data: projData } = useQuery({
    queryKey: ['client-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })
  const { data: invData } = useQuery({
    queryKey: ['client-invoices'],
    queryFn: () => api.get('/invoices').then(r => r.data),
  })
  const { data: rewardsData } = useQuery({
    queryKey: ['client-rewards-dashboard'],
    queryFn: () => api.get('/rewards/me').then((r) => r.data),
  })
  const { data: subData } = useQuery({
    queryKey: ['client-subscriptions-dashboard'],
    queryFn: () => api.get('/subscriptions/my-summary').then(r => r.data),
  })

  const projects = projData?.projects || []
  const invoices = invData?.invoices || []
  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const pendingInvoices = invoices.filter(i => i.status === 'sent').length
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, b) => a + (b.total || 0), 0)
  const rewardPoints = rewardsData?.reward?.totalPoints || 0
  const activeSubs = subData?.summary?.active || 0
  const overdueSubsAmount = subData?.summary?.remaining || 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="bg-gradient-hero rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"/>
        </div>
        <div className="relative">
          <p className="text-white/60 text-sm mb-1">Welcome back 👋</p>
          <h1 className="text-3xl font-bold text-white font-heading">{user?.name}</h1>
          <p className="text-white/60 mt-1">Client Portal — Raxwo Pvt Ltd</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label:'Active Projects', value:activeProjects, icon:FiFolder, color:'kpi-blue' },
          { label:'Active Subs', value:activeSubs, icon:FiServer, color:'kpi-navy' },
          { label:'Pending Invoices', value:pendingInvoices, icon:FiClock, color:'kpi-orange' },
          { label:'Overdue Subs', value:`LKR ${(overdueSubsAmount/1000).toFixed(0)}k`, icon:FiTrendingUp, color:'kpi-red' },
          { label:'Total Paid', value:`LKR ${(totalPaid/1000).toFixed(0)}k`, icon:FiCreditCard, color:'kpi-purple' },
          { label:'Reward Points', value:rewardPoints, icon:FiGift, color:'kpi-green' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}
            className={`kpi-card ${s.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-primary font-heading">{s.value}</p>
              </div>
              <s.icon size={20} className="text-gray-300"/>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projects */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary font-heading">My Projects</h3>
            <Link to="/client/projects" className="text-secondary text-xs hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 4).map(p => (
              <div key={p._id} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800 text-sm">{p.title}</h4>
                  <span className={`badge text-xs capitalize ${p.status==='active'?'badge-green':p.status==='completed'?'badge-blue':'badge-gray'}`}>{p.status}</span>
                </div>
                <div className="progress-bar mb-1">
                  <div className="progress-fill bg-secondary" style={{width:`${p.progress}%`}}/>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Progress</span><span>{p.progress}%</span>
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No projects yet</p>}
          </div>
        </div>

        {/* Invoices */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary font-heading">Recent Invoices</h3>
            <Link to="/client/invoices" className="text-secondary text-xs hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {invoices.slice(0, 5).map(inv => (
              <div key={inv._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.invoiceNo}</p>
                  <p className="text-xs text-gray-400">LKR {inv.total?.toLocaleString()}</p>
                </div>
                <span className={`badge text-xs ${inv.status==='paid'?'badge-green':inv.status==='sent'?'badge-blue':inv.status==='overdue'?'badge-red':'badge-gray'}`}>{inv.status}</span>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No invoices yet</p>}
          </div>
        </div>
      </div>

      <div className="card card-body">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-primary font-heading">Rewards & Loyalty</h3>
            <p className="text-sm text-slate-500">Use points for vouchers and premium service benefits.</p>
          </div>
          <Link to="/rewards" className="btn-primary btn-sm">Open Rewards</Link>
        </div>
      </div>
    </div>
  )
}
