import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { motion } from 'framer-motion'
import { FiTarget, FiTrendingUp, FiAward, FiClock, FiCheckSquare, FiZap } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const ProgressRing = ({ value, max, color, size = 80 }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox="0 0 70 70" className="-rotate-90">
      <circle cx="35" cy="35" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  )
}

export default function EmployeePerformance() {
  const { data: targetData, isLoading: targetLoading } = useQuery({
    queryKey: ['my-targets'],
    queryFn: () => api.get('/targets').then(r => r.data),
  })

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ['my-worklogs-perf'],
    queryFn: () => api.get('/work-logs/my').then(r => r.data),
  })

  const { data: projectData } = useQuery({
    queryKey: ['my-projects-perf'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const targets = targetData?.targets || []
  const logs = logData?.logs || []
  const projects = projectData?.projects || []

  // Work log stats
  const totalHours = logs.reduce((s, l) => s + (l.totalHours || 0), 0)
  const thisWeekLogs = logs.filter(l => {
    const d = new Date(l.date)
    const now = new Date()
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
    return d >= weekAgo
  })
  const weekHours = thisWeekLogs.reduce((s, l) => s + (l.totalHours || 0), 0)

  // Last 8 work log days chart
  const logChartData = logs.slice(0, 8).reverse().map(l => ({
    date: new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: l.totalHours || 0,
    approved: l.approvalStatus === 'approved' ? l.totalHours : 0,
  }))

  // Project completion stats
  const completedProjects = projects.filter(p => ['completed', 'paid_completed'].includes(p.status)).length
  const activeProjects = projects.filter(p => p.status === 'active').length

  // Targets breakdown
  const achievedTargets = targets.filter(t => t.status === 'achieved').length
  const activeTargets = targets.filter(t => t.status === 'active' || t.status === 'partial').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance</h1>
          <p className="page-subtitle">Track your targets, hours, and achievement stats.</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Hours Logged', val: `${totalHours}h`, sub: `${weekHours}h this week`, color: 'kpi-blue', icon: FiClock },
          { label: 'Work Logs', val: logs.length, sub: `${thisWeekLogs.length} this week`, color: 'kpi-green', icon: FiCheckSquare },
          { label: 'Projects', val: activeProjects, sub: `${completedProjects} completed`, color: 'kpi-purple', icon: FiZap },
          { label: 'Targets Achieved', val: achievedTargets, sub: `${activeTargets} in progress`, color: 'kpi-orange', icon: FiAward },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`kpi-card ${c.color}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{c.label}</p>
            <p className="text-3xl font-black text-primary mt-1">{c.val}</p>
            <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Work Hours Chart */}
      {logChartData.length > 0 && (
        <div className="card card-body">
          <h3 className="font-bold text-primary mb-4">Daily Hours — Last 8 Logs</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={logChartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="hours" name="Hours" fill="#2563EB" radius={[6, 6, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Targets */}
      <div className="card card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-primary">My Targets</h3>
          {targetLoading && <div className="w-5 h-5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />}
        </div>

        {targets.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FiTarget size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No targets assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map((target, i) => {
              const pct = target.targetValue > 0 ? Math.min(100, Math.round((target.achievedValue / target.targetValue) * 100)) : 0
              const statusColor = target.status === 'achieved' ? '#10B981' : target.status === 'partial' ? '#F59E0B' : '#3B82F6'
              return (
                <motion.div key={target._id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  className={`p-4 rounded-2xl border flex items-center gap-4 ${target.status === 'achieved' ? 'bg-emerald-50 border-emerald-200' : target.status === 'partial' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50/50 border-blue-100'}`}>
                  <div className="relative shrink-0">
                    <ProgressRing value={target.achievedValue} max={target.targetValue} color={statusColor} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black rotate-90" style={{ color: statusColor }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-primary truncate">{target.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${target.status === 'achieved' ? 'bg-emerald-200 text-emerald-800' : target.status === 'partial' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
                        {target.status === 'achieved' ? '🏆 Achieved' : target.status === 'partial' ? '📈 In Progress' : '🎯 Active'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{target.description}</p>
                    <div className="relative h-2 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: statusColor }} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-slate-500">
                      <span>{target.achievedValue} / {target.targetValue} {target.unit || 'projects'}</span>
                      {target.bonusEnabled && target.bonusAmount > 0 && (
                        <span className="text-emerald-600 font-semibold">🎁 LKR {target.bonusAmount.toLocaleString()} bonus</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent work log summary */}
      <div className="card card-body">
        <h3 className="font-bold text-primary mb-4">Recent Work Logs</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-2 text-left text-xs text-slate-400 font-semibold uppercase">Date</th>
                  <th className="pb-2 text-left text-xs text-slate-400 font-semibold uppercase">Tasks</th>
                  <th className="pb-2 text-center text-xs text-slate-400 font-semibold uppercase">Hours</th>
                  <th className="pb-2 text-center text-xs text-slate-400 font-semibold uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.slice(0, 7).map(log => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 text-slate-600 font-medium">
                      {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2.5 text-slate-500">{log.tasks?.length || 0} task{log.tasks?.length !== 1 ? 's' : ''}</td>
                    <td className="py-2.5 text-center font-bold text-secondary">{log.totalHours}h</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${log.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : log.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {log.approvalStatus === 'approved' ? '✓ Approved' : log.approvalStatus === 'rejected' ? '✗ Rejected' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
