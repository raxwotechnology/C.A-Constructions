import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiMail, FiSearch, FiCheckCircle, FiXCircle, FiSend, FiX, FiZap } from 'react-icons/fi'
import api from '../../lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ExportBar from '../../components/ui/ExportBar'

export default function EmailLogs() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  const [showCompose, setShowCompose] = useState(false)
  const [composeSubject, setComposeSubject] = useState('')
  const [composeMessage, setComposeMessage] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState([]) // array of emails
  const [recipientSearch, setRecipientSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['email-logs', statusFilter, moduleFilter, search],
    queryFn: () => api.get(`/email-logs?status=${statusFilter}&module=${moduleFilter}&search=${search}`).then(r => r.data)
  })
  const logs = data?.logs || []
  const smtpReady = data?.smtpReady ?? null

  const testSmtpMut = useMutation({
    mutationFn: () => api.post('/email-logs/test-smtp').then(r => r.data),
    onSuccess: (d) => toast.success(d.message || 'SMTP test sent!'),
    onError: (e) => toast.error(e.response?.data?.message || 'SMTP test failed'),
  })

  const { data: contactsData } = useQuery({
    queryKey: ['message-contacts'],
    queryFn: () => api.get('/messages/contacts').then(r => r.data),
    enabled: showCompose
  })
  const employees = contactsData?.users?.filter(u => u.email) || []

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients').then(r => r.data),
    enabled: showCompose
  })
  const clients = clientsData?.clients?.filter(c => c.email) || []

  const allRecipients = [
    ...employees.map(e => ({ name: e.name, email: e.email, type: 'Employee' })),
    ...clients.map(c => ({ name: c.profile?.companyName || c.name, email: c.email, type: 'Client' }))
  ].filter(r => r.name?.toLowerCase().includes(recipientSearch.toLowerCase()) || r.email?.toLowerCase().includes(recipientSearch.toLowerCase()))

  const sendCustomMut = useMutation({
    mutationFn: () => api.post('/email-logs/send-custom', { emails: selectedRecipients, subject: composeSubject, message: composeMessage }),
    onSuccess: () => {
      toast.success('Custom emails queued for sending!')
      setShowCompose(false)
      setComposeSubject('')
      setComposeMessage('')
      setSelectedRecipients([])
      qc.invalidateQueries(['email-logs'])
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to send emails')
  })

  const resendMut = useMutation({
    mutationFn: (id) => api.post(`/email-logs/${id}/resend`).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message || 'Email resent successfully!')
      qc.invalidateQueries(['email-logs'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to resend email'),
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="page-title">Email Logs</h1>
          <p className="page-subtitle">View recent system emails sent</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {smtpReady !== null && (
            <span className={`badge ${smtpReady ? 'badge-green' : 'badge-red'} flex items-center gap-1`}>
              {smtpReady ? <FiCheckCircle size={12}/> : <FiXCircle size={12}/>}
              SMTP {smtpReady ? 'Configured' : 'Not Configured'}
            </span>
          )}
          <ExportBar
            data={logs}
            columns={[
              { header: 'Recipient', accessor: 'recipientEmail' },
              { header: 'Subject', accessor: 'subject' },
              { header: 'Module', accessor: 'module' },
              { header: 'Status', accessor: 'status' },
              { header: 'Error', accessor: (l) => l.error || '-' },
              { header: 'Sent At', accessor: (l) => new Date(l.sentAt).toLocaleString() },
            ]}
            title="Email Logs"
            filters={{ Status: statusFilter, Module: moduleFilter }}
          />
          <button onClick={() => testSmtpMut.mutate()} disabled={testSmtpMut.isPending} className="btn-secondary">
            <FiZap size={14}/> {testSmtpMut.isPending ? 'Testing...' : 'Test SMTP'}
          </button>
          <button onClick={() => setShowCompose(true)} className="btn-primary">
            <FiMail /> Compose Custom Email
          </button>
        </div>
      </div>

      <div className="card card-body">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative w-full">
            <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by email or subject..." 
              className="form-input !pl-10 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select w-full" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select className="form-select w-full" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="">All Modules</option>
            <option value="payroll">Payroll</option>
            <option value="leave">Leave</option>
            <option value="project">Project</option>
            <option value="quotation">Quotation</option>
            <option value="invoice">Invoice</option>
            <option value="request">Request</option>
            <option value="tool">Tool</option>
            <option value="system">System</option>
            <option value="custom">Custom</option>
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
                <td className="text-xs text-slate-500">{format(new Date(log.sentAt), 'PP p')}</td>
                <td>
                  <button 
                    onClick={() => {
                      if (window.confirm('Resend this email?')) {
                        resendMut.mutate(log._id)
                      }
                    }}
                    disabled={resendMut.isPending}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <FiSend size={12} />
                    {resendMut.isPending ? 'Sending...' : 'Resend'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCompose && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold font-heading flex items-center gap-2"><FiMail className="text-blue-600" /> Compose Custom Email</h2>
              <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-red-500"><FiX size={24} /></button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="form-label mb-0">Recipients ({selectedRecipients.length} selected)</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSelectedRecipients(employees.map(e => e.email))} className="text-xs font-semibold text-blue-600 hover:underline">All Employees</button>
                    <button type="button" onClick={() => setSelectedRecipients(clients.map(c => c.email))} className="text-xs font-semibold text-blue-600 hover:underline">All Clients</button>
                    <button type="button" onClick={() => setSelectedRecipients([])} className="text-xs font-semibold text-red-600 hover:underline">Clear</button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col h-48">
                  <div className="p-2 border-b border-slate-200 bg-white relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Search to filter..." className="w-full text-sm pl-8 pr-2 py-1 outline-none" value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} />
                  </div>
                  <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    {allRecipients.map(r => (
                      <label key={r.email} className="flex items-center gap-3 p-2.5 hover:bg-white cursor-pointer px-3">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-600" checked={selectedRecipients.includes(r.email)} onChange={(e) => {
                          if (e.target.checked) setSelectedRecipients([...selectedRecipients, r.email])
                          else setSelectedRecipients(selectedRecipients.filter(em => em !== r.email))
                        }} />
                        <div className="flex-1 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                            <p className="text-xs text-slate-500">{r.email}</p>
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${r.type === 'Client' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>{r.type}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Subject</label>
                <input type="text" className="form-input" placeholder="Email Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
              </div>
              
              <div>
                <label className="form-label">Message (HTML supported)</label>
                <textarea className="form-textarea h-32" placeholder="Write your email body here..." value={composeMessage} onChange={e => setComposeMessage(e.target.value)}></textarea>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCompose(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={() => sendCustomMut.mutate()} disabled={selectedRecipients.length === 0 || !composeSubject.trim() || !composeMessage.trim() || sendCustomMut.isPending} className="btn-primary">
                {sendCustomMut.isPending ? <span className="spinner" /> : <><FiSend /> Send Custom Email</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
