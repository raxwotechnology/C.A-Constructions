import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiEdit2, FiBriefcase, FiMail, FiPhone, FiMapPin, FiGlobe, FiFileText, FiFolder, FiCreditCard, FiServer, FiMessageSquare, FiPlus, FiX } from 'react-icons/fi'

const TABS = ['Profile', 'Subscriptions', 'Invoices', 'Agreements', 'Payment History', 'Projects', 'Activity Log']
const statusColors = { Active: 'badge-green', Inactive: 'badge-gray', Lead: 'badge-yellow', Prospect: 'badge-blue', Lost: 'badge-red' }

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('Profile')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)

  const { register, handleSubmit, reset, setValue } = useForm()
  const { register: regNote, handleSubmit: handNote, reset: resetNote } = useForm({ defaultValues: { type: 'note' } })

  const { data, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.get(`/clients/${id}`).then(r => r.data),
  })

  // Branches & Users for Edit Modal
  const { data: branchData } = useQuery({ queryKey: ['branches'], queryFn: () => api.get('/branches').then(r => r.data) })
  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees').then(r => r.data) })

  const updateMut = useMutation({
    mutationFn: d => api.put(`/clients/${id}/profile`, d),
    onSuccess: () => { qc.invalidateQueries(['client', id]); toast.success('Profile updated'); setShowEditModal(false) },
    onError: e => toast.error(e.response?.data?.message || 'Update failed')
  })

  const addNoteMut = useMutation({
    mutationFn: d => api.post(`/clients/${id}/notes`, d),
    onSuccess: () => { qc.invalidateQueries(['client', id]); toast.success('Activity logged'); setShowNoteModal(false); resetNote() },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  if (isLoading) return <div className="text-center py-20"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
  
  const { client, projects, invoices, subscriptions, payments, agreements } = data || {}
  const profile = client?.profile || {}

  const openEdit = () => {
    setValue('companyName', profile.companyName)
    setValue('contactPerson', profile.contactPerson)
    setValue('designation', profile.designation)
    setValue('clientType', profile.clientType)
    setValue('industry', profile.industry)
    setValue('clientSource', profile.clientSource)
    setValue('primaryPhone', profile.primaryPhone || client?.phone)
    setValue('secondaryPhone', profile.secondaryPhone)
    setValue('billingAddress', profile.billingAddress)
    setValue('shippingAddress', profile.shippingAddress)
    setValue('branch', profile.branch || client?.branch?._id)
    setValue('accountManager', profile.accountManager?._id)
    setValue('status', profile.status)
    setShowEditModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors mt-1"><FiArrowLeft size={20}/></button>
        <div className="flex-1 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold font-heading shadow-sm border border-blue-200">
              {(profile.companyName || client?.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold font-heading text-slate-800">{profile.companyName || client?.name}</h1>
                <span className={`badge ${statusColors[profile.status] || 'badge-gray'}`}>{profile.status}</span>
                <span className="badge badge-navy">{profile.clientType}</span>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-3">
                <span><FiMail className="inline mr-1"/> {client?.email}</span>
                {profile.primaryPhone && <span><FiPhone className="inline mr-1"/> {profile.primaryPhone}</span>}
              </p>
            </div>
          </div>
          <button onClick={openEdit} className="btn-outline btn-sm"><FiEdit2 size={14}/> Edit Profile</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto hide-scrollbar bg-slate-50 rounded-t-xl px-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === t ? 'border-primary text-primary bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === 'Profile' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-4 font-heading border-b pb-2">Business Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400 mb-1">Company Name</p><p className="font-medium text-slate-800">{profile.companyName || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Industry</p><p className="font-medium text-slate-800">{profile.industry || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Source</p><p className="font-medium text-slate-800 capitalize">{profile.clientSource?.replace('_', ' ') || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Account Manager</p><p className="font-medium text-slate-800">{profile.accountManager?.name || '—'}</p></div>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <h3 className="font-bold text-slate-800 mb-4 font-heading border-b pb-2">Contact Person</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-400 mb-1">Name</p><p className="font-medium text-slate-800">{profile.contactPerson || client?.name}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Designation</p><p className="font-medium text-slate-800">{profile.designation || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Primary Phone</p><p className="font-medium text-slate-800">{profile.primaryPhone || client?.phone || '—'}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Secondary Phone</p><p className="font-medium text-slate-800">{profile.secondaryPhone || '—'}</p></div>
                </div>
              </div>
            </div>

            <div className="card p-6 md:col-span-2">
              <h3 className="font-bold text-slate-800 mb-4 font-heading border-b pb-2">Location & Addresses</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><FiMapPin/> Billing Address</p>
                  <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{profile.billingAddress || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><FiMapPin/> Shipping Address</p>
                  <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{profile.shippingAddress || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Subscriptions' && (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Subscription</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Renewal Date</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions?.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No subscriptions found</td></tr> : subscriptions?.map(s => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800 cursor-pointer hover:text-blue-600 hover:underline" onClick={() => navigate(`/admin/subscriptions`)}>{s.title}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{s.subscriptionType?.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 font-medium">LKR {s.amount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600">{s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString('en-LK') : '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'overdue' ? 'badge-red' : 'badge-gray'}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Invoices' && (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Invoice No</th>
                  <th className="px-6 py-4 font-semibold">Total Amount</th>
                  <th className="px-6 py-4 font-semibold">Balance Due</th>
                  <th className="px-6 py-4 font-semibold">Due Date</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices?.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No invoices found</td></tr> : invoices?.map(i => (
                  <tr key={i._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800 cursor-pointer hover:text-blue-600 hover:underline" onClick={() => navigate(`/admin/invoices`)}>{i.invoiceNo}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">LKR {i.total?.toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-red-600">LKR {i.remainingBalance?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600">{i.dueDate ? new Date(i.dueDate).toLocaleDateString('en-LK') : '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`badge badge-${i.status}`}>{i.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Agreements' && (
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b flex justify-between bg-slate-50">
              <span className="font-semibold text-slate-700">Client Agreements</span>
              <button onClick={() => navigate(`/admin/agreements?new=true&client=${id}`)} className="btn-outline btn-sm"><FiPlus size={14}/> Generate</button>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-white border-b text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Title</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Ref No</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agreements?.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No agreements generated</td></tr> : agreements?.map(a => (
                  <tr key={a._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800 cursor-pointer hover:text-blue-600 hover:underline" onClick={() => navigate('/admin/agreements')}>{a.title}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{a.agreementType?.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{a.agreementNo}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(a.createdAt).toLocaleDateString('en-LK')}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`badge ${a.status === 'signed' ? 'badge-green' : a.status === 'draft' ? 'badge-gray' : 'badge-blue'}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Payment History' && (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Method</th>
                  <th className="px-6 py-4 font-semibold">Reference</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments?.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No payments recorded</td></tr> : payments?.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-600">{new Date(p.createdAt).toLocaleDateString('en-LK')}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{p.currency} {p.amount?.toLocaleString()}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{p.method?.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{p.reference || '—'}</td>
                    <td className="px-6 py-4 text-center"><span className="badge badge-green">{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Projects' && (
          <div className="grid md:grid-cols-2 gap-4">
            {projects?.length === 0 ? <div className="col-span-2 text-center py-8 text-slate-400 bg-white rounded-xl border">No projects linked to this client.</div> : projects?.map(p => (
              <div key={p._id} onClick={() => navigate(`/admin/projects/${p._id}`)} className="card card-body card-hover cursor-pointer border hover:border-blue-300">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800 font-heading">{p.title}</h3>
                  <span className={`badge ${statusColors[p.status?.replace('_',' ')] || 'badge-gray'}`}>{p.status?.replace('_',' ')}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 mb-3">
                  <span>Budget: LKR {p.budget?.toLocaleString()}</span>
                  <span>{p.progress}% Complete</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-secondary" style={{width: `${p.progress}%`}}/></div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Activity Log' && (
          <div className="card p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-bold text-slate-800 font-heading flex items-center gap-2"><FiMessageSquare/> Activity Log & Notes</h3>
              <button onClick={() => setShowNoteModal(true)} className="btn-primary btn-sm"><FiPlus size={14}/> Log Activity</button>
            </div>
            
            <div className="space-y-6 pl-4 border-l-2 border-slate-100 ml-4 relative">
              {profile.notes?.length === 0 ? <p className="text-sm text-slate-400 py-4 -ml-4 text-center">No activities logged yet.</p> : profile.notes?.slice().reverse().map(note => (
                <div key={note._id} className="relative">
                  <div className={`absolute -left-[25px] w-6 h-6 rounded-full border-4 border-white flex items-center justify-center text-white
                    ${note.type === 'call' ? 'bg-blue-500' : note.type === 'meeting' ? 'bg-purple-500' : note.type === 'email' ? 'bg-orange-500' : 'bg-slate-400'}`}>
                    {note.type === 'call' ? <FiPhone size={10}/> : note.type === 'meeting' ? <FiBriefcase size={10}/> : note.type === 'email' ? <FiMail size={10}/> : <FiFileText size={10}/>}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{note.type}</span>
                      <span className="text-xs text-slate-400">{new Date(note.createdAt).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.notes}</p>
                    {note.followUpDate && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md border border-amber-200">
                        <FiCalendar/> Follow up: {new Date(note.followUpDate).toLocaleDateString('en-LK')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99] p-4" onClick={() => setShowEditModal(false)}>
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} 
              className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="p-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 text-lg">Edit Client Profile</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-200 rounded"><FiX/></button>
              </div>
              <form id="edit-profile" onSubmit={handleSubmit(d => updateMut.mutate(d))} className="p-6 overflow-y-auto space-y-6">
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="form-label">Company/Business Name</label><input {...register('companyName')} className="form-input"/></div>
                  <div><label className="form-label">Contact Person</label><input {...register('contactPerson')} className="form-input"/></div>
                  <div><label className="form-label">Designation</label><input {...register('designation')} className="form-input"/></div>
                  <div><label className="form-label">Client Type</label>
                    <select {...register('clientType')} className="form-select">
                      <option value="Individual">Individual</option>
                      <option value="Company">Company</option>
                    </select>
                  </div>
                  <div><label className="form-label">Primary Phone</label><input {...register('primaryPhone')} className="form-input"/></div>
                  <div><label className="form-label">Secondary Phone</label><input {...register('secondaryPhone')} className="form-input"/></div>
                  <div><label className="form-label">Industry</label><input {...register('industry')} className="form-input" placeholder="e.g. Retail, Healthcare"/></div>
                  <div><label className="form-label">Source</label>
                    <select {...register('clientSource')} className="form-select">
                      <option value="referral">Referral</option>
                      <option value="website">Website</option>
                      <option value="social_media">Social Media</option>
                      <option value="direct">Direct</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div><label className="form-label">Account Manager</label>
                    <select {...register('accountManager')} className="form-select">
                      <option value="">None</option>
                      {empData?.employees?.map(e => <option key={e.userId?._id} value={e.userId?._id}>{e.userId?.name}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Branch</label>
                    <select {...register('branch')} className="form-select">
                      <option value="">Global / No Branch</option>
                      {branchData?.branches?.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Status</label>
                    <select {...register('status')} className="form-select">
                      {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="form-label">Billing Address</label><textarea {...register('billingAddress')} rows={3} className="form-input resize-none"></textarea></div>
                  <div><label className="form-label">Shipping Address</label><textarea {...register('shippingAddress')} rows={3} className="form-input resize-none"></textarea></div>
                </div>

              </form>
              <div className="p-5 border-t bg-slate-50 shrink-0 flex gap-3">
                <button onClick={() => setShowEditModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" form="edit-profile" disabled={updateMut.isPending} className="btn-primary flex-1 justify-center">{updateMut.isPending ? <span className="spinner"/> : 'Save Changes'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Activity Log Modal */}
        {showNoteModal && createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99] p-4" onClick={() => setShowNoteModal(false)}>
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} 
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Log Activity</h3>
                <button onClick={() => setShowNoteModal(false)} className="p-1 hover:bg-slate-200 rounded"><FiX/></button>
              </div>
              <form onSubmit={handNote(d => addNoteMut.mutate(d))} className="p-6 space-y-4">
                <div>
                  <label className="form-label">Activity Type</label>
                  <select {...regNote('type')} className="form-select">
                    <option value="note">General Note</option>
                    <option value="call">Phone Call</option>
                    <option value="email">Email Sent/Received</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Notes *</label>
                  <textarea {...regNote('notes', {required: true})} rows={4} className="form-input resize-none" placeholder="Details of the interaction..."></textarea>
                </div>
                <div>
                  <label className="form-label">Follow-up Date (Optional)</label>
                  <input {...regNote('followUpDate')} type="date" className="form-input"/>
                  <p className="text-xs text-slate-500 mt-1">If set, a reminder will appear on the dashboard.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowNoteModal(false)} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={addNoteMut.isPending} className="btn-primary flex-1 justify-center">{addNoteMut.isPending ? <span className="spinner"/> : 'Save Activity'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
