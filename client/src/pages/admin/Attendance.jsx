import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts'

export default function AdminAttendance() {
  const qc = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState('present')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [breakIn, setBreakIn] = useState('')
  const [breakOut, setBreakOut] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)

  const { data: employeesData } = useQuery({
    queryKey: ['attendance-employees'],
    queryFn: () => api.get('/employees?status=active').then((r) => r.data),
  })
  const { data: recordsData } = useQuery({
    queryKey: ['attendance-records'],
    queryFn: () => api.get('/attendance').then((r) => r.data),
  })
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: analyticsData } = useQuery({
    queryKey: ['attendance-analytics', month, year],
    queryFn: () => api.get(`/attendance/analytics?month=${month}&year=${year}`).then((r) => r.data),
  })

  const markMutation = useMutation({
    mutationFn: () => api.post('/attendance', {
      employeeId,
      status,
      date: new Date().toISOString(),
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      breakTimes: (breakIn || breakOut) ? [{ breakIn: breakIn || undefined, breakOut: breakOut || undefined }] : [],
      isHalfDay,
      isFullDay: !isHalfDay,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-records'] }),
  })

  const employees = employeesData?.employees || []
  const records = recordsData?.records || []
  const presentCount = records.filter((r) => r.status === 'present').length
  const absentCount = records.filter((r) => r.status === 'absent').length
  const leaveCount = records.filter((r) => r.status === 'leave').length
  const pieData = [
    { name: 'Present', value: analyticsData?.byStatus?.present || 0 },
    { name: 'Absent', value: analyticsData?.byStatus?.absent || 0 },
    { name: 'Leave', value: analyticsData?.byStatus?.leave || 0 },
    { name: 'Half Day', value: analyticsData?.byStatus?.half_day || 0 },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Attendance System" subtitle="Mark attendance and review employee attendance logs." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Present</p><p className="text-2xl font-bold text-primary">{presentCount}</p></div>
        <div className="kpi-card kpi-orange"><p className="text-xs text-slate-500 uppercase">Absent</p><p className="text-2xl font-bold text-primary">{absentCount}</p></div>
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">On Leave</p><p className="text-2xl font-bold text-primary">{leaveCount}</p></div>
      </div>
      <div className="card p-5 grid md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <div>
          <label className="form-label">Employee</label>
          <select className="form-select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.userId?.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">Leave</option>
            <option value="half_day">Half day</option>
          </select>
        </div>
        <div>
          <label className="form-label">Clock In</label>
          <input type="datetime-local" className="form-input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Clock Out</label>
          <input type="datetime-local" className="form-input" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Break In / Out</label>
          <div className="space-y-2">
            <input type="datetime-local" className="form-input" value={breakIn} onChange={(e) => setBreakIn(e.target.value)} />
            <input type="datetime-local" className="form-input" value={breakOut} onChange={(e) => setBreakOut(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <input id="half-day" type="checkbox" checked={isHalfDay} onChange={(e) => setIsHalfDay(e.target.checked)} />
          <label htmlFor="half-day" className="text-sm text-slate-600">Half day</label>
        </div>
        <button className="btn-primary" onClick={() => markMutation.mutate()} disabled={!employeeId}>Mark</button>
      </div>

      <div className="card card-body">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end mb-4">
          <div><label className="form-label">Analytics Month</label><input type="number" min={1} max={12} className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value || 1))} /></div>
          <div><label className="form-label">Year</label><input type="number" className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))} /></div>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <h3 className="font-bold text-primary font-heading mb-2">Attendance Status Mix</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={85}>
                  {[0, 1, 2, 3].map((i) => <Cell key={i} fill={['#22c55e', '#ef4444', '#f59e0b', '#2563eb'][i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="font-bold text-primary font-heading mb-2">Top Attendance Contributors</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={(analyticsData?.byEmployee || []).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="present" fill="#22c55e" />
                <Bar dataKey="half_day" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Employee</th><th>Employee ID</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Break</th><th>Status</th></tr></thead>
          <tbody>
            {records.map((row) => (
              <tr key={row._id}>
                <td>{row.employee?.userId?.name}</td>
                <td>{row.employee?.employeeNo || '—'}</td>
                <td>{new Date(row.date).toLocaleDateString()}</td>
                <td>{row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : '—'}</td>
                <td>{row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : '—'}</td>
                <td>{row.breakTimes?.[0]?.breakIn ? `${new Date(row.breakTimes[0].breakIn).toLocaleTimeString()} - ${row.breakTimes?.[0]?.breakOut ? new Date(row.breakTimes[0].breakOut).toLocaleTimeString() : '—'}` : '—'}</td>
                <td><span className="badge badge-blue capitalize">{row.isHalfDay ? 'half_day' : row.status}</span></td>
              </tr>
            ))}
            {records.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-slate-400">No attendance records.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
