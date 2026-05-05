import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts'
import { FiUsers, FiFolder, FiBriefcase, FiDollarSign, FiClock, FiTrendingUp, FiUserPlus, FiAlertCircle } from 'react-icons/fi'

const COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    refetchInterval: 60000,
  })

  const kpis = data?.kpis || {}
  const charts = data?.charts || {}
  const recent = data?.recent || {}

  const revenueChart = (charts.revenueData || []).map(d => ({
    month: months[d._id - 1], revenue: d.total
  }))

  const projectPie = (charts.projectStatus || []).map(d => ({
    name: d._id, value: d.count
  }))

  const payrollChart = (charts.payrollCost || []).map(d => ({
    month: months[d._id - 1], cost: d.total
  }))

  const attendanceChart = (charts.attendanceByStatus || []).map(d => ({
    name: d._id, value: d.count
  }))

  const salaryDist = (charts.salaryDistribution || []).map((b) => ({
    name: typeof b._id === 'number' ? `${Number(b._id).toLocaleString()}+` : String(b._id),
    value: b.count,
  }))

  const progressBuckets = (charts.projectProgress || []).map((b) => ({
    name: b._id === 0 ? '0–24%' : b._id === 25 ? '25–49%' : b._id === 50 ? '50–74%' : b._id === 75 ? '75–99%' : b._id === 100 ? '100%' : String(b._id),
    value: b.count,
  }))

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
    </div>
  )

  const kpiCards = [
    { label: 'Total Employees', value: kpis.totalEmployees || 0, sub: `${kpis.activeEmployees || 0} active`, icon: FiUsers, color: 'kpi-blue', iconBg: 'bg-blue-50 text-blue-600' },
    { label: 'Active Projects', value: kpis.activeProjects || 0, sub: `${kpis.completedProjects || 0} completed`, icon: FiFolder, color: 'kpi-green', iconBg: 'bg-green-50 text-green-600' },
    { label: 'Open Applications', value: kpis.newApplications || 0, sub: `${kpis.totalApplications || 0} total`, icon: FiBriefcase, color: 'kpi-purple', iconBg: 'bg-purple-50 text-purple-600' },
    { label: 'Pending Leaves', value: kpis.pendingLeaves || 0, sub: 'Awaiting approval', icon: FiClock, color: 'kpi-navy', iconBg: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome back — here's what's happening at Raxwo today.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/employees" className="btn-outline btn-sm">Add Employee</Link>
          <Link to="/admin/projects" className="btn-primary btn-sm">New Project</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`kpi-card ${card.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-primary font-heading">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon size={20} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card card-body">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-primary font-heading">Revenue Overview</h3>
              <p className="text-xs text-gray-400 mt-0.5">Monthly revenue for {new Date().getFullYear()}</p>
            </div>
            <span className="badge badge-green">Live</span>
          </div>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`LKR ${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '10px', border: '1px solid #f0f0f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#rev)" dot={{ fill: '#2563EB', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              No revenue data for this year yet
            </div>
          )}
        </div>

        {/* Project Status Pie */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-1">Project Status</h3>
          <p className="text-xs text-gray-400 mb-4">Distribution by status</p>
          {projectPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={projectPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {projectPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'capitalize' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No project data</div>
          )}
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card card-body">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-primary font-heading">Payroll Cost</h3>
              <p className="text-xs text-gray-400 mt-0.5">Monthly salary cost (approved/paid)</p>
            </div>
          </div>
          {payrollChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={payrollChart}>
                <defs>
                  <linearGradient id="payrollFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`LKR ${Number(v).toLocaleString()}`, 'Cost']} contentStyle={{ borderRadius: '10px', border: '1px solid #f0f0f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="cost" stroke="#22C55E" strokeWidth={2.5} fill="url(#payrollFill)" dot={{ fill: '#22C55E', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No payroll data</div>
          )}
        </div>

        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-1">Attendance Analytics</h3>
          <p className="text-xs text-gray-400 mb-4">This month (records)</p>
          {attendanceChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={attendanceChart} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {attendanceChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'capitalize' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No attendance records</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card card-body lg:col-span-2">
          <h3 className="font-bold text-primary font-heading mb-1">Project Progress</h3>
          <p className="text-xs text-gray-400 mb-4">Distribution by completion</p>
          {progressBuckets.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={progressBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No project progress data</div>
          )}
        </div>

        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-1">Salary Distribution</h3>
          <p className="text-xs text-gray-400 mb-4">Active employees by basic salary bucket</p>
          {salaryDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salaryDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#5b21b6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No salary data</div>
          )}
        </div>
      </div>

      {/* Department Distribution + Recent */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dept stats */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4">Team by Department</h3>
          <div className="space-y-3">
            {(charts.deptDist || []).slice(0, 6).map((d, i) => (
              <div key={d._id} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-600 font-medium truncate">{d._id}</div>
                <div className="flex-1 progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.round((d.count / (kpis.totalEmployees || 1)) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
                <span className="w-6 text-xs text-gray-500 text-right">{d.count}</span>
              </div>
            ))}
            {(charts.deptDist || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">No department data</p>}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary font-heading">Recent Projects</h3>
            <Link to="/admin/projects" className="text-secondary text-xs font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {(recent.recentProjects || []).slice(0, 5).map(p => (
              <div key={p._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <FiFolder className="text-secondary" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400">{p.client?.name || 'Internal'}</p>
                </div>
                <span className={`badge text-xs capitalize
                  ${p.status === 'active' ? 'badge-green' : p.status === 'completed' ? 'badge-blue' : 'badge-yellow'}`}>
                  {p.status}
                </span>
              </div>
            ))}
            {(recent.recentProjects || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">No projects yet</p>}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Add Employee', to: '/admin/employees', icon: FiUserPlus, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
          { label: 'Generate Payroll', to: '/admin/payroll', icon: FiDollarSign, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
          { label: 'View Leaves', to: '/admin/leaves', icon: FiAlertCircle, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
          { label: 'Recruitment', to: '/admin/recruitment', icon: FiBriefcase, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
        ].map(a => (
          <Link key={a.label} to={a.to} className={`card card-body flex items-center gap-3 cursor-pointer transition-colors ${a.color}`}>
            <a.icon size={18} />
            <span className="text-sm font-medium">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
