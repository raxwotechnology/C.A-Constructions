import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiMail, FiSearch, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import api from '../../lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function EmailLogs() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['email-logs', statusFilter, moduleFilter, search],
    queryFn: () => api.get(`/email-logs?status=${statusFilter}&module=${moduleFilter}&search=${search}`).then(r => r.data)
  })

  const logs = data?.logs || []

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Logs</h1>
          <p className="page-subtitle">View recent system emails sent</p>
        </div>
      </div>

      <div className="card card-body flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by email or subject..." 
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
            <option value="quotation">Quotation</option>
            <option value="invoice">Invoice</option>
            <option value="request">Request</option>
            <option value="tool">Tool</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Recipient Email</th>
              <th>Subject</th>
              <th>Module</th>
              <th>Status</th>
              <th>Error</th>
              <th>Sent At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" className="text-center py-8"><span className="spinner"></span></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-slate-500">No email logs found.</td></tr>
            ) : logs.map(log => (
              <tr key={log._id}>
                <td className="font-medium text-slate-800">{log.recipientEmail}</td>
                <td className="text-slate-600">{log.subject}</td>
                <td><span className="badge bg-slate-100 text-slate-700 capitalize">{log.module}</span></td>
                <td>
                  {log.status === 'sent' ? (
                    <span className="badge badge-green"><FiCheckCircle size={12} className="mr-1" /> Sent</span>
                  ) : (
                    <span className="badge badge-red"><FiXCircle size={12} className="mr-1" /> Failed</span>
                  )}
                </td>
                <td className="text-xs text-red-500 max-w-xs truncate">{log.error || '-'}</td>
                <td className="text-xs text-slate-500">{format(new Date(log.sentAt), 'PP p')}</td>
                <td>
                  <button 
                    onClick={() => {
                      if (window.confirm('Resend this email?')) {
                        api.post(`/email-logs/${log._id}/resend`)
                          .then(() => toast.success('Resend triggered!'))
                          .catch(e => toast.error(e.response?.data?.message || 'Failed to resend'))
                      }
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    Resend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
