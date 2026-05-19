import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { FiUsers, FiFolder, FiClock, FiCheckSquare, FiFileText, FiBarChart2, FiAlertTriangle, FiArrowRight, FiCalendar, FiActivity, FiClipboard } from 'react-icons/fi'

const QuickLink = ({ to, icon: Icon, label, color }) => (
  <Link to={to} className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium text-gray-600 transition-all duration-150 ${color} hover:shadow-sm`}>
    <Icon size={15} /><span>{label}</span><FiArrowRight size={11} className="ml-auto opacity-40" />
  </Link>
)

export default function ManagerDashboard() {
  const { user } = useAuthStore()

  const { data: projectData } = useQuery({
    queryKey: ['manager-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })
  const { data: leaveData } = useQuery({
    queryKey: ['manager-leaves'],
    queryFn: () => api.get('/leaves?status=pending').then(r => r.data),
  })
  const { data: logData } = useQuery({
    queryKey: ['manager-worklogs'],
    queryFn: () => api.get('/work-logs?status=pending').then(r => r.data),
  })
  const { data: requestData } = useQuery({
    queryKey: ['manager-requests'],
    queryFn: () => api.get('/requests?status=pending').then(r => r.data),
  })

  const projects = projectData?.projects || []
  const leaves = leaveData?.leaves || []
  const logs = logData?.logs || []
  const requests = requestData?.requests || []

  const activeProjects = projects.filter(p => p.status === 'active').length
  const overdueProjects = projects.filter(p => p.status === 'overdue').length
  const completedProjects = projects.filter(p => ['completed', 'paid_completed'].includes(p.status)).length
  const pendingLeaves = leaves.length
  const pendingLogs = logs.length
  const pendingRequests = requests.length

  // Project health
  const recentProjects = projects.slice(0, 5)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header banner */}
      <div className="bg-gradient-hero rounded-2xl p-7 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
        <p className="text-white/60 text-sm">Welcome back 👋</p>
        <h1 className="text-2xl font-bold text-white font-heading mt-1">{user?.name}</h1>
        <p className="text-white/70 text-sm mt-1">Manager · {new Date().toLocaleDateString('en-LK', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Active Projects', val: activeProjects, sub: `${overdueProjects} overdue`, color: 'kpi-blue', icon: FiFolder },
          { label: 'Completed', val: completedProjects, sub: 'All time', color: 'kpi-green', icon: FiCheckSquare },
          { label: 'Pending Leaves', val: pendingLeaves, sub: 'Awaiting approval', color: pendingLeaves > 0 ? 'kpi-orange' : 'kpi-gray', icon: FiCalendar, alert: pendingLeaves > 0 },
          { label: 'Pending Work Logs', val: pendingLogs, sub: 'Review required', color: pendingLogs > 0 ? 'kpi-navy' : 'kpi-gray', icon: FiClipboard, alert: pendingLogs > 0 },
          { label: 'Employee Requests', val: pendingRequests, sub: 'Needs your approval', color: pendingRequests > 0 ? 'kpi-purple' : 'kpi-gray', icon: FiFileText, alert: pendingRequests > 0 },
          { label: 'Total Projects', val: projects.length, sub: 'In system', color: 'kpi-gray', icon: FiBarChart2 },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`kpi-card ${c.color} ${c.alert ? 'ring-2 ring-offset-1 ring-orange-300' : ''}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-black text-primary mt-1">{c.val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      {(pendingLeaves > 0 || pendingLogs > 0 || pendingRequests > 0 || overdueProjects > 0) && (
        <div className="card card-body space-y-2">
          <h3 className="font-bold text-primary flex items-center gap-2 mb-3"><FiAlertTriangle size={15} className="text-amber-500" /> Pending Actions</h3>
          {pendingLeaves > 0 && (
            <Link to="/manager/leaves" className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
              <FiCalendar size={14} className="text-amber-600" />
              <div className="flex-1"><p className="text-sm font-semibold text-amber-800">{pendingLeaves} Leave Request{pendingLeaves !== 1 ? 's' : ''} Pending</p></div>
              <FiArrowRight size={13} className="text-amber-500" />
            </Link>
          )}
          {pendingLogs > 0 && (
            <Link to="/manager/work-logs" className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
              <FiClipboard size={14} className="text-blue-600" />
              <div className="flex-1"><p className="text-sm font-semibold text-blue-800">{pendingLogs} Work Log{pendingLogs !== 1 ? 's' : ''} Awaiting Review</p></div>
              <FiArrowRight size={13} className="text-blue-500" />
            </Link>
          )}
          {pendingRequests > 0 && (
            <Link to="/manager/requests" className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors">
              <FiFileText size={14} className="text-violet-600" />
              <div className="flex-1"><p className="text-sm font-semibold text-violet-800">{pendingRequests} Employee Request{pendingRequests !== 1 ? 's' : ''} to Review</p></div>
              <FiArrowRight size={13} className="text-violet-500" />
            </Link>
          )}
          {overdueProjects > 0 && (
            <Link to="/manager/projects" className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
              <FiAlertTriangle size={14} className="text-red-600" />
              <div className="flex-1"><p className="text-sm font-semibold text-red-800">{overdueProjects} Overdue Project{overdueProjects !== 1 ? 's' : ''}</p></div>
              <FiArrowRight size={13} className="text-red-500" />
            </Link>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Projects */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary font-heading">Recent Projects</h3>
            <Link to="/manager/projects" className="text-secondary text-xs hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {recentProjects.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No projects yet.</p>
            ) : recentProjects.map(p => (
              <div key={p._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.status === 'active' ? 'bg-emerald-500' : p.status === 'overdue' ? 'bg-red-500' : p.status === 'completed' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.client?.name || 'Internal'} · {p.progress || 0}% done</p>
                </div>
                <div className="w-16">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                </div>
                <span className={`badge text-[10px] capitalize shrink-0 ${p.status === 'active' ? 'badge-green' : p.status === 'overdue' ? 'badge-red' : p.status === 'completed' ? 'badge-blue' : 'badge-gray'}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4 flex items-center gap-2"><FiActivity size={15} className="text-secondary" /> Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink to="/manager/projects" icon={FiFolder} label="Projects" color="hover:bg-blue-50 hover:border-blue-200 border-slate-100" />
            <QuickLink to="/manager/leaves" icon={FiCalendar} label="Leave Approval" color="hover:bg-amber-50 hover:border-amber-200 border-slate-100" />
            <QuickLink to="/manager/work-logs" icon={FiClipboard} label="Work Logs" color="hover:bg-cyan-50 hover:border-cyan-200 border-slate-100" />
            <QuickLink to="/manager/requests" icon={FiFileText} label="Requests" color="hover:bg-violet-50 hover:border-violet-200 border-slate-100" />
            <QuickLink to="/manager/team" icon={FiUsers} label="My Team" color="hover:bg-green-50 hover:border-green-200 border-slate-100" />
            <QuickLink to="/manager/messages" icon={FiBarChart2} label="Messages" color="hover:bg-slate-50 hover:border-slate-300 border-slate-100" />
          </div>

          {/* Leave requests preview */}
          {leaves.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pending Leaves</p>
              <div className="space-y-2">
                {leaves.slice(0, 3).map(l => (
                  <div key={l._id} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{l.employee?.userId?.name || 'Employee'}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{l.leaveType} · {l.days} day{l.days !== 1 ? 's' : ''}</p>
                    </div>
                    <Link to="/manager/leaves" className="text-xs text-amber-600 font-semibold hover:underline">Review →</Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
