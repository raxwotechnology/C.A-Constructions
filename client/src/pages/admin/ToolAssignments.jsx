import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiX, FiEdit2, FiSlash, FiKey, FiMonitor, FiCode, FiTrendingUp, FiMessageSquare, FiCpu, FiFolder, FiChevronDown } from 'react-icons/fi'

const TOOL_TYPES = [
  { value: 'design', label: 'Design', icon: FiMonitor, color: 'from-purple-500 to-pink-500' },
  { value: 'development', label: 'Development', icon: FiCode, color: 'from-blue-500 to-cyan-500' },
  { value: 'marketing', label: 'Marketing', icon: FiTrendingUp, color: 'from-orange-500 to-amber-500' },
  { value: 'communication', label: 'Communication', icon: FiMessageSquare, color: 'from-green-500 to-emerald-500' },
  { value: 'ai', label: 'AI Tools', icon: FiCpu, color: 'from-violet-500 to-indigo-500' },
  { value: 'project_management', label: 'PM', icon: FiFolder, color: 'from-teal-500 to-cyan-500' },
  { value: 'other', label: 'Other', icon: FiKey, color: 'from-slate-400 to-slate-600' },
]

const COMMON_TOOLS = ['Canva', 'ChatGPT', 'Figma', 'GitHub', 'Slack', 'Trello', 'Notion', 'Adobe XD', 'Google Analytics', 'Semrush', 'Mailchimp', 'VS Code', 'Jira']

