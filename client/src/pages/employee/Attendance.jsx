import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'

export default function DeveloperAttendance() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const { data } = useQuery({
    queryKey: ['developer-attendance', month, year],
    queryFn: () => api.get(`/attendance/my?month=${month}&year=${year}`).then((r) => r.data),
  })
  const records = data?.records || []
  const trendData = useMemo(() => {
    const map = {}
    records.forEach((r) => {
      const d = new Date(r.date).getDate()
      if (!map[d]) map[d] = { day: d, present: 0, absent: 0, leave: 0, half_day: 0 }
      const key = r.isHalfDay ? 'half_day' : r.status
      if (map[d][key] !== undefined) map[d][key] += 1
    })
    return Object.values(map).sort((a, b) => a.day - b.day)
  }, [records])

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="My Attendance" subtitle="Track your attendance history and monthly consistency." />
      <div className="card card-body grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div><label className="form-label">Month</label><input type="number" min={1} max={12} className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value || 1))} /></div>
        <div><label className="form-label">Year</label><input type="number" className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Present Days</p><p className="text-2xl font-bold text-primary">{records.filter(r=>r.status==='present').length}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Leaves</p><p className="text-2xl font-bold text-primary">{records.filter(r=>r.status==='leave').length}</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs text-slate-500 uppercase">Half Days</p><p className="text-2xl font-bold text-primary">{records.filter(r=>r.status==='half_day').length}</p></div>
      </div>
      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-3">Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="present" fill="#22c55e" />
            <Bar dataKey="half_day" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Break</th></tr></thead>
          <tbody>
            {records.map((row) => (
              <tr key={row._id}>
                <td>{new Date(row.date).toLocaleDateString()}</td>
                <td><span className="badge badge-green capitalize">{row.isHalfDay ? 'half_day' : row.status}</span></td>
                <td>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : '-'}</td>
                <td>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : '-'}</td>
                <td>{row.breakTimes?.[0]?.breakIn ? `${new Date(row.breakTimes[0].breakIn).toLocaleTimeString()} - ${row.breakTimes?.[0]?.breakOut ? new Date(row.breakTimes[0].breakOut).toLocaleTimeString() : '—'}` : '-'}</td>
              </tr>
            ))}
            {records.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">No attendance records found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
