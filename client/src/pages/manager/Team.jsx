import SectionHeader from '../../components/ui/SectionHeader'

export default function ManagerTeam() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Team Management" subtitle="Capacity, skills, and sprint allocation for each developer." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Developers</p><p className="text-2xl font-bold text-primary">12</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Utilization</p><p className="text-2xl font-bold text-primary">84%</p></div>
        <div className="kpi-card kpi-navy"><p className="text-xs text-slate-500 uppercase">Open Positions</p><p className="text-2xl font-bold text-primary">3</p></div>
      </div>
      <div className="card p-6">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'Frontend Pod', value: '7 members', status: 'On schedule' },
            { name: 'Backend Pod', value: '5 members', status: 'On schedule' },
            { name: 'QA Pod', value: '4 members', status: 'Hiring in progress' },
          ].map((item) => (
            <div key={item.name} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/70 hover:bg-white transition-colors">
              <p className="font-semibold text-primary">{item.name}</p>
              <p className="text-sm text-slate-600 mt-1">{item.value}</p>
              <p className="text-xs text-slate-500 mt-2">{item.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
