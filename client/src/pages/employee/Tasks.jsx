import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiCheckSquare, FiClock, FiAlertCircle, FiChevronDown, FiChevronUp, FiCalendar, FiFlag, FiSliders } from 'react-icons/fi'

const STATUS_OPTIONS = [
  { val: 'todo', label: 'To Do', color: 'bg-slate-200 text-slate-700' },
  { val: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { val: 'review', label: 'In Review', color: 'bg-amber-100 text-amber-700' },
  { val: 'done', label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
]

const PRIORITY_CONFIG = {
  low: { color: 'badge-gray', dot: 'bg-slate-400' },
  medium: { color: 'badge-yellow', dot: 'bg-amber-500' },
  high: { color: 'badge-red', dot: 'bg-red-500' },
}

const ProgressBar = ({ progress }) => (
  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
    <div className="h-full rounded-full bg-gradient-to-r from-secondary to-blue-400 transition-all duration-500"
      style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }} />
  </div>
)

const isOverdue = (dueDate, status) => dueDate && status !== 'done' && new Date(dueDate) < new Date()

export default function EmployeeTasks() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [expandedTask, setExpandedTask] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const projects = data?.projects || []
  const allTasks = projects.flatMap(p =>
    (p.tasks || [])
      .filter(t => t.assignedTo?._id === user?._id || t.assignedTo === user?._id)
      .map(t => ({ ...t, projectTitle: p.title, projectId: p._id }))
  )

  const filtered = allTasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  const byStatus = (s) => allTasks.filter(t => t.status === s)
  const completionPct = allTasks.length > 0 ? Math.round((byStatus('done').length / allTasks.length) * 100) : 0

  const updateTaskMut = useMutation({
    mutationFn: ({ projectId, taskId, updates }) =>
      api.put(`/projects/${projectId}/tasks/${taskId}`, updates).then(r => r.data),
    onSuccess: () => {
      toast.success('Task updated!')
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      setUpdatingId(null)
    },
    onError: e => { toast.error(e.response?.data?.message || 'Failed'); setUpdatingId(null) }
  })

  const handleStatusChange = (task, newStatus) => {
    setUpdatingId(task._id)
    updateTaskMut.mutate({ projectId: task.projectId, taskId: task._id, updates: { status: newStatus } })
  }

  const handleProgressChange = (task, progress) => {
    updateTaskMut.mutate({ projectId: task.projectId, taskId: task._id, updates: { progress: Number(progress) } })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{allTasks.length} assigned · {completionPct}% complete</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="form-select text-sm py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
          </select>
          <select className="form-select text-sm py-1.5" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'To Do', count: byStatus('todo').length, color: 'kpi-gray', icon: FiAlertCircle },
          { label: 'In Progress', count: byStatus('in_progress').length, color: 'kpi-blue', icon: FiClock },
          { label: 'In Review', count: byStatus('review').length, color: 'kpi-orange', icon: FiSliders },
          { label: 'Completed', count: byStatus('done').length, color: 'kpi-green', icon: FiCheckSquare },
        ].map(s => (
          <div key={s.label} className={`kpi-card ${s.color} cursor-pointer`}
            onClick={() => setFilterStatus(filterStatus === s.label.toLowerCase().replace(' ', '_') ? 'all' : s.label.toLowerCase().replace(' ', '_'))}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-primary">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      {allTasks.length > 0 && (
        <div className="card card-body">
          <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-primary text-sm">Overall Progress</p>
            <span className="text-sm font-bold text-secondary">{completionPct}%</span>
          </div>
          <ProgressBar progress={completionPct} />
          <p className="text-xs text-slate-400 mt-1">{byStatus('done').length} of {allTasks.length} tasks done</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FiCheckSquare size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No tasks match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task, idx) => {
            const overdue = isOverdue(task.dueDate, task.status)
            const pct = task.progress || (task.status === 'done' ? 100 : task.status === 'in_progress' ? 50 : task.status === 'review' ? 80 : 0)
            const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low
            const isExpanded = expandedTask === task._id

            return (
              <motion.div key={task._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className={`card overflow-hidden border ${overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="p-4 flex items-start gap-3">
                  {/* Status dot */}
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-blue-500' : task.status === 'review' ? 'bg-amber-500' : 'bg-slate-300'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <h3 className={`font-semibold ${task.status === 'done' ? 'line-through text-slate-400' : 'text-primary'}`}>{task.title}</h3>
                      {task.priority && (
                        <span className={`badge ${priorityCfg.color} text-[10px] capitalize shrink-0`}>
                          <FiFlag size={9} /> {task.priority}
                        </span>
                      )}
                      {overdue && <span className="badge badge-red text-[10px]">Overdue</span>}
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <ProgressBar progress={pct} />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
                      <span className="font-medium text-slate-600">{task.projectTitle}</span>
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : ''}`}>
                          <FiCalendar size={11} /> {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="font-semibold text-secondary">{pct}%</span>
                    </div>
                  </div>

                  {/* Status changer */}
                  <div className="flex items-center gap-2 shrink-0">
                    {updatingId === task._id ? (
                      <div className="w-5 h-5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                    ) : (
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-secondary cursor-pointer"
                        onClick={e => e.stopPropagation()}>
                        {STATUS_OPTIONS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                      </select>
                    )}
                    <button onClick={() => setExpandedTask(isExpanded ? null : task._id)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                      {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded: progress slider + description */}
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }}
                    className="border-t border-slate-100 p-4 bg-slate-50/60 space-y-3">
                    {task.description && (
                      <p className="text-sm text-slate-600">{task.description}</p>
                    )}
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-500">Update Progress</label>
                        <span className="text-xs font-bold text-secondary">{pct}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="5"
                        defaultValue={pct}
                        onChange={e => handleProgressChange(task, e.target.value)}
                        className="w-full accent-secondary h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>0%</span><span>50%</span><span>100%</span>
                      </div>
                    </div>
                    {task.completedAt && (
                      <p className="text-xs text-emerald-600 font-medium">✓ Completed {new Date(task.completedAt).toLocaleDateString()}</p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
