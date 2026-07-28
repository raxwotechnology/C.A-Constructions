import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi'

export default function WorkerPortal() {
  const { data: attData } = useQuery({
    queryKey: ['worker-attendance'],
    queryFn: () => api.get('/attendance/my-attendance').then(r => r.data),
  })

  const { data: advData } = useQuery({
    queryKey: ['worker-advances'],
    queryFn: () => api.get('/advances').then(r => r.data),
  })

  const attendance = attData?.attendances || attData?.attendance || []
  const advances = advData?.advances || []
  const dailyWageRate = 3500

  // Calendar Heatmap Days (Simulated 30 Days)
  const heatmapDays = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    status: (i % 7 === 0) ? 'absent' : (i % 6 === 0) ? 'half_day' : 'present',
    date: `2026-07-${(i + 1).toString().padStart(2, '0')}`,
    site: 'Colombo Port City Tower'
  }))

  const presentCount = heatmapDays.filter(d => d.status === 'present').length
  const totalEarned = presentCount * dailyWageRate

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Worker Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 rounded-2xl text-white shadow-xl">
        <span className="bg-emerald-400/20 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300/30">
          Site Worker Portal (එදිනෙදා පඩි සේවක පද්ධතිය)
        </span>
        <h1 className="text-2xl md:text-3xl font-black mt-2">My Daily Wage & Attendance Dashboard</h1>
        <p className="text-emerald-100 text-sm mt-1">Track daily wage earnings, attendance calendar heatmap & salary advance digital receipts.</p>
      </div>

      {/* Wage Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase">Daily Wage Rate</p>
          <p className="text-3xl font-black text-slate-900 mt-2">LKR {dailyWageRate.toLocaleString()} / Day</p>
          <p className="text-xs text-slate-500 mt-1">Daily Casual / Day Wage Contract</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase">Days Worked This Month</p>
          <p className="text-3xl font-black text-emerald-700 mt-2">{presentCount} Days Present</p>
          <p className="text-xs text-slate-500 mt-1">Verified via Supervisor Photo/GPS Tap</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Earned Balance</p>
          <p className="text-3xl font-black text-emerald-700 mt-2">LKR {totalEarned.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Available for Payout / Advance</p>
        </div>
      </div>

      {/* Attendance Heatmap Calendar (Green/Red Days) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiCalendar className="text-emerald-600" /> Attendance Heatmap Calendar
            </h3>
            <p className="text-xs text-slate-500">Green = Present | Red = Absent | Amber = Half Day</p>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-2">
          {heatmapDays.map((d, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl text-center border font-bold transition-all ${
                d.status === 'present'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : d.status === 'absent'
                  ? 'bg-rose-500 text-white border-rose-600'
                  : 'bg-amber-400 text-slate-900 border-amber-500'
              }`}
            >
              <p className="text-xs opacity-90">JUL</p>
              <p className="text-lg font-black">{d.day}</p>
              <p className="text-[9px] uppercase tracking-tighter truncate mt-0.5">{d.status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advances & Digital Receipts */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FiFileText className="text-indigo-600" /> Salary Advances & Retention Receipts
        </h3>

        <div className="space-y-3">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Salary Advance #ADV-992</h4>
              <p className="text-xs text-slate-500 mt-0.5">Approved on 2026-07-15 | Auto-deducted from monthly payout</p>
            </div>
            <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              LKR 10,000
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
