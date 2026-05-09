import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiShield, FiSearch, FiFilter, FiTrash2, FiEdit2, FiEye, FiUserCheck, FiAlertTriangle, FiInfo } from 'react-icons/fi'

const ACTION_COLORS = {
  create: 'badge-green', update: 'badge-blue', delete: 'badge-red',
  view: 'badge-gray', login: 'badge-navy', logout: 'badge-gray',
  approve: 'badge-green', reject: 'badge-red', export: 'badge-purple',
}
const ACTION_ICONS = {
  create: FiUserCheck, update: FiEdit2, delete: FiTrash2,
  view: FiEye, approve: FiUserCheck, reject: FiAlertTriangle, export: FiFilter,
}
const MODULES = ['','employees','payroll','leaves','attendance','projects','invoices','clients',
  'subscriptions','recruitment','letters','financial','services','portfolio','rewards',
  'settings','auth','quotations','branches','performance','analytics','exports']
const ACTIONS = ['','create','update','delete','view','login','logout','approve','reject','export']
const SEVERITIES = ['','info','warning','critical']

export default function AdminAuditLogs() {
  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [severity, setSeverity] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', module, action, severity, startDate, endDate, page],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 50 })
      if (module) params.set('module', module)
      if (action) params.set('action', action)
      if (severity) params.set('severity', severity)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      return api.get(`/audit?${params}`).then(r => r.data)
    },
  })

  const logs = (data?.logs || []).filter(l =>
    !search || l.description?.toLowerCase().includes(search.toLowerCase()) ||
    l.userName?.toLowerCase().includes(search.toLowerCase()) ||
    l.entityName?.toLowerCase().includes(search.toLowerCase())
  )

  const sevColor = { info: 'badge-blue', warning: 'badge-yellow', critical: 'badge-red' }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Track every action — who did what and when</p>
        </div>
        <span className="badge badge-navy"><FiShield size={12}/> Admin Only</span>
      </div>

      {/* Filters */}
      <div className="card card-body">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative col-span-2 sm:col-span-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
            <input placeholder="Search logs..." className="form-input pl-9 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="form-select py-2 text-sm" value={module} onChange={e => { setModule(e.target.value); setPage(1) }}>
            <option value="">All Modules</option>
            {MODULES.filter(Boolean).map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
          </select>
          <select className="form-select py-2 text-sm" value={action} onChange={e => { setAction(e.target.value); setPage(1) }}>
            <option value="">All Actions</option>
            {ACTIONS.filter(Boolean).map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
          </select>
          <select className="form-select py-2 text-sm" value={severity} onChange={e => { setSeverity(e.target.value); setPage(1) }}>
            <option value="">All Severity</option>
            {SEVERITIES.filter(Boolean).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <input type="date" className="form-input py-2 text-sm" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} placeholder="From"/>
          <input type="date" className="form-input py-2 text-sm" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} placeholder="To"/>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Description</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                <FiShield size={32} className="mx-auto mb-2 opacity-30"/>
                <p>No audit logs found</p>
              </td></tr>
            ) : logs.map(log => {
              const ActionIcon = ACTION_ICONS[log.action] || FiInfo
              return (
                <tr key={log._id}>
                  <td className="whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-700">{new Date(log.createdAt).toLocaleDateString('en-LK')}</div>
                    <div className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-800">{log.userName || 'System'}</div>
                    <div className="text-xs text-gray-400 capitalize">{log.userRole}</div>
                  </td>
                  <td>
                    <span className={`badge capitalize ${ACTION_COLORS[log.action] || 'badge-gray'}`}>
                      <ActionIcon size={10}/> {log.action}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{log.module}</span>
                  </td>
                  <td>
                    <p className="text-sm text-gray-700">{log.description}</p>
                    {log.entityName && <p className="text-xs text-gray-400 mt-0.5">Entity: {log.entityName}</p>}
                  </td>
                  <td>
                    <span className={`badge capitalize ${sevColor[log.severity] || 'badge-gray'}`}>{log.severity}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {data.page} of {data.pages} · {data.total} total logs</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-outline btn-sm">Previous</button>
            <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn-primary btn-sm">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
