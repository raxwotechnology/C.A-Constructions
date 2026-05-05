import { useQuery } from '@tanstack/react-query'
import { FiFolder, FiCalendar, FiTrendingUp } from 'react-icons/fi'
import api from '../../lib/api'

export default function DeveloperProjects() {
  const { data, isLoading } = useQuery({
    queryKey: ['developer-projects'],
    queryFn: () => api.get('/projects').then((r) => r.data),
  })
  const projects = data?.projects || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Projects</h1>
          <p className="page-subtitle">Track progress and delivery milestones for assigned projects.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-10 text-center"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" /></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p._id} className="card p-5 card-hover">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-primary">{p.title}</h3>
                <span className={`badge capitalize ${p.status === 'active' ? 'badge-green' : p.status === 'completed' ? 'badge-blue' : 'badge-yellow'}`}>{p.status}</span>
              </div>
              <p className="text-sm text-slate-600 min-h-10">{p.description || 'No description available'}</p>
              <div className="mt-4 space-y-2">
                <div className="progress-bar">
                  <div className="progress-fill bg-gradient-blue" style={{ width: `${p.progress || 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><FiTrendingUp size={12} /> {p.progress || 0}% complete</span>
                  <span className="flex items-center gap-1"><FiCalendar size={12} /> {p.deadline ? new Date(p.deadline).toLocaleDateString() : 'No deadline'}</span>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 ? <div className="card p-8 text-center text-slate-400 md:col-span-2 xl:col-span-3"><FiFolder size={26} className="mx-auto mb-2 opacity-30" />No projects assigned.</div> : null}
        </div>
      )}
    </div>
  )
}
