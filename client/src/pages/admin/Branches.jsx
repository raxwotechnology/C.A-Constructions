import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiMapPin, FiPhone, FiMail, FiStar } from 'react-icons/fi'
import PasswordConfirmModal from '../../components/admin/PasswordConfirmModal'

export default function AdminBranches() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, setValue } = useForm()

  // Delete password gate state
  const [deleteTarget, setDeleteTarget] = useState(null)

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

  const openCreate = () => { reset(); setEditing(null); setShowModal(true) }
  const openEdit = b => {
    setEditing(b)
    setValue('name', b.name); setValue('code', b.code); setValue('address', b.address)
    setValue('city', b.city); setValue('phone', b.phone); setValue('email', b.email)
    setValue('status', b.status); setValue('isHeadOffice', b.isHeadOffice)
    setValue('description', b.description)
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); reset() }
  const onSubmit = d => editing ? updateMut.mutate({ id: editing._id, data: d }) : createMut.mutate(d)

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
          <p className="page-subtitle">{branches.length} branch{branches.length !== 1 ? 'es' : ''} registered</p>
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
          {branches.map((b, i) => (
            <motion.div key={b._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${b.isHeadOffice ? 'border-secondary/50 shadow-md ring-2 ring-secondary/10' : 'border-slate-200 shadow-sm hover:border-secondary/30'}`}>
              
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary/5 to-primary/5 rounded-bl-[100px] -z-0 transition-transform" />

              {/* Card content */}
              <div className="p-5 relative z-10">
                {/* Top row: branch info + HQ badge */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner ${b.isHeadOffice ? 'bg-gradient-to-br from-secondary to-blue-600' : 'bg-gradient-to-br from-slate-700 to-slate-900'}`}>
                      {b.code?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{b.name}</h3>
                      <span className="text-xs text-slate-400 font-mono font-medium tracking-wide bg-slate-100 px-1.5 py-0.5 rounded-md mt-1 inline-block">{b.code}</span>
                    </div>
                  </div>
                  {b.isHeadOffice && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-widest ring-1 ring-inset ring-secondary/20 flex-shrink-0">
                      <FiStar size={10} className="fill-secondary/20" /> HQ
                    </span>
                  )}
                </div>

                {/* Contact details */}
                <div className="space-y-2.5 text-sm text-slate-600 mb-5 pl-1">
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
                      title="Edit branch"
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
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-primary font-heading">{editing ? 'Edit Branch' : 'Add Branch'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Branch Name *</label>
                  <input {...register('name', { required: true })} className="form-input" placeholder="e.g. Colombo HQ"/></div>
                <div><label className="form-label">Branch Code *</label>
                  <input {...register('code', { required: true })} className="form-input" placeholder="e.g. CMB-001"/></div>
              </div>
              <div><label className="form-label">Address</label>
                <input {...register('address')} className="form-input" placeholder="Street address"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">City</label>
                  <input {...register('city')} className="form-input" placeholder="Colombo"/></div>
                <div><label className="form-label">Phone</label>
                  <input {...register('phone')} className="form-input" placeholder="+94 11 xxx xxxx"/></div>
              </div>
              <div><label className="form-label">Email</label>
                <input {...register('email')} type="email" className="form-input" placeholder="branch@raxwo.com"/></div>
              <div><label className="form-label">Description</label>
                <textarea {...register('description')} rows={2} className="form-input resize-none"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Status</label>
                  <select {...register('status')} className="form-select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select></div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="hq" {...register('isHeadOffice')} className="w-4 h-4"/>
                  <label htmlFor="hq" className="form-label mb-0">Head Office</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                  {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : editing ? 'Save Changes' : 'Create Branch'}
                </button>
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
