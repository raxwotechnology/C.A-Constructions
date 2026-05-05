import DataTable from '../../components/ui/DataTable'
import SectionHeader from '../../components/ui/SectionHeader'
import { FiTrendingUp, FiClock, FiCheckCircle } from 'react-icons/fi'

const rows = [
  { id: 1, project: 'Client Portal Revamp', owner: 'Dilshan', status: 'Active', completion: '74%' },
  { id: 2, project: 'Enterprise Payroll API', owner: 'Madusha', status: 'Planning', completion: '18%' },
  { id: 3, project: 'Sales Dashboard', owner: 'Nuwan', status: 'Review', completion: '92%' },
]

export default function ManagerProjects() {
  const columns = [
    { key: 'project', label: 'Project' },
    { key: 'owner', label: 'Owner' },
    { key: 'status', label: 'Status' },
    { key: 'completion', label: 'Completion' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Project Tracking" subtitle="Monitor delivery timeline, health, and ownership." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Active</p><p className="text-2xl font-bold text-primary">8</p><p className="text-xs text-slate-400 mt-1"><FiTrendingUp className="inline mr-1" />On momentum</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">On Time</p><p className="text-2xl font-bold text-primary">91%</p><p className="text-xs text-slate-400 mt-1"><FiCheckCircle className="inline mr-1" />Delivery quality</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs text-slate-500 uppercase">At Risk</p><p className="text-2xl font-bold text-primary">2</p><p className="text-xs text-slate-400 mt-1"><FiClock className="inline mr-1" />Needs review</p></div>
      </div>
      <DataTable columns={columns} rows={rows} />
    </div>
  )
}