export default function ToolAssignments() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ employee: '', toolName: '', toolType: 'other', accountEmail: '', accountPassword: '', accessUrl: '', licenseKey: '', notes: '', expiresAt: '' })
  const [empSearch, setEmpSearch] = useState('')
  const [showEmpDropdown, setShowEmpDropdown] = useState(false)

  const { data: empData } = useQuery({ queryKey: ['employees-list'], queryFn: () => api.get('/employees').then(r => r.data) })
  const employees = empData?.employees || []

  const { data, isLoading } = useQuery({
    queryKey: ['tool-assignments', filter],
    queryFn: () => api.get(`/tool-assignments${filter !== 'all' ? `?status=${filter}` : ''}`).then(r => r.data),
  })
  const assignments = data?.assignments || []

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/tool-assignments', payload).then(r => r.data),
    onSuccess: () => { toast.success('Tool assigned!'); setShowForm(false); resetForm(); qc.invalidateQueries({ queryKey: ['tool-assignments'] }) },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const updateMut = useMutation({
    mutationFn: (payload) => api.put(`/tool-assignments/${payload._id}`, payload).then(r => r.data),
    onSuccess: () => { toast.success('Tool updated!'); setShowForm(false); resetForm(); qc.invalidateQueries({ queryKey: ['tool-assignments'] }) },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const revokeMut = useMutation({
    mutationFn: (id) => api.put(`/tool-assignments/${id}/revoke`),
    onSuccess: () => { toast.success('Access revoked'); qc.invalidateQueries({ queryKey: ['tool-assignments'] }) },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/tool-assignments/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['tool-assignments'] }) }
  })

  const resetForm = () => {
    setEditing(null)
    setForm({ employee: '', toolName: '', toolType: 'other', accountEmail: '', accountPassword: '', accessUrl: '', licenseKey: '', notes: '', expiresAt: '' })
    setEmpSearch('')
    setShowEmpDropdown(false)
  }

  const handleEdit = (tool) => {
    setEditing(tool._id)
    setForm({
      employee: tool.employee?._id || tool.employee || '',
      toolName: tool.toolName || '',
      toolType: tool.toolType || 'other',
      accountEmail: tool.accountEmail || '',
      accountPassword: tool.accountPassword || '',
      accessUrl: tool.accessUrl || '',
      licenseKey: tool.licenseKey || '',
      notes: tool.notes || '',
      expiresAt: tool.expiresAt ? new Date(tool.expiresAt).toISOString().split('T')[0] : ''
    })
    setShowForm(true)
  }

  const handleSubmit = () => {
    if (editing) {
      updateMut.mutate({ _id: editing, ...form })
    } else {
      createMut.mutate(form)
    }
  }

  const getTypeInfo = (type) => TOOL_TYPES.find(t => t.value === type) || TOOL_TYPES[TOOL_TYPES.length - 1]

  const grouped = assignments.reduce((acc, a) => {
    const emp = a.employee?.userId?.name || 'Unknown'
    if (!acc[emp]) acc[emp] = []
    acc[emp].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tool & Account Assignments</h1>
          <p className="page-subtitle">Assign tools, software, and accounts to employees.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary gap-2">
          <FiPlus size={14} /> Assign Tool
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Assignments', val: assignments.length, color: 'kpi-blue' },
          { label: 'Active', val: assignments.filter(a => a.status === 'active').length, color: 'kpi-green' },
          { label: 'Revoked', val: assignments.filter(a => a.status === 'revoked').length, color: 'kpi-red' },
        ].map(s => (
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className="text-3xl font-black text-primary mt-1">{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {['all', 'active', 'revoked', 'pending'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${filter === f ? 'bg-white shadow text-secondary' : 'text-slate-500 hover:text-slate-700'}`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FiKey size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No tool assignments yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Assign First Tool</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([empName, tools]) => (
            <div key={empName} className="card card-body">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center font-bold text-secondary">
                  {empName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-primary">{empName}</p>
                  <p className="text-xs text-slate-400">{tools.length} tool(s) assigned</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tools.map(a => {
                  const ti = getTypeInfo(a.toolType)
                  const Icon = ti.icon
                  return (
                    <motion.div key={a._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-xl border ${a.status === 'active' ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ti.color} flex items-center justify-center`}>
                          <Icon size={16} className="text-white" />
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="font-bold text-primary">{a.toolName}</p>
                      <p className="text-xs text-slate-400 mb-2 capitalize">{ti.label}</p>
                      {a.accountEmail && <p className="text-xs text-slate-500 mb-1">📧 {a.accountEmail}</p>}
                      {a.accountPassword && (
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1 cursor-pointer hover:text-slate-700" onClick={() => { navigator.clipboard.writeText(a.accountPassword); toast.success('Password copied') }} title="Click to copy password">
                          🔑 <span className="truncate">{a.accountPassword}</span>
                        </p>
                      )}
                      {a.licenseKey && <p className="text-xs text-slate-500 mb-1">🏷️ {a.licenseKey}</p>}
                      {a.notes && <p className="text-xs text-slate-500 mb-1 line-clamp-2" title={a.notes}>📝 {a.notes}</p>}
                      {a.accessUrl && <a href={a.accessUrl} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline inline-block mb-1">🔗 Open Tool</a>}
                      {a.expiresAt && <p className="text-xs text-amber-600 mt-1">⏰ Expires {new Date(a.expiresAt).toLocaleDateString()}</p>}
                      <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                        <button onClick={() => handleEdit(a)} className="btn-ghost btn-sm text-xs text-secondary hover:bg-secondary/10 gap-1">
                          <FiEdit2 size={11} /> Edit
                        </button>
                        {a.status === 'active' && (
                          <button onClick={() => revokeMut.mutate(a._id)} className="btn-outline btn-sm text-xs text-red-500 border-red-200 hover:bg-red-50 gap-1">
                            <FiSlash size={11} /> Revoke
                          </button>
                        )}
                        <button onClick={() => deleteMut.mutate(a._id)} className="btn-ghost btn-sm text-xs text-slate-400 hover:text-red-500">Delete</button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Tool Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h2 className="font-bold text-primary text-lg">{editing ? 'Edit Tool Assignment' : 'Assign Tool / Account'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-xl"><FiX /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="relative">
                  <label className="form-label">Employee</label>
                  <div 
                    className="form-input flex justify-between items-center cursor-pointer" 
                    onClick={() => setShowEmpDropdown(!showEmpDropdown)}
                  >
                    <span className={form.employee ? 'text-slate-800' : 'text-slate-400'}>
                      {form.employee ? employees.find(e => e._id === form.employee)?.userId?.name || 'Unknown' : 'Select Employee...'}
                    </span>
                    <FiChevronDown className="text-slate-400" />
                  </div>
                  
                  {showEmpDropdown && (
                    <>
                      <div className="fixed inset-0 z-[40]" onClick={() => setShowEmpDropdown(false)} />
                      <div className="absolute z-[50] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-60">
                        <div className="p-2 border-b border-slate-100 bg-white sticky top-0">
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="Search employee by name or role..." 
                            className="form-input py-1.5 text-sm" 
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                          />
                        </div>
                        <div className="overflow-y-auto custom-scrollbar">
                          {employees.filter(e => (e.userId?.name || '').toLowerCase().includes(empSearch.toLowerCase()) || (e.userId?.role || '').toLowerCase().includes(empSearch.toLowerCase())).map(e => (
                            <div 
                              key={e._id} 
                              className={`px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm border-l-2 ${form.employee === e._id ? 'border-primary bg-slate-50' : 'border-transparent'}`}
                              onClick={() => {
                                setForm(s => ({ ...s, employee: e._id }));
                                setShowEmpDropdown(false);
                                setEmpSearch('');
                              }}
                            >
                              <p className="font-medium text-slate-800">{e.userId?.name}</p>
                              <p className="text-xs text-slate-400 capitalize">{e.userId?.role}</p>
                            </div>
                          ))}
                          {employees.filter(e => (e.userId?.name || '').toLowerCase().includes(empSearch.toLowerCase()) || (e.userId?.role || '').toLowerCase().includes(empSearch.toLowerCase())).length === 0 && (
                            <div className="p-3 text-sm text-slate-400 text-center">No employees found matching "{empSearch}"</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="form-label">Tool Name</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COMMON_TOOLS.map(t => (
                      <button key={t} onClick={() => setForm(s => ({ ...s, toolName: t }))}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${form.toolName === t ? 'bg-secondary text-white border-secondary' : 'border-slate-200 hover:border-secondary text-slate-600'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <input className="form-input" placeholder="Or type custom tool name..." value={form.toolName} onChange={e => setForm(s => ({ ...s, toolName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Tool Type</label>
                    <select className="form-select" value={form.toolType} onChange={e => setForm(s => ({ ...s, toolType: e.target.value }))}>
                      {TOOL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Expiry Date (Optional)</label>
                    <input type="date" className="form-input" value={form.expiresAt} onChange={e => setForm(s => ({ ...s, expiresAt: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Account Email</label>
                    <input className="form-input" placeholder="account@example.com" value={form.accountEmail} onChange={e => setForm(s => ({ ...s, accountEmail: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Password</label>
                    <input className="form-input" placeholder="••••••••" value={form.accountPassword} onChange={e => setForm(s => ({ ...s, accountPassword: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Access URL</label>
                  <input className="form-input" placeholder="https://..." value={form.accessUrl} onChange={e => setForm(s => ({ ...s, accessUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">License Key / Notes</label>
                  <textarea className="form-input" rows="2" value={form.notes} onChange={e => setForm(s => ({ ...s, notes: e.target.value }))} />
                </div>
              </div>
              <div className="p-5 border-t bg-slate-50 rounded-b-2xl">
                <button onClick={handleSubmit} disabled={!form.employee || !form.toolName || createMut.isPending || updateMut.isPending} className="btn-primary w-full justify-center">
                  {createMut.isPending || updateMut.isPending ? <span className="spinner" /> : (editing ? 'Update Tool' : 'Assign Tool')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
