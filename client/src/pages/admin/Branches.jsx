import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiMapPin, FiPhone, FiMail, FiStar, FiFileText, FiUpload, FiGlobe, FiInfo } from 'react-icons/fi'
import PasswordConfirmModal from '../../components/admin/PasswordConfirmModal'
import { mediaUrl } from '../../lib/media'

export default function AdminBranches() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('general')
  const [logoUploading, setLogoUploading] = useState(false)
  const { register, handleSubmit, reset, setValue, watch } = useForm()

  // Delete password gate state
  const [deleteTarget, setDeleteTarget] = useState(null)

  const logoUrlVal = watch('letterheadLogoUrl')

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: d => api.post('/branches', d),
    onSuccess: () => { qc.invalidateQueries(['branches']); toast.success('Branch created'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/branches/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['branches']); toast.success('Updated'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: ({ id, password }) => api.delete(`/branches/${id}`, { data: { password } }),
    onSuccess: () => { qc.invalidateQueries(['branches']); toast.success('Branch deleted'); setDeleteTarget(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const openCreate = () => {
    reset()
    setEditing(null)
    setActiveTab('general')
    setShowModal(true)
  }

  const openEdit = b => {
    setEditing(b)
    setActiveTab('general')
    setValue('name', b.name || '')
    setValue('code', b.code || '')
    setValue('address', b.address || '')
    setValue('city', b.city || '')
    setValue('phone', b.phone || '')
    setValue('email', b.email || '')
    setValue('status', b.status || 'active')
    setValue('isHeadOffice', b.isHeadOffice || false)
    setValue('description', b.description || '')
    setValue('letterheadName', b.letterheadName || '')
    setValue('letterheadTagline', b.letterheadTagline || '')
    setValue('letterheadAddress', b.letterheadAddress || '')
    setValue('letterheadPhone', b.letterheadPhone || '')
    setValue('letterheadEmail', b.letterheadEmail || '')
    setValue('letterheadWebsite', b.letterheadWebsite || '')
    setValue('letterheadLogoUrl', b.letterheadLogoUrl || '')
    setValue('letterheadFooter', b.letterheadFooter || '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setActiveTab('general')
    reset()
  }

  const onSubmit = d => editing ? updateMut.mutate({ id: editing._id, data: d }) : createMut.mutate(d)

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('image', file)
    setLogoUploading(true)
    try {
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data?.imageUrl) {
        setValue('letterheadLogoUrl', res.data.imageUrl)
        toast.success('Logo uploaded')
      }
    } catch (err) {
      toast.error('Logo upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  // Password-protected delete handlers
  const handleDeleteConfirm = async (password) => {
    if (!deleteTarget) return
    // Verify password first
    await api.post('/auth/verify-password', { password })
    // Then delete
    await deleteMut.mutateAsync({ id: deleteTarget._id, password })
  }

  const branches = data?.branches || []

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Branch Management</h1>
          <p className="page-subtitle">{branches.length} branch{branches.length !== 1 ? 'es' : ''} registered · Customize branch addresses &amp; letterheads</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={15}/> Add Branch</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/></div>
      ) : branches.length === 0 ? (
        <div className="card card-body text-center py-16 text-gray-400">
          <FiMapPin size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">No branches yet</p>
          <p className="text-sm mt-1">Add your first company branch to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((b, i) => {
            const hasCustomLetterhead = Boolean(
              b.letterheadAddress || b.letterheadName || b.letterheadPhone || b.letterheadLogoUrl || b.letterheadTagline
            )
            return (
              <motion.div key={b._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${b.isHeadOffice ? 'border-secondary/50 shadow-md ring-2 ring-secondary/10' : 'border-slate-200 shadow-sm hover:border-secondary/30'}`}>
                
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary/5 to-primary/5 rounded-bl-[100px] -z-0 transition-transform" />

                {/* Card content */}
                <div className="p-5 relative z-10">
                  {/* Top row: branch info + HQ badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner ${b.isHeadOffice ? 'bg-gradient-to-br from-secondary to-blue-600' : 'bg-gradient-to-br from-slate-700 to-slate-900'}`}>
                        {b.code?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{b.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400 font-mono font-medium tracking-wide bg-slate-100 px-1.5 py-0.5 rounded-md inline-block">{b.code}</span>
                          {hasCustomLetterhead && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold border border-blue-100" title="Custom Letterhead Configured">
                              <FiFileText size={10} /> Letterhead Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {b.isHeadOffice && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest ring-1 ring-inset ring-secondary/20 flex-shrink-0">
                        <FiStar size={10} className="fill-secondary/20" /> HQ
                      </span>
                    )}
                  </div>

                  {/* Letterhead address summary if present */}
                  {b.letterheadAddress ? (
                    <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700 block mb-0.5 flex items-center gap-1">
                        <FiFileText size={11} className="text-blue-500"/> Document Header Address:
                      </span>
                      <span className="line-clamp-2 text-slate-600 font-normal">{b.letterheadAddress}</span>
                    </div>
                  ) : null}

                  {/* Contact details */}
                  <div className="space-y-2 text-sm text-slate-600 mb-5 pl-1">
                    {b.address && <div className="flex items-start gap-3"><FiMapPin size={15} className="text-slate-400 mt-0.5 flex-shrink-0"/><span className="leading-relaxed">{b.address}{b.city ? `, ${b.city}` : ''}</span></div>}
                    {b.phone && <div className="flex items-center gap-3"><FiPhone size={14} className="text-slate-400"/><span className="font-medium">{b.phone}</span></div>}
                    {b.email && <div className="flex items-center gap-3"><FiMail size={14} className="text-slate-400"/><span>{b.email}</span></div>}
                  </div>

                  {/* Bottom row: status + action buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100/80">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${b.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{b.status}</span>
                      {b.manager && (
                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 ml-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                            {b.manager.name?.charAt(0)}
                          </span>
                          <span className="text-[11px] font-medium text-slate-600 pr-1">{b.manager.name}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* ===== EDIT & DELETE BUTTONS ===== */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        title="Edit branch & letterhead settings"
                      >
                        <FiEdit2 size={13}/> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                        title="Delete branch"
                      >
                        <FiTrash2 size={13}/> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal with Letterhead Customization Tabs */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-heading">{editing ? `Edit Branch — ${editing.name}` : 'Add New Branch'}</h3>
                <p className="text-xs text-slate-500">Configure branch contact details and document letterhead overrides</p>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><FiX size={18}/></button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-5 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${activeTab === 'general' ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                1. General &amp; Contact Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('letterhead')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'letterhead' ? 'border-secondary text-secondary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <FiFileText size={14}/> 2. Letterhead &amp; Document Address
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeTab === 'general' ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Branch Name *</label>
                      <input {...register('name', { required: true })} className="form-input" placeholder="e.g. Kandy Branch"/>
                    </div>
                    <div>
                      <label className="form-label">Branch Code *</label>
                      <input {...register('code', { required: true })} className="form-input" placeholder="e.g. KDY-001"/>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Physical Address</label>
                    <input {...register('address')} className="form-input" placeholder="Street address"/>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">City</label>
                      <input {...register('city')} className="form-input" placeholder="Kandy"/>
                    </div>
                    <div>
                      <label className="form-label">Phone Number</label>
                      <input {...register('phone')} className="form-input" placeholder="+94 81 222 xxxx"/>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Branch Email</label>
                    <input {...register('email')} type="email" className="form-input" placeholder="kandy@company.com"/>
                  </div>

                  <div>
                    <label className="form-label">Description / Internal Notes</label>
                    <textarea {...register('description')} rows={2} className="form-input resize-none" placeholder="Notes about this branch location..."/>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="form-label">Branch Status</label>
                      <select {...register('status')} className="form-select">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input type="checkbox" id="hq" {...register('isHeadOffice')} className="w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary"/>
                      <label htmlFor="hq" className="form-label mb-0 cursor-pointer select-none">Head Office (HQ)</label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                    <FiInfo size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="leading-relaxed">
                      <strong>Branch Letterhead Customization:</strong> Invoices, Quotations, Letters, and Agreements issued under this branch will use these custom header &amp; address details. Leave any field blank to fallback to global company settings.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Letterhead Company Title Override</label>
                      <input {...register('letterheadName')} className="form-input" placeholder="Default: Main Company Name"/>
                    </div>
                    <div>
                      <label className="form-label">Branch Subtitle / Tagline</label>
                      <input {...register('letterheadTagline')} className="form-input" placeholder="e.g. Kandy Regional Office & Design Studio"/>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Document Header Address (Letterhead Address)</label>
                    <textarea {...register('letterheadAddress')} rows={2} className="form-input resize-none" placeholder="e.g. No. 45, Peradeniya Road, Kandy, Sri Lanka"/>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Letterhead Phone / Tel</label>
                      <input {...register('letterheadPhone')} className="form-input" placeholder="e.g. 081-2234567 / 077-0749690"/>
                    </div>
                    <div>
                      <label className="form-label">Letterhead Email</label>
                      <input {...register('letterheadEmail')} type="email" className="form-input" placeholder="e.g. kandy@rach.lk"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label flex items-center gap-1"><FiGlobe size={13}/> Website URL</label>
                      <input {...register('letterheadWebsite')} className="form-input" placeholder="www.rach.lk"/>
                    </div>
                    <div>
                      <label className="form-label">Custom Branch Logo Image</label>
                      <div className="flex items-center gap-2">
                        <input {...register('letterheadLogoUrl')} className="form-input text-xs" placeholder="URL or upload image"/>
                        <label className="btn-secondary text-xs px-3 py-2 cursor-pointer flex items-center gap-1 flex-shrink-0">
                          {logoUploading ? <span className="spinner"/> : <FiUpload size={13} />} Upload
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {logoUrlVal && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="w-16 h-12 bg-white rounded border flex items-center justify-center p-1">
                        <img src={mediaUrl(logoUrlVal)} alt="Branch logo" className="max-h-full max-w-full object-contain" />
                      </div>
                      <span className="text-xs text-slate-500 flex-1 truncate">{logoUrlVal}</span>
                      <button type="button" onClick={() => setValue('letterheadLogoUrl', '')} className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
                    </div>
                  )}

                  <div>
                    <label className="form-label">Document Footer Text Override</label>
                    <input {...register('letterheadFooter')} className="form-input" placeholder="e.g. © R A Creations — Kandy Branch. All rights reserved."/>
                  </div>
                </div>
              )}

              {/* Form Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Tab {activeTab === 'general' ? '1/2' : '2/2'}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={closeModal} className="btn-ghost px-4 justify-center">Cancel</button>
                  {activeTab === 'general' ? (
                    <button type="button" onClick={() => setActiveTab('letterhead')} className="btn-secondary px-5 justify-center">
                      Next: Letterhead &rarr;
                    </button>
                  ) : (
                    <button type="button" onClick={() => setActiveTab('general')} className="btn-ghost px-4 justify-center">
                      &larr; Back
                    </button>
                  )}
                  <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary px-6 justify-center">
                    {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : editing ? 'Save Changes' : 'Create Branch'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Password-protected delete modal */}
      <PasswordConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        isSubmitting={deleteMut.isPending}
        title="Delete Branch"
        message={`Enter your admin password to permanently delete "${deleteTarget?.name}". This action cannot be undone.`}
      />
    </div>
  )
}
