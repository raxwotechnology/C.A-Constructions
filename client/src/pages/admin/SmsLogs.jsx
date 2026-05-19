import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiMessageSquare, FiSearch, FiRefreshCw, FiCheckCircle, FiXCircle, FiFilter } from 'react-icons/fi'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function SmsLogs() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sms-logs', statusFilter, moduleFilter, search],
    queryFn: () => api.get(`/sms/logs?status=${statusFilter}&module=${moduleFilter}&search=${search}`).then(r => r.data)
  })

  const resendMut = useMutation({
    mutationFn: (id) => api.post(`/sms/resend/${id}`).then(r => r.data),
    onSuccess: (data) => {
      toast.success(data.message)
      qc.invalidateQueries({ queryKey: ['sms-logs'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to resend SMS')
  })

  const logs = data?.logs || []

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">SMS Logs</h1>
          <p className="page-subtitle">View and manage SMS notifications sent via SMSLenz</p>
        </div>
      </div>

      <div className="card card-body flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or phone number..." 
            className="form-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="w-48">
          <select className="form-select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="">All Modules</option>
            <option value="payroll">Payroll</option>
            <option value="leave">Leave</option>
            <option value="project">Project</option>
            <option value="hr">HR</option>
            <option value="financial">Financial</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Phone Number</th>
              <th>Message</th>
              <th>Module</th>
              <th>Status</th>
              <th>Sent At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="text-center py-8"><span className="spinner"></span></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-slate-500">No SMS logs found.</td></tr>
            ) : logs.map(log => (
              <tr key={log._id}>
                <td className="font-medium text-slate-800">{log.recipientName}</td>
                <td className="text-slate-600">{log.recipientPhone}</td>
                <td className="max-w-xs truncate text-xs text-slate-500" title={log.message}>{log.message}</td>
                <td><span className="badge bg-slate-100 text-slate-700 capitalize">{log.module}</span></td>
                <td>
                  {log.status === 'sent' ? (
                    <span className="badge badge-green"><FiCheckCircle size={12} className="mr-1" /> Sent</span>
                  ) : (
                    <span className="badge badge-red"><FiXCircle size={12} className="mr-1" /> Failed</span>
                  )}
                </td>
                <td className="text-xs text-slate-500">{format(new Date(log.sentAt), 'PP p')}</td>
                <td>
                  {log.status === 'failed' && (
                    <button 
                      onClick={() => resendMut.mutate(log._id)} 
                      disabled={resendMut.isPending}
                      className="btn-outline btn-sm"
                      title="Resend SMS"
                    >
                      <FiRefreshCw size={13} className={resendMut.isPending ? 'animate-spin' : ''} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
