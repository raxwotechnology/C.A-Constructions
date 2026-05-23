import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiMessageSquare, FiSearch, FiRefreshCw, FiCheckCircle, FiXCircle, FiSend, FiX } from 'react-icons/fi'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function SmsLogs() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  const [showCompose, setShowCompose] = useState(false)
  const [composeMessage, setComposeMessage] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState([]) // array of { phone, name }
  const [recipientSearch, setRecipientSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sms-logs', statusFilter, moduleFilter, search],
    queryFn: () => api.get(`/sms/logs?status=${statusFilter}&module=${moduleFilter}&search=${search}`).then(r => r.data)
  })

  const { data: contactsData } = useQuery({
    queryKey: ['message-contacts'],
    queryFn: () => api.get('/messages/contacts').then(r => r.data),
    enabled: showCompose
  })
  const employees = contactsData?.users?.filter(u => u.phone) || []

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients').then(r => r.data),
    enabled: showCompose
  })
  const clients = clientsData?.clients?.filter(c => c.phone) || []

  const allRecipients = [
    ...employees.map(e => ({ name: e.name, phone: e.phone, type: 'Employee' })),
    ...clients.map(c => ({ name: c.companyName || c.contactPerson, phone: c.phone, type: 'Client' }))
  ].filter(r => r.name?.toLowerCase().includes(recipientSearch.toLowerCase()) || r.phone.includes(recipientSearch))

  const sendCustomMut = useMutation({
    mutationFn: () => api.post('/sms/send-custom', { recipients: selectedRecipients, message: composeMessage }),
    onSuccess: () => {
      toast.success('Custom SMS queued for sending!')
      setShowCompose(false)
      setComposeMessage('')
      setSelectedRecipients([])
      qc.invalidateQueries(['sms-logs'])
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to send SMS')
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
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title">SMS Logs</h1>
          <p className="page-subtitle">View and manage SMS notifications sent via SMSLenz</p>
        </div>
        <button onClick={() => setShowCompose(true)} className="btn-primary">
          <FiMessageSquare /> Compose Custom SMS
        </button>
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
            <option value="custom">Custom</option>
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

      {showCompose && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold font-heading flex items-center gap-2"><FiMessageSquare className="text-blue-600" /> Compose Custom SMS</h2>
              <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-red-500"><FiX size={24} /></button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="form-label mb-0">Recipients ({selectedRecipients.length} selected)</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSelectedRecipients(employees.map(e => ({ name: e.name, phone: e.phone })))} className="text-xs font-semibold text-blue-600 hover:underline">All Employees</button>
                    <button type="button" onClick={() => setSelectedRecipients(clients.map(c => ({ name: c.companyName || c.contactPerson, phone: c.phone })))} className="text-xs font-semibold text-blue-600 hover:underline">All Clients</button>
                    <button type="button" onClick={() => setSelectedRecipients([])} className="text-xs font-semibold text-red-600 hover:underline">Clear</button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col h-48">
                  <div className="p-2 border-b border-slate-200 bg-white relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Search to filter..." className="w-full text-sm pl-8 pr-2 py-1 outline-none" value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} />
                  </div>
                  <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    {allRecipients.map(r => {
                      const isSelected = selectedRecipients.some(sr => sr.phone === r.phone);
                      return (
                        <label key={r.phone} className="flex items-center gap-3 p-2.5 hover:bg-white cursor-pointer px-3">
                          <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-600" checked={isSelected} onChange={(e) => {
                            if (e.target.checked) setSelectedRecipients([...selectedRecipients, { name: r.name, phone: r.phone }])
                            else setSelectedRecipients(selectedRecipients.filter(sr => sr.phone !== r.phone))
                          }} />
                          <div className="flex-1 flex justify-between items-center">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                              <p className="text-xs text-slate-500">{r.phone}</p>
                            </div>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${r.type === 'Client' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>{r.type}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="form-label flex justify-between">Message <span>{composeMessage.length}/160 chars</span></label>
                <textarea className="form-textarea h-24" placeholder="Write your text message here..." maxLength={160} value={composeMessage} onChange={e => setComposeMessage(e.target.value)}></textarea>
                <p className="text-[10px] text-slate-400 mt-1">SMS standard limit is 160 characters. Longer messages may be split or incur additional charges depending on the gateway.</p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCompose(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={() => sendCustomMut.mutate()} disabled={selectedRecipients.length === 0 || !composeMessage.trim() || sendCustomMut.isPending} className="btn-primary">
                {sendCustomMut.isPending ? <span className="spinner" /> : <><FiSend /> Send Custom SMS</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
