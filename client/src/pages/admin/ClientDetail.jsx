import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiMail, FiPhone, FiFolder, FiFileText, FiCreditCard, FiServer, FiEdit2, FiPlus, FiCheck } from 'react-icons/fi'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function ClientDetail({ clientId, onClose }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [editingProfile, setEditingProfile] = useState(false)
  const [noteForm, setNoteForm] = useState({ notes: '', type: 'note', followUpDate: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['client-detail', clientId],
    queryFn: () => api.get(`/clients/${clientId}`).then(r => r.data),
    enabled: !!clientId
  })

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const updateProfileMut = useMutation({
    mutationFn: (payload) => api.put(`/clients/${clientId}`, payload),
    onSuccess: () => {
      toast.success('Profile updated')
      setEditingProfile(false)
      qc.invalidateQueries(['client-detail', clientId])
      qc.invalidateQueries(['admin-clients'])
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to update')
  })

  const addNoteMut = useMutation({
    mutationFn: (payload) => api.post(`/clients/${clientId}/notes`, payload),
    onSuccess: () => {
      toast.success('Note added')
      setNoteForm({ notes: '', type: 'note', followUpDate: '' })
      qc.invalidateQueries(['client-detail', clientId])
    }
  })

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[80vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/>
      </div>
    </div>
  )

  const { client, projects, invoices, subscriptions, payments } = data || {}
  const profile = client?.profile || {}

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-hidden">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xl">
              {client?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary font-heading">{client?.name}</h2>
              <div className="flex gap-2 text-sm text-slate-500 mt-1">
                <span className="capitalize">{profile.clientType || 'Individual'}</span> • 
                <span>{client?.email}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><FiX size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b shrink-0 bg-white overflow-x-auto no-scrollbar">
          {['profile', 'projects', 'invoices', 'subscriptions', 'payments', 'notes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-primary">Client Details</h3>
                <button onClick={() => setEditingProfile(!editingProfile)} className="btn-outline btn-sm">
                  {editingProfile ? 'Cancel Edit' : <><FiEdit2 size={12}/> Edit</>}
                </button>
              </div>

              {editingProfile ? (
                <form onSubmit={e => {
                  e.preventDefault()
                  const fd = new FormData(e.target)
                  updateProfileMut.mutate(Object.fromEntries(fd.entries()))
                }} className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="form-label">Company Name</label><input name="companyName" defaultValue={profile.companyName} className="form-input"/></div>
                    <div><label className="form-label">Contact Person</label><input name="contactPerson" defaultValue={profile.contactPerson} className="form-input"/></div>
                    <div><label className="form-label">Designation</label><input name="designation" defaultValue={profile.designation} className="form-input"/></div>
                    <div>
                      <label className="form-label">Client Type</label>
                      <select name="clientType" defaultValue={profile.clientType} className="form-select">
                        <option value="Individual">Individual</option>
                        <option value="Company">Company</option>
                      </select>
                    </div>
                    <div><label className="form-label">Industry</label><input name="industry" defaultValue={profile.industry} className="form-input"/></div>
                    <div>
                      <label className="form-label">Source</label>
                      <select name="clientSource" defaultValue={profile.clientSource} className="form-select">
                        <option value="direct">Direct</option><option value="referral">Referral</option>
                        <option value="website">Website</option><option value="social media">Social Media</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div><label className="form-label">Primary Phone</label><input name="primaryPhone" defaultValue={profile.primaryPhone || client?.phone} className="form-input"/></div>
                    <div><label className="form-label">Secondary Phone</label><input name="secondaryPhone" defaultValue={profile.secondaryPhone} className="form-input"/></div>
                    <div className="col-span-2"><label className="form-label">Billing Address</label><textarea name="billingAddress" defaultValue={profile.billingAddress} className="form-input" rows="2"/></div>
                    <div className="col-span-2"><label className="form-label">Shipping Address</label><textarea name="shippingAddress" defaultValue={profile.shippingAddress} className="form-input" rows="2"/></div>
                    <div>
                      <label className="form-label">Branch</label>
                      <select name="branch" defaultValue={profile.branch || ''} className="form-select">
                        <option value="">None</option>
                        {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select name="status" defaultValue={profile.status} className="form-select">
                        <option value="Lead">Lead</option><option value="Prospect">Prospect</option>
                        <option value="Active">Active</option><option value="Inactive">Inactive</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2"><button type="submit" disabled={updateProfileMut.isPending} className="btn-primary">{updateProfileMut.isPending ? <span className="spinner"/> : 'Save Changes'}</button></div>
                </form>
              ) : (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div><p className="text-slate-400 mb-1">Company Name</p><p className="font-medium text-slate-800">{profile.companyName || '—'}</p></div>
                  <div><p className="text-slate-400 mb-1">Contact Person</p><p className="font-medium text-slate-800">{profile.contactPerson || '—'}</p></div>
                  <div><p className="text-slate-400 mb-1">Status</p><span className="badge badge-navy">{profile.status || 'Lead'}</span></div>
                  <div><p className="text-slate-400 mb-1">Industry</p><p className="font-medium text-slate-800">{profile.industry || '—'}</p></div>
                  <div><p className="text-slate-400 mb-1">Primary Phone</p><p className="font-medium text-slate-800">{profile.primaryPhone || client?.phone || '—'}</p></div>
                  <div><p className="text-slate-400 mb-1">Secondary Phone</p><p className="font-medium text-slate-800">{profile.secondaryPhone || '—'}</p></div>
                  <div className="col-span-2"><p className="text-slate-400 mb-1">Billing Address</p><p className="font-medium text-slate-800">{profile.billingAddress || '—'}</p></div>
                </div>
              )}
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-primary">Projects ({projects.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(p => (
                  <div key={p._id} className="card card-body border border-slate-200">
                    <h4 className="font-bold text-slate-800 truncate mb-2">{p.title}</h4>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`badge ${p.status==='active'?'badge-green':'badge-gray'} capitalize`}>{p.status}</span>
                      <span className="text-xs text-slate-500 font-medium">{p.progress}% done</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-secondary h-1.5 rounded-full" style={{width: `${p.progress}%`}}/></div>
                    <p className="text-xs text-slate-400 mt-3 font-medium">Budget: LKR {(p.budget||0).toLocaleString()}</p>
                  </div>
                ))}
                {projects.length === 0 && <p className="text-slate-400 col-span-full">No projects assigned.</p>}
              </div>
            </div>
          )}

          {/* INVOICES TAB */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-primary">Invoices ({invoices.length})</h3>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Invoice No</th><th>Date Due</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                  <tbody>
                    {invoices.map(i => (
                      <tr key={i._id}>
                        <td className="font-medium text-slate-800">{i.invoiceNo}</td>
                        <td className="text-slate-500 text-sm">{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '—'}</td>
                        <td className="font-medium">LKR {i.total.toLocaleString()}</td>
                        <td className={`font-medium ${i.remainingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>LKR {i.remainingBalance.toLocaleString()}</td>
                        <td><span className={`badge ${i.status === 'paid' ? 'badge-green' : i.status === 'overdue' ? 'badge-red' : 'badge-yellow'} capitalize`}>{i.status}</span></td>
                      </tr>
                    ))}
                    {invoices.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-slate-400">No invoices.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBSCRIPTIONS TAB */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-primary">Subscriptions ({subscriptions.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscriptions.map(s => (
                  <div key={s._id} className="card card-body border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 truncate">{s.serviceName}</h4>
                      <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-red'} capitalize`}>{s.status}</span>
                    </div>
                    <p className="text-sm font-medium text-secondary mb-3">LKR {s.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Next billing: {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : '—'}</p>
                  </div>
                ))}
                {subscriptions.length === 0 && <p className="text-slate-400 col-span-full">No active subscriptions.</p>}
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-primary">Payment History ({payments.length})</h3>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p._id}>
                        <td className="text-slate-500 text-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="font-medium text-emerald-600">{p.currency} {p.amount.toLocaleString()}</td>
                        <td className="text-slate-500 text-sm capitalize">{p.method || 'System'}</td>
                        <td><span className={`badge ${p.status === 'completed' ? 'badge-green' : 'badge-gray'} capitalize`}>{p.status}</span></td>
                      </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-slate-400">No payment records.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-primary">Activity Log & Notes</h3>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 text-sm">Add New Entry</h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="form-label">Type</label>
                    <select className="form-select" value={noteForm.type} onChange={e => setNoteForm(s => ({ ...s, type: e.target.value }))}>
                      <option value="note">Note</option><option value="call">Call</option>
                      <option value="meeting">Meeting</option><option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Follow-up Date (Optional)</label>
                    <input type="date" className="form-input" value={noteForm.followUpDate} onChange={e => setNoteForm(s => ({ ...s, followUpDate: e.target.value }))}/>
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Notes</label>
                    <textarea className="form-input" rows="3" placeholder="Log details..." value={noteForm.notes} onChange={e => setNoteForm(s => ({ ...s, notes: e.target.value }))}></textarea>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => addNoteMut.mutate(noteForm)} disabled={!noteForm.notes || addNoteMut.isPending} className="btn-primary btn-sm">
                    {addNoteMut.isPending ? <span className="spinner"/> : 'Save Entry'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {(profile.notes || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map((note, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 uppercase font-bold text-xs">
                      {note.type.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{note.type}</span>
                        <span className="text-xs text-slate-400">{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 text-sm whitespace-pre-wrap">{note.notes}</p>
                      {note.followUpDate && (
                        <div className="mt-2 text-xs font-medium text-orange-500 bg-orange-50 inline-block px-2 py-1 rounded">
                          Follow-up: {new Date(note.followUpDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(profile.notes || []).length === 0 && <p className="text-slate-400 text-center py-4">No activity logged yet.</p>}
              </div>

            </div>
          )}

        </div>
      </motion.div>
    </div>
  )
}
