import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { FiDownload, FiBarChart2, FiCalendar, FiUsers, FiFolder, FiClock, FiCheckSquare, FiFileText } from 'react-icons/fi'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#f59e0b', '#ef4444', '#06b6d4']
const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ManagerReports() {
  const [range, setRange] = useState('month')

  const { data: projData } = useQuery({
    queryKey: ['mgr-report-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })
  const { data: empData } = useQuery({
    queryKey: ['mgr-report-employees'],
    queryFn: () => api.get('/employees').then(r => r.data),
  })
  const { data: logData } = useQuery({
    queryKey: ['mgr-report-worklogs'],
    queryFn: () => api.get('/work-logs').then(r => r.data),
  })
  const { data: leaveData } = useQuery({
    queryKey: ['mgr-report-leaves'],
    queryFn: () => api.get('/leaves').then(r => r.data),
  })

  const projects = projData?.projects || []
  const employees = empData?.employees || []
  const logs = logData?.logs || []
  const leaves = leaveData?.leaves || []

  // ── Project Status Distribution ─────────────────────────────────────────────
  const projectStatusData = Object.entries(
    projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  // ── Project Progress Buckets ─────────────────────────────────────────────────
  const progressBuckets = [
    { name: '0–25%', value: projects.filter(p => (p.progress || 0) < 25).length },
    { name: '25–50%', value: projects.filter(p => (p.progress || 0) >= 25 && (p.progress || 0) < 50).length },
    { name: '50–75%', value: projects.filter(p => (p.progress || 0) >= 50 && (p.progress || 0) < 75).length },
    { name: '75–99%', value: projects.filter(p => (p.progress || 0) >= 75 && (p.progress || 0) < 100).length },
    { name: '100%', value: projects.filter(p => (p.progress || 0) === 100).length },
  ]

  // ── Department Headcount ─────────────────────────────────────────────────────
  const deptData = Object.entries(
    employees.reduce((acc, e) => { const d = e.department || 'Unknown'; acc[d] = (acc[d] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // ── Leave by Type ────────────────────────────────────────────────────────────
  const leaveTypeData = Object.entries(
    leaves.reduce((acc, l) => { acc[l.leaveType] = (acc[l.leaveType] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  // ── Monthly Work Logs ────────────────────────────────────────────────────────
  const logsByMonth = months.map((m, i) => ({
    month: m,
    logs: logs.filter(l => new Date(l.date || l.createdAt).getMonth() === i).length,
  }))

  // ── Export CSV ───────────────────────────────────────────────────────────────
  const exportCSV = (data, filename) => {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(r => Object.values(r).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  }

  const exportProjectReport = () => exportCSV(
    projects.map(p => ({
      title: `"${p.title}"`, status: p.status, progress: `${p.progress || 0}%`,
      client: p.client?.name || 'Internal', deadline: p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A',
    })),
    'project-report.csv'
  )

  const exportTeamReport = () => exportCSV(
    employees.map(e => ({
      name: `"${e.userId?.name || ''}"`, department: e.department || '', designation: e.designation || '',
      status: e.status, type: e.employmentType || 'permanent',
    })),
    'team-report.csv'
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Reports</h1>
          <p className="page-subtitle">Operational analytics, delivery health, and workforce insights.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportProjectReport} className="btn-outline btn-sm gap-1.5">
            <FiDownload size={13} /> Projects CSV
          </button>
          <button onClick={exportTeamReport} className="btn-outline btn-sm gap-1.5">
            <FiDownload size={13} /> Team CSV
          </button>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', val: projects.length, sub: `${projects.filter(p => p.status === 'active').length} active`, icon: FiFolder, color: 'kpi-blue' },
          { label: 'Team Members', val: employees.filter(e => e.status === 'active').length, sub: 'Active headcount', icon: FiUsers, color: 'kpi-green' },
          { label: 'Work Logs This Month', val: logs.filter(l => new Date(l.date || l.createdAt).getMonth() === new Date().getMonth()).length, sub: 'Daily submissions', icon: FiClock, color: 'kpi-navy' },
          { label: 'Pending Leaves', val: leaves.filter(l => l.status === 'pending').length, sub: 'Awaiting approval', icon: FiCalendar, color: 'kpi-orange' },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`kpi-card ${k.color}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{k.label}</p>
            <p className="text-2xl font-black text-primary mt-1">{k.val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Project Status */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4 flex items-center gap-2"><FiFolder size={15} className="text-secondary" /> Project Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={projectStatusData} dataKey="value" outerRadius={85} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {projectStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Headcount */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4 flex items-center gap-2"><FiUsers size={15} className="text-secondary" /> Department Headcount</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]} name="Members">
                {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Project Progress Buckets */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4 flex items-center gap-2"><FiCheckSquare size={15} className="text-secondary" /> Project Progress Buckets</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={progressBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Projects" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Work Logs Trend */}
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4 flex items-center gap-2"><FiClock size={15} className="text-secondary" /> Monthly Work Log Submissions</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={logsByMonth}>
              <defs>
                <linearGradient id="logFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="logs" stroke="#2563eb" fill="url(#logFill)" name="Work Logs" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leave Analysis */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-4 flex items-center gap-2"><FiFileText size={15} className="text-secondary" /> Leave Requests by Type</h3>
          {leaveTypeData.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No leave data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leaveTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Requests">
                  {leaveTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent projects table */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary font-heading">Project Health Overview</h3>
          </div>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {projects.slice(0, 8).map(p => (
              <div key={p._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  p.status === 'active' ? 'bg-emerald-500' : p.status === 'overdue' ? 'bg-red-500' : p.status === 'completed' ? 'bg-blue-500' : 'bg-slate-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{p.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-8 text-right">{p.progress || 0}%</span>
                </div>
              </div>
            ))}
            {projects.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No projects yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
