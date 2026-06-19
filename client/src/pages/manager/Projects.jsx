import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { FiFolder, FiCalendar, FiTrendingUp, FiAlertTriangle, FiSearch, FiFilter, FiClock, FiCheckCircle, FiUser, FiChevronDown, FiChevronUp, FiTarget } from 'react-icons/fi'

const STATUS_CONFIG = {
  planning:   { label: 'Planning',   cls: 'badge-blue' },
  active:     { label: 'Active',     cls: 'badge-green' },
  on_hold:    { label: 'On Hold',    cls: 'badge-yellow' },
  overdue:    { label: 'Overdue',    cls: 'badge-red' },
  completed:  { label: 'Completed',  cls: 'badge-navy' },
  paid_completed: { label: 'Paid & Complete', cls: 'badge-green' },
  cancelled:  { label: 'Cancelled',  cls: 'badge-gray' },
}

const PRIORITY_COLORS = {
  critical: 'text-red-600 bg-red-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-slate-600 bg-slate-100',
}

function ProjectCard({ p, expanded, onToggle }) {
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.planning
  const isOverdue = p.deadline && new Date(p.deadline) < new Date() && !['completed','paid_completed','cancelled'].includes(p.status)
  const totalTasks = p.tasks?.length || 0
  const doneTasks = p.tasks?.filter(t => t.status === 'done').length || 0

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`card border transition-all duration-200 overflow-hidden ${isOverdue ? 'border-red-200 shadow-red-50' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'}`}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${p.status === 'active' ? 'bg-emerald-500' : p.status === 'overdue' ? 'bg-red-500' : p.status === 'completed' ? 'bg-blue-500' : 'bg-slate-300'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-primary truncate">{p.title}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {isOverdue && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1"><FiAlertTriangle size={9} />OVERDUE</span>}
                <span className={`badge text-xs ${cfg.cls}`}>{cfg.label}</span>
              </div>
            </div>

            {p.client?.name && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><FiUser size={10} /> {p.client.name}</p>}

            {p.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.description}</p>}

            {/* Progress */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span className="flex items-center gap-1"><FiTrendingUp size={11} /> Progress</span>
                <span className="font-semibold">{p.progress || 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${(p.progress || 0) >= 100 ? 'bg-emerald-500' : (p.progress || 0) >= 70 ? 'bg-blue-500' : (p.progress || 0) >= 40 ? 'bg-amber-500' : 'bg-slate-400'}`}
                  style={{ width: `${p.progress || 0}%` }} />
              </div>
            </div>

            {/* Footer meta */}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
              {p.deadline && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                  <FiCalendar size={11} />{new Date(p.deadline).toLocaleDateString('en-LK')}
                </span>
              )}
              {totalTasks > 0 && <span className="flex items-center gap-1"><FiCheckCircle size={11} />{doneTasks}/{totalTasks} tasks</span>}
              {p.priority && (
                <span className={`px-2 py-0.5 rounded-full capitalize text-[10px] font-semibold ${PRIORITY_COLORS[p.priority] || PRIORITY_COLORS.low}`}>{p.priority}</span>
              )}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        {totalTasks > 0 && (
          <button onClick={onToggle} className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-secondary py-1 border-t border-slate-100 transition-colors">
            {expanded ? <><FiChevronUp size={12} /> Hide tasks</> : <><FiChevronDown size={12} /> Show {totalTasks} tasks</>}
          </button>
        )}
      </div>

      {/* Tasks expand */}
      <AnimatePresence>
        {expanded && totalTasks > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100">
            <div className="p-4 space-y-2 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tasks</p>
              {p.tasks.slice(0, 8).map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-slate-100 last:border-0">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {t.status === 'done' && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.title}</p>
                    {t.assignedTo?.name && <p className="text-[10px] text-slate-400">{t.assignedTo.name}</p>}
                  </div>
                  {typeof t.progress === 'number' && t.progress > 0 && (
                    <span className="text-[10px] text-slate-400 shrink-0">{t.progress}%</span>
                  )}
                </div>
              ))}
              {totalTasks > 8 && <p className="text-xs text-slate-400 text-center pt-1">+{totalTasks - 8} more tasks</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ManagerProjects() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['manager-all-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const projects = data?.projects || []

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.title?.toLowerCase().includes(q) || p.client?.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    const matchStatus = status === 'all' || p.status === status
    return matchSearch && matchStatus
  })

  // KPIs
  const active = projects.filter(p => p.status === 'active').length
  const overdue = projects.filter(p => p.status === 'overdue' || (p.deadline && new Date(p.deadline) < new Date() && !['completed','paid_completed','cancelled'].includes(p.status))).length
  const completed = projects.filter(p => ['completed','paid_completed'].includes(p.status)).length
  const avgProgress = projects.length ? Math.round(projects.reduce((a, p) => a + (p.progress || 0), 0) / projects.length) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Tracking</h1>
          <p className="page-subtitle">Monitor delivery timelines, task progress, and team performance.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', val: projects.length, color: 'kpi-blue', icon: FiFolder },
          { label: 'Active', val: active, color: 'kpi-green', icon: FiTrendingUp },
          { label: 'Overdue', val: overdue, color: overdue > 0 ? 'kpi-orange' : 'kpi-gray', icon: FiAlertTriangle },
          { label: 'Avg Progress', val: `${avgProgress}%`, color: 'kpi-navy', icon: FiTarget },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`kpi-card ${k.color} ${k.label === 'Overdue' && overdue > 0 ? 'ring-2 ring-offset-1 ring-red-300' : ''}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{k.label}</p>
            <p className="text-2xl font-black text-primary mt-1">{k.val}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="form-input !pl-10 w-full" placeholder="Search projects, clients..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[['all','All'], ['active','Active'], ['overdue','Overdue'], ['completed','Done'], ['planning','Planning']].map(([val, label]) => (
            <button key={val} onClick={() => setStatus(val)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${status === val ? 'bg-white shadow text-secondary' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FiFolder size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No projects found{search ? ` for "${search}"` : ''}.</p>
          {search && <button onClick={() => setSearch('')} className="btn-ghost mt-2 text-sm">Clear search</button>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard key={p._id} p={p}
              expanded={expanded === p._id}
              onToggle={() => setExpanded(expanded === p._id ? null : p._id)} />
          ))}
        </div>
      )}
    </div>
  )
}
