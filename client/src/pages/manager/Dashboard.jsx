import { FiUsers, FiFolder, FiClock, FiBarChart2, FiTrendingUp, FiTarget } from 'react-icons/fi'
import StatCard from '../../components/ui/StatCard'

export default function ManagerDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-hero rounded-3xl p-7 md:p-8 text-white shadow-navy relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 blur-xl" />
        <p className="text-white/70 text-sm">Operations Overview</p>
        <h1 className="text-3xl md:text-4xl font-heading font-bold mt-2">Manager Dashboard</h1>
        <p className="text-white/80 text-sm mt-2">Team performance, delivery progress, and hiring pipeline at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Active Projects" value="12" subtitle="3 at risk" icon={FiFolder} tone="blue" index={0} />
        <StatCard title="Team Capacity" value="84%" subtitle="Healthy utilization" icon={FiUsers} tone="green" index={1} />
        <StatCard title="Pending Reviews" value="9" subtitle="CV + sprint approvals" icon={FiClock} tone="orange" index={2} />
        <StatCard title="Delivery KPI" value="91%" subtitle="On-time this quarter" icon={FiBarChart2} tone="navy" index={3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-primary font-heading mb-4">Project Health</h3>
          <div className="space-y-3">
            {['Client Portal Revamp', 'Recruitment Automation', 'Finance BI Upgrade'].map((name, i) => (
              <div key={name} className="flex items-center justify-between">
                <p className="text-sm text-slate-700">{name}</p>
                <span className={`badge ${i === 1 ? 'badge-yellow' : 'badge-green'}`}>{i === 1 ? 'Needs review' : 'On track'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-primary font-heading mb-4">Hiring Snapshot</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>New applications today: <span className="font-semibold text-primary">18</span></p>
            <p>Shortlisted candidates: <span className="font-semibold text-primary">7</span></p>
            <p>Interviews this week: <span className="font-semibold text-primary">11</span></p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="dashboard-shell p-5">
          <p className="text-sm text-slate-500">Velocity</p>
          <p className="text-2xl font-bold text-primary mt-2">+14%</p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><FiTrendingUp /> vs last sprint</p>
        </div>
        <div className="dashboard-shell p-5">
          <p className="text-sm text-slate-500">Target Completion</p>
          <p className="text-2xl font-bold text-primary mt-2">88%</p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><FiTarget /> quarterly objective</p>
        </div>
        <div className="dashboard-shell p-5">
          <p className="text-sm text-slate-500">Escalations</p>
          <p className="text-2xl font-bold text-primary mt-2">2</p>
          <p className="text-xs text-slate-400 mt-1">No critical blockers</p>
        </div>
      </div>
    </div>
  )
}
