import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, AreaChart, Area
} from 'recharts'
import { FiClock, FiUser, FiCalendar, FiDownload, FiSearch, FiFilter } from 'react-icons/fi'

const COLORS = { present: '#22c55e', absent: '#ef4444', leave: '#f59e0b', half_day: '#2563eb', short_leave: '#8b5cf6' }
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminAttendance() {
  const qc = useQueryClient()
  const now = new Date()
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState('present')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [breakIn, setBreakIn] = useState('')
  const [breakOut, setBreakOut] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [isShortLeave, setIsShortLeave] = useState(false)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: employeesData } = useQuery({
    queryKey: ['attendance-employees'],
    queryFn: () => api.get('/employees?status=active').then(r => r.data),
  })

  const { data: recordsData } = useQuery({
    queryKey: ['attendance-records'],
    queryFn: () => api.get('/attendance').then(r => r.data),
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['attendance-analytics', month, year],
    queryFn: () => api.get(`/attendance/analytics?month=${month}&year=${year}`).then(r => r.data),
  })

  const markMutation = useMutation({
    mutationFn: () => api.post('/attendance', {
      employeeId, status,
      date: new Date(date).toISOString(),
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      breakTimes: (breakIn || breakOut) ? [{ breakIn: breakIn || undefined, breakOut: breakOut || undefined }] : [],
      isHalfDay: isHalfDay || (status === 'half_day'),
      isShortLeave: isShortLeave || (status === 'short_leave'),
      isFullDay: !isHalfDay && status !== 'half_day' && !isShortLeave && status !== 'short_leave',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance-records'] }); toast.success('Attendance marked') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const employees = employeesData?.employees || []
  const allRecords = recordsData?.records || []

  const filteredRecords = allRecords.filter(r => {
    const nameMatch = !searchTerm || r.employee?.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const statusMatch = !statusFilter || r.status === statusFilter
    return nameMatch && statusMatch
  })

  const todayStr = new Date().toDateString()
  const todayRecords = allRecords.filter(r => new Date(r.date).toDateString() === todayStr)
  const presentToday = todayRecords.filter(r => r.status === 'present').length
  const absentToday = todayRecords.filter(r => r.status === 'absent').length
  const leaveToday = todayRecords.filter(r => r.status === 'leave').length
  const halfDayToday = todayRecords.filter(r => r.isHalfDay || r.status === 'half_day').length

  const pieData = [
    { name: 'Present', value: analyticsData?.byStatus?.present || 0 },
    { name: 'Absent', value: analyticsData?.byStatus?.absent || 0 },
    { name: 'Leave', value: analyticsData?.byStatus?.leave || 0 },
    { name: 'Half Day', value: analyticsData?.byStatus?.half_day || 0 },
    { name: 'Short Leave', value: analyticsData?.byStatus?.short_leave || 0 },
  ].filter(d => d.value > 0)

  const selectedEmp = employees.find(e => e._id === employeeId)
  const autoCheckIn = selectedEmp ? '09:00' : ''

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track employee attendance, clock-in/out and analytics.</p>
        </div>
        <button className="btn-outline btn-sm" onClick={() => {}}>
          <FiDownload size={14}/> Export
        </button>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Present Today', value: presentToday, color: 'kpi-green', text: 'text-green-600' },
          { label: 'Absent Today', value: absentToday, color: 'kpi-orange', text: 'text-orange-600' },
          { label: 'On Leave', value: leaveToday, color: 'kpi-blue', text: 'text-blue-600' },
          { label: 'Half Day', value: halfDayToday, color: 'kpi-purple', text: 'text-purple-600' },
        ].map(c => (
          <div key={c.label} className={`kpi-card ${c.color}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`text-3xl font-bold font-heading ${c.text}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Mark Attendance Form */}
      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-4">Mark Attendance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Employee *</label>
            <select className="form-select" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.userId?.name} ({emp.employeeNo})</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Date *</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Status *</label>
            <select className="form-select" value={status} onChange={e => { setStatus(e.target.value); setIsHalfDay(e.target.value === 'half_day'); setIsShortLeave(e.target.value === 'short_leave') }}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">On Leave</option>
              <option value="half_day">Half Day</option>
              <option value="short_leave">Short Leave ⭐</option>
            </select>
          </div>
          <div>
            <label className="form-label">Clock In</label>
            <input type="time" className="form-input" value={checkIn} onChange={e => setCheckIn(e.target.value)} placeholder="09:00" />
          </div>
          <div>
            <label className="form-label">Clock Out</label>
            <input type="time" className="form-input" value={checkOut} onChange={e => setCheckOut(e.target.value)} placeholder="18:00" />
          </div>
          <div>
            <label className="form-label">Break Start</label>
            <input type="time" className="form-input" value={breakIn} onChange={e => setBreakIn(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Break End</label>
            <input type="time" className="form-input" value={breakOut} onChange={e => setBreakOut(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              className="btn-primary w-full justify-center"
              onClick={() => markMutation.mutate()}
              disabled={!employeeId || markMutation.isPending}
            >
              {markMutation.isPending ? <span className="spinner"/> : <><FiClock size={14}/> Mark Attendance</>}
            </button>
          </div>
        </div>
        {checkIn && checkOut && (
          <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-700 font-medium">
              ⏱️ Hours Worked: {(() => {
                const [ih, im] = checkIn.split(':').map(Number)
                const [oh, om] = checkOut.split(':').map(Number)
                const diff = (oh * 60 + om) - (ih * 60 + im)
                const brkMins = (breakIn && breakOut) ? (() => {
                  const [bih, bim] = breakIn.split(':').map(Number)
                  const [boh, bom] = breakOut.split(':').map(Number)
                  return (boh * 60 + bom) - (bih * 60 + bim)
                })() : 0
                const net = diff - brkMins
                return `${Math.floor(net/60)}h ${net%60}m (${brkMins > 0 ? `${brkMins}m break` : 'no break'})`
              })()}
            </p>
          </div>
        )}
      </div>

      {/* Analytics Charts */}
      <div className="card card-body">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h3 className="font-bold text-primary font-heading">Attendance Analytics</h3>
          <div className="flex gap-3">
            <div>
              <select className="form-select py-1.5 text-xs" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <input type="number" className="form-input py-1.5 text-xs w-20" value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Status Distribution</h4>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" outerRadius={85} innerRadius={50} paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={Object.values(COLORS)[i % 5]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#6B7280' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-3">Top Attendance Contributors</h4>
            {(analyticsData?.byEmployee || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(analyticsData?.byEmployee || []).slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                  <Bar dataKey="present" name="Present" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="half_day" name="Half Day" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-56 flex items-center justify-center text-gray-400 text-sm">No employee data yet</div>}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="card card-body">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h3 className="font-bold text-primary font-heading flex-1">Attendance Records</h3>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input placeholder="Search employee..." className="form-input pl-9 py-2 text-sm w-48" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select className="form-select py-2 text-sm w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">Leave</option>
            <option value="half_day">Half Day</option>
            <option value="short_leave">Short Leave</option>
          </select>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Emp ID</th>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours Worked</th>
                <th>Break</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.slice(0, 50).map(row => {
                const cin = row.checkIn ? new Date(row.checkIn) : null
                const cout = row.checkOut ? new Date(row.checkOut) : null
                const totalMins = cin && cout ? Math.round((cout - cin) / 60000) : 0
                const brk = row.breakTimes?.[0]
                const brkMins = brk?.breakIn && brk?.breakOut ? Math.round((new Date(brk.breakOut) - new Date(brk.breakIn)) / 60000) : 0
                const netMins = totalMins - brkMins
                return (
                  <tr key={row._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-xs font-semibold">
                          {row.employee?.userId?.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{row.employee?.userId?.name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-navy">{row.employee?.employeeNo || '—'}</span></td>
                    <td className="text-gray-500">{new Date(row.date).toLocaleDateString('en-LK')}</td>
                    <td className="font-medium text-gray-700">{cin ? cin.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="font-medium text-gray-700">{cout ? cout.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>
                      {netMins > 0 ? (
                        <span className={`text-sm font-semibold ${netMins >= 480 ? 'text-green-600' : 'text-orange-500'}`}>
                          {Math.floor(netMins/60)}h {netMins%60}m
                        </span>
                      ) : '—'}
                    </td>
                    <td className="text-gray-500 text-xs">{brkMins > 0 ? `${brkMins}m` : '—'}</td>
                    <td>
                      <span className={`badge capitalize ${
                        row.status === 'present' ? 'badge-green' :
                        row.status === 'absent' ? 'badge-red' :
                        row.isHalfDay || row.status === 'half_day' ? 'badge-blue' :
                        row.isShortLeave || row.status === 'short_leave' ? 'badge-purple' :
                        'badge-yellow'
                      }`}>
                        {row.isShortLeave ? 'Short Leave' : row.isHalfDay ? 'Half Day' : row.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filteredRecords.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <FiCalendar size={32} className="mx-auto mb-2 opacity-30"/>No attendance records found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
