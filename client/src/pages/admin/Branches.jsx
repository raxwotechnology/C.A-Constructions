import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiMapPin, FiPhone, FiMail, FiStar } from 'react-icons/fi'
import { useDeleteWithPassword } from '../../components/admin/DeletePasswordGate'

export default function AdminBranches() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, setValue } = useForm()

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
    mutationFn: id => api.delete(`/branches/${id}`),
    onSuccess: () => { qc.invalidateQueries(['branches']); toast.success('Branch deleted') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const { requestDelete: requestDeleteBranch, DeletePasswordModal: branchDeleteModal } = useDeleteWithPassword(deleteMut, {
    title: 'Delete branch',
    message: 'Enter your admin password to permanently delete this branch.',
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
              className={`card card-body card-hover relative ${b.isHeadOffice ? 'border-secondary/40 ring-1 ring-secondary/20' : ''}`}>
              {b.isHeadOffice && (
                <span className="absolute top-3 right-12 badge badge-blue"><FiStar size={10}/> HQ</span>
              )}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-sm">
                    {b.code?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-primary font-heading">{b.name}</h3>
                    <span className="text-xs text-gray-400 font-mono">{b.code}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={13}/></button>
                  <button type="button" onClick={() => requestDeleteBranch(b._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={13}/></button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600">
                {b.address && <div className="flex items-start gap-2"><FiMapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0"/><span>{b.address}{b.city ? `, ${b.city}` : ''}</span></div>}
                {b.phone && <div className="flex items-center gap-2"><FiPhone size={13} className="text-gray-400"/><span>{b.phone}</span></div>}
                {b.email && <div className="flex items-center gap-2"><FiMail size={13} className="text-gray-400"/><span>{b.email}</span></div>}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                <span className={`badge capitalize ${b.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{b.status}</span>
                {b.manager && <span className="text-xs text-gray-400">Mgr: {b.manager?.name}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
      {branchDeleteModal}
    </div>
  )
}
