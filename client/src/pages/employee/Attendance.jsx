import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'

export default function DeveloperAttendance() {
  const { data } = useQuery({
    queryKey: ['developer-attendance'],
    queryFn: () => api.get('/attendance/my').then((r) => r.data),
  })
  const records = data?.records || []

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="My Attendance" subtitle="Track your attendance history and monthly consistency." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Present Days</p><p className="text-2xl font-bold text-primary">{records.filter(r=>r.status==='present').length}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Leaves</p><p className="text-2xl font-bold text-primary">{records.filter(r=>r.status==='leave').length}</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs text-slate-500 uppercase">Half Days</p><p className="text-2xl font-bold text-primary">{records.filter(r=>r.status==='half_day').length}</p></div>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead>
          <tbody>
            {records.map((row) => (
              <tr key={row._id}>
                <td>{new Date(row.date).toLocaleDateString()}</td>
                <td><span className="badge badge-green capitalize">{row.status}</span></td>
                <td>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : '-'}</td>
                <td>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : '-'}</td>
              </tr>
            ))}
            {records.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-slate-400">No attendance records found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
