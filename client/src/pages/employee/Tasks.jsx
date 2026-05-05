import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { FiCheckSquare, FiClock, FiAlertCircle } from 'react-icons/fi'

export default function EmployeeTasks() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const projects = data?.projects || []
  const allTasks = projects.flatMap(p => (p.tasks || []).filter(t => t.assignedTo?._id === user?._id || t.assignedTo === user?._id).map(t => ({ ...t, projectTitle: p.title, projectId: p._id })))

  const byStatus = (s) => allTasks.filter(t => t.status === s)
  const priorityColor = { low:'badge-gray', medium:'badge-yellow', high:'badge-red' }
  const statusColor = { todo:'badge-gray', in_progress:'badge-blue', review:'badge-yellow', done:'badge-green' }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">My Tasks</h1><p className="page-subtitle">{allTasks.length} tasks assigned</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label:'To Do', count:byStatus('todo').length, icon:FiAlertCircle, color:'kpi-gray' },
          { label:'In Progress', count:byStatus('in_progress').length, icon:FiClock, color:'kpi-blue' },
          { label:'In Review', count:byStatus('review').length, icon:FiClock, color:'kpi-navy' },
          { label:'Done', count:byStatus('done').length, icon:FiCheckSquare, color:'kpi-green' },
        ].map(s=>(
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-primary font-heading">{s.count}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
      ) : allTasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiCheckSquare size={40} className="mx-auto mb-2 opacity-30"/><p>No tasks assigned to you</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allTasks.map(task => (
            <div key={task._id} className="card card-body flex items-start gap-4 card-hover">
              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${task.status==='done'?'bg-green-500':task.status==='in_progress'?'bg-blue-500':task.status==='review'?'bg-yellow-500':'bg-gray-300'}`}/>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800">{task.title}</h3>
                  <span className={`badge ${statusColor[task.status]} text-xs capitalize`}>{task.status?.replace('_',' ')}</span>
                  {task.priority && <span className={`badge ${priorityColor[task.priority]} text-xs capitalize`}>{task.priority}</span>}
                </div>
                {task.description && <p className="text-sm text-gray-500 mb-1">{task.description}</p>}
                <p className="text-xs text-gray-400">Project: <span className="font-medium text-gray-600">{task.projectTitle}</span></p>
                {task.dueDate && <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(task.dueDate).toLocaleDateString('en-LK')}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
