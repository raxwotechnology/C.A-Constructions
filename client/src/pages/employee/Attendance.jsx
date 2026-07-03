import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts'
import {
  FiClock, FiLogIn, FiLogOut, FiCoffee, FiCheck,
  FiCalendar, FiAlertCircle
} from 'react-icons/fi'

const STATUS_BADGE = {
  present: 'badge-green',
  present_short: 'badge-blue',
  half_day: 'badge-blue',
  absent: 'badge-red',
  leave: 'badge-yellow',
  short_leave: 'badge-purple',
  late: 'badge-yellow',
}

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-3xl font-bold text-primary tabular-nums">
      {time.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

export default function EmployeeAttendance() {
  const qc = useQueryClient()
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  // ── Today's record ─────────────────────────────────────────────────────────
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
    refetchInterval: 30000, // refresh every 30s
  })
  const todayRecord = todayData?.record

  // ── Monthly history ─────────────────────────────────────────────────────────
  const { data: histData } = useQuery({
    queryKey: ['attendance-my', month, year],
    queryFn: () => api.get(`/attendance/my?month=${month}&year=${year}`).then(r => r.data),
  })
  const records = histData?.records || []

  // ── Mutations ───────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['attendance-today'] })
    qc.invalidateQueries({ queryKey: ['attendance-my', month, year] })
  }

  const clockInMut = useMutation({
    mutationFn: () => api.post('/attendance/clock-in'),
    onSuccess: () => { toast.success('Clocked in! Have a great day 🎉'); invalidate() },
    onError: e => toast.error(e.response?.data?.message || 'Clock-in failed'),
  })
  const clockOutMut = useMutation({
    mutationFn: () => api.post('/attendance/clock-out'),
    onSuccess: () => { toast.success('Clocked out! See you tomorrow 👋'); invalidate() },
    onError: e => toast.error(e.response?.data?.message || 'Clock-out failed'),
  })
  const startBreakMut = useMutation({
    mutationFn: () => api.post('/attendance/break/start'),
    onSuccess: () => { toast.success('Break started'); invalidate() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const endBreakMut = useMutation({
    mutationFn: () => api.post('/attendance/break/end'),
    onSuccess: () => { toast.success('Break ended, back to it!'); invalidate() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  // ── Derived state ───────────────────────────────────────────────────────────
  const isClockedIn = !!todayRecord?.checkIn
  const isClockedOut = !!todayRecord?.checkOut
  const hasActiveBreak = (todayRecord?.breakTimes || []).some(b => b.breakIn && !b.breakOut)
  const isLoading = clockInMut.isPending || clockOutMut.isPending || startBreakMut.isPending || endBreakMut.isPending

  const workedToday = useMemo(() => {
    if (!todayRecord?.checkIn) return null
    const out = todayRecord.checkOut ? new Date(todayRecord.checkOut) : new Date()
    const ms = out - new Date(todayRecord.checkIn)
    const breakMs = (todayRecord.breakTimes || []).reduce((acc, b) => {
      if (b.breakIn && b.breakOut) return acc + (new Date(b.breakOut) - new Date(b.breakIn))
      return acc
    }, 0)
    const net = Math.max(0, ms - breakMs)
    const h = Math.floor(net / 3600000)
    const m = Math.floor((net % 3600000) / 60000)
    return `${h}h ${m}m`
  }, [todayRecord])

  const trendData = useMemo(() => {
    const map = {}
    records.forEach(r => {
      const d = new Date(r.date).getDate()
      if (!map[d]) map[d] = { day: d, present: 0, absent: 0, leave: 0, half_day: 0 }
      const key = r.isHalfDay ? 'half_day' : r.status
      if (map[d][key] !== undefined) map[d][key] += 1
    })
    return Object.values(map).sort((a, b) => a.day - b.day)
  }, [records])

  // ── Monthly KPIs ─────────────────────────────────────────────────────────────
  const present = records.filter(r => r.status === 'present' || r.status === 'present_short').length
  const leaves = records.filter(r => r.status === 'leave').length
  const halfDays = records.filter(r => r.isHalfDay || r.status === 'half_day').length
  const absent = records.filter(r => r.status === 'absent').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Attendance</h1>
          <p className="page-subtitle">Track your daily attendance and monthly summary.</p>
        </div>
      </div>

      {/* Today's Clock Card */}
      <div className="card card-body">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left — Live clock */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              {new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <LiveClock />
            {workedToday && (
              <span className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                <FiClock size={13} /> Worked today: <strong className="text-primary">{workedToday}</strong>
              </span>
            )}
          </div>

          {/* Right — Status and buttons */}
          <div className="flex flex-col gap-3">
            {/* Today status row */}
            <div className="flex items-center gap-3 flex-wrap">
              {todayLoading ? (
                <span className="text-sm text-slate-400">Loading...</span>
              ) : !isClockedIn ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <FiAlertCircle size={14} />
                  <span>Not clocked in yet</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                    <FiLogIn size={13} />
                    <span>In: {new Date(todayRecord.checkIn).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {todayRecord.checkOut && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full">
                      <FiLogOut size={13} />
                      <span>Out: {new Date(todayRecord.checkOut).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {hasActiveBreak && (
                    <span className="badge badge-yellow animate-pulse">On break</span>
                  )}
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {!isClockedIn && (
                <button
                  onClick={() => clockInMut.mutate()}
                  disabled={isLoading}
                  className="btn-primary gap-2 px-6"
                >
                  <FiLogIn size={15} />
                  {clockInMut.isPending ? 'Clocking in...' : 'Clock In'}
                </button>
              )}
              {isClockedIn && !isClockedOut && (
                <>
                  {!hasActiveBreak ? (
                    <button
                      onClick={() => startBreakMut.mutate()}
                      disabled={isLoading}
                      className="btn-outline gap-2"
                    >
                      <FiCoffee size={14} />
                      {startBreakMut.isPending ? '...' : 'Start Break'}
                    </button>
                  ) : (
                    <button
                      onClick={() => endBreakMut.mutate()}
                      disabled={isLoading}
                      className="btn-outline gap-2"
                    >
                      <FiCheck size={14} />
                      {endBreakMut.isPending ? '...' : 'End Break'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (hasActiveBreak) {
                        toast.error('Please end your break before clocking out')
                        return
                      }
                      clockOutMut.mutate()
                    }}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30 btn gap-2 px-6 border-0"
                  >
                    <FiLogOut size={15} />
                    {clockOutMut.isPending ? 'Clocking out...' : 'Clock Out'}
                  </button>
                </>
              )}
              {isClockedIn && isClockedOut && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                  <FiCheck size={14} />
                  <span className="font-medium">Day complete — total: {todayRecord.totalWorkedHours ? `${todayRecord.totalWorkedHours}h` : workedToday}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card kpi-green">
          <p className="text-xs text-slate-500 uppercase font-medium">Present</p>
          <p className="text-2xl font-bold text-emerald-700">{present}</p>
        </div>
        <div className="kpi-card kpi-blue">
          <p className="text-xs text-slate-500 uppercase font-medium">Half Days</p>
          <p className="text-2xl font-bold text-blue-700">{halfDays}</p>
        </div>
        <div className="kpi-card kpi-purple">
          <p className="text-xs text-slate-500 uppercase font-medium">Leaves Taken</p>
          <p className="text-2xl font-bold text-purple-700">{leaves}</p>
        </div>
        <div className="kpi-card kpi-red">
          <p className="text-xs text-slate-500 uppercase font-medium">Absent</p>
          <p className="text-2xl font-bold text-red-700">{absent}</p>
        </div>
      </div>

      {/* Month Filter */}
      <div className="card card-body flex flex-wrap gap-3 items-center">
        <FiCalendar size={15} className="text-slate-400" />
        <div className="flex items-center gap-2">
          <label className="form-label mb-0 text-xs">Month</label>
          <select className="form-select py-1.5 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="form-label mb-0 text-xs">Year</label>
          <input
            type="number"
            className="form-input py-1.5 text-sm w-24"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Trend Chart */}
      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-4 text-base">Monthly Attendance Trend</h3>
        {trendData.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No records found for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="Present" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="half_day" name="Half Day" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="leave" name="Leave" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* History Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Break</th>
              <th>Worked</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No attendance records for this month.</td></tr>
            ) : records.map(row => {
              const openBreak = (row.breakTimes || []).find(b => b.breakIn && !b.breakOut)
              const totalBreakMin = (row.breakTimes || []).reduce((acc, b) => {
                if (b.breakIn && b.breakOut) return acc + Math.round((new Date(b.breakOut) - new Date(b.breakIn)) / 60000)
                return acc
              }, 0)
              return (
                <tr key={row._id}>
                  <td className="font-medium text-slate-700">
                    {new Date(row.date).toLocaleDateString('en-LK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td>
                    <span className={`badge capitalize ${STATUS_BADGE[row.isHalfDay ? 'half_day' : row.status] || 'badge-gray'}`}>
                      {row.isHalfDay ? 'Half Day' : row.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-slate-600 text-sm">
                    {row.checkIn ? new Date(row.checkIn).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="text-slate-600 text-sm">
                    {row.checkOut ? new Date(row.checkOut).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="text-slate-500 text-sm">
                    {totalBreakMin > 0 ? `${totalBreakMin}m` : openBreak ? '(active)' : '—'}
                  </td>
                  <td className="font-medium text-slate-700 text-sm">
                    {row.totalWorkedHours ? `${row.totalWorkedHours}h` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
