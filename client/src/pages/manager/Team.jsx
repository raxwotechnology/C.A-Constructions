import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { mediaUrl } from '../../lib/media'
import { FiUsers, FiSearch, FiMail, FiPhone, FiBriefcase, FiCalendar, FiFilter, FiActivity } from 'react-icons/fi'

const DEPT_COLORS = {
  development: 'bg-blue-100 text-blue-700',
  design: 'bg-purple-100 text-purple-700',
  marketing: 'bg-pink-100 text-pink-700',
  management: 'bg-amber-100 text-amber-700',
  finance: 'bg-green-100 text-green-700',
  hr: 'bg-cyan-100 text-cyan-700',
  sales: 'bg-orange-100 text-orange-700',
  default: 'bg-slate-100 text-slate-600',
}

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-red-100 text-red-700',
  'on-leave': 'bg-amber-100 text-amber-700',
  intern: 'bg-blue-100 text-blue-600',
}

export default function ManagerTeam() {
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('all')
  const [status, setStatus] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['manager-team'],
    queryFn: () => api.get('/employees').then(r => r.data),
  })

  const employees = data?.employees || []

  // Department list derived from data
  const departments = ['all', ...new Set(employees.map(e => e.department?.toLowerCase()).filter(Boolean))]

  const filtered = employees.filter(emp => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      emp.userId?.name?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.employeeNo?.toLowerCase().includes(q)
    const matchDept = dept === 'all' || emp.department?.toLowerCase() === dept
    const matchStatus = status === 'all' || emp.status === status || emp.employmentType === status
    return matchSearch && matchDept && matchStatus
  })

  // Team stats
  const activeCount = employees.filter(e => e.status === 'active').length
  const internCount = employees.filter(e => e.employmentType === 'intern' && e.status === 'active').length
  const deptGroups = employees.reduce((acc, e) => {
    const d = e.department || 'Unknown'
    acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})
  const topDept = Object.entries(deptGroups).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Team</h1>
          <p className="page-subtitle">View and monitor all team members, departments, and capacity.</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Team', val: employees.length, color: 'kpi-blue', icon: FiUsers },
          { label: 'Active Members', val: activeCount, color: 'kpi-green', icon: FiActivity },
          { label: 'Interns', val: internCount, color: 'kpi-purple', icon: FiBriefcase },
          { label: 'Departments', val: Object.keys(deptGroups).length, color: 'kpi-navy', icon: FiFilter },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`kpi-card ${k.color}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{k.label}</p>
            <p className="text-2xl font-black text-primary mt-1">{k.val}</p>
          </motion.div>
        ))}
      </div>

      {/* Department breakdown */}
      {topDept.length > 0 && (
        <div className="card card-body">
          <h3 className="font-bold text-primary mb-3 text-sm uppercase tracking-wider">Department Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(deptGroups).sort((a, b) => b[1] - a[1]).map(([d, count]) => (
              <button key={d} onClick={() => setDept(dept === d.toLowerCase() ? 'all' : d.toLowerCase())}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  dept === d.toLowerCase() ? 'bg-secondary text-white border-secondary' :
                  `${DEPT_COLORS[d.toLowerCase()] || DEPT_COLORS.default} border-transparent`
                }`}>
                {d} <span className="opacity-70 ml-1">({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="form-input !pl-10 w-full" placeholder="Search name, designation, department..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select w-auto" value={dept} onChange={e => setDept(e.target.value)}>
          {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
        </select>
        <select className="form-select w-auto" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="intern">Interns</option>
        </select>
      </div>

      {/* Team grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FiUsers size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No team members found.</p>
          {search && <button onClick={() => setSearch('')} className="btn-ghost mt-2 text-sm">Clear search</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((emp, i) => {
            const user = emp.userId
            const deptKey = emp.department?.toLowerCase() || 'default'
            const deptColor = DEPT_COLORS[deptKey] || DEPT_COLORS.default
            const statusColor = STATUS_COLORS[emp.status] || STATUS_COLORS.active
            return (
              <motion.div key={emp._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-5 hover:shadow-md transition-all duration-200 border border-slate-100">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
                    {user?.avatar
                      ? <img src={mediaUrl(user.avatar)} alt={user?.name} className="w-full h-full object-cover" />
                      : <span className="text-white font-bold text-lg">{user?.name?.charAt(0)?.toUpperCase()}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-primary truncate">{user?.name || '—'}</p>
                        <p className="text-xs text-slate-500 truncate">{emp.designation || 'Employee'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${statusColor}`}>
                        {emp.employmentType === 'intern' ? 'Intern' : emp.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {emp.department && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${deptColor}`}>
                          {emp.department}
                        </span>
                      )}
                      {emp.employeeNo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500">
                          {emp.employeeNo}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1">
                      {user?.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <FiMail size={11} /><span className="truncate">{user.email}</span>
                        </div>
                      )}
                      {emp.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <FiPhone size={11} /><span>{emp.phone}</span>
                        </div>
                      )}
                      {emp.joinedDate && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <FiCalendar size={11} />
                          <span>Joined {new Date(emp.joinedDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'short' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
