import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { Link } from 'react-router-dom'
import { FiFolder, FiFileText, FiShield, FiAlertTriangle, FiBook, FiCheckCircle, FiUsers } from 'react-icons/fi'

export default function PMDashboard() {
  const { data: sitesData } = useQuery({
    queryKey: ['pm-sites'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const { data: conflictsData } = useQuery({
    queryKey: ['pm-conflicts'],
    queryFn: () => api.get('/attendance').then(r => r.data),
  })

  const sites = sitesData?.projects || sitesData?.sites || []
  const attendanceList = conflictsData?.attendances || conflictsData?.attendance || []
  const flaggedConflicts = attendanceList.filter(a => a.conflictFlag)

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-slate-900 shadow-xl">
        <span className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-400/30">
          Project Manager (PM) Control Portal
        </span>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 text-slate-900">PM Site Engineering Deck</h1>
        <p className="text-indigo-200 text-sm mt-1">SLS 573 BOQ Generator, SBD-03 Contracts, Daily Diary & Conflict Detection Engine.</p>
      </div>

      {/* Shortcuts Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/manager/quotations" className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl mb-3 group-hover:bg-amber-500 group-hover:text-white transition-all">
            <FiFileText />
          </div>
          <h3 className="font-bold text-slate-900 text-base">SLS 573 Auto BOQ Engine</h3>
          <p className="text-xs text-slate-500 mt-1">Export SLS 573:1999 standard BOQ in 60 seconds.</p>
        </Link>

        <Link to="/manager/agreements" className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <FiShield />
          </div>
          <h3 className="font-bold text-slate-900 text-base">1-Click SBD-03 Agreements</h3>
          <p className="text-xs text-slate-500 mt-1">Generate 4-page court-ready SBD-03 legal contracts.</p>
        </Link>

        <Link to="/manager/daily-diary" className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <FiBook />
          </div>
          <h3 className="font-bold text-slate-900 text-base">12-Section Daily Diary</h3>
          <p className="text-xs text-slate-500 mt-1">Review supervisor logs, weather & machinery.</p>
        </Link>

        <Link to="/manager/attendance" className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-rose-400 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xl mb-3 group-hover:bg-rose-600 group-hover:text-white transition-all">
            <FiAlertTriangle />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Conflict Detection Engine</h3>
          <p className="text-xs text-slate-500 mt-1">Detect double-bookings & phantom payroll.</p>
        </Link>
      </div>

      {/* Conflict Engine & Active Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Double-Payment Conflicts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FiAlertTriangle className="text-rose-600" /> Double Payment Conflict Detection Engine
            </h3>
            <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {flaggedConflicts.length} Active Conflicts
            </span>
          </div>

          {flaggedConflicts.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <FiCheckCircle className="text-emerald-500 text-3xl mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No Double-Booking Conflicts Detected</p>
              <p className="text-xs text-slate-500 mt-1">All worker attendance records are unique per site.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flaggedConflicts.map((c, i) => (
                <div key={i} className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <p className="text-xs font-bold text-rose-900">{c.conflictDetails || 'Double booking attempt flagged.'}</p>
                  <p className="text-[11px] text-slate-600 mt-1">Worker: {c.employee?.userId?.name || 'Worker'} | Date: {new Date(c.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Managed Sites */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <FiFolder className="text-indigo-600" /> Active Managed Sites ({sites.length})
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {sites.map((s, i) => (
              <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Budget: LKR {s.budget?.toLocaleString() || '15,000,000'}</p>
                </div>
                <Link to={`/manager/projects`} className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg">
                  Manage Site
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
