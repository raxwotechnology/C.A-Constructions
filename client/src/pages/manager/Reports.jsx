import { FiDownload } from 'react-icons/fi'
import SectionHeader from '../../components/ui/SectionHeader'

export default function ManagerReports() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Manager Reports"
        subtitle="Generate operational and workforce reports for stakeholders."
        action={<button type="button" className="btn-primary btn-sm"><FiDownload size={14} /> Export Summary</button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Weekly Reports</p><p className="text-2xl font-bold text-primary">12</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Utilization</p><p className="text-2xl font-bold text-primary">87%</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs text-slate-500 uppercase">Hiring Funnel</p><p className="text-2xl font-bold text-primary">34</p></div>
      </div>

      <div className="card p-6">
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex items-center justify-between"><span>Weekly delivery report</span><span className="badge badge-green">Ready</span></li>
          <li className="flex items-center justify-between"><span>Team utilization report</span><span className="badge badge-blue">Ready</span></li>
          <li className="flex items-center justify-between"><span>CV screening report</span><span className="badge badge-yellow">Needs review</span></li>
        </ul>
      </div>
    </div>
  )
}
