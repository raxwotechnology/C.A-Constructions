import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiUsers, FiAward, FiHash, FiCamera, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const COLOR_OPTIONS = [
  { value: 'bg-blue-500',   hex: '#3b82f6' },
  { value: 'bg-purple-500', hex: '#a855f7' },
  { value: 'bg-green-500',  hex: '#22c55e' },
  { value: 'bg-orange-500', hex: '#f97316' },
  { value: 'bg-red-500',    hex: '#ef4444' },
  { value: 'bg-teal-500',   hex: '#14b8a6' },
  { value: 'bg-pink-500',   hex: '#ec4899' },
  { value: 'bg-indigo-500', hex: '#6366f1' },
]

import { mediaUrl } from '../../lib/media'

export default function AdminLeaders() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId]   = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', role: '', dept: '', initials: '', color: 'bg-blue-500', order: 0 })
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const fileRef = useRef()

  const { data: leaders = [], isLoading } = useQuery({
    queryKey: ['admin-leaders'],
    queryFn: () => api.get('/leaders').then(r => r.data.leaders),
  })

  const buildFormData = () => {
    const fd = new FormData()
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v))
    if (imageFile) fd.append('image', imageFile)
    return fd
  }

  const createMutation = useMutation({
    mutationFn: () => api.post('/leaders', buildFormData(), { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-leaders'] }); queryClient.invalidateQueries({ queryKey: ['public-leaders'] }); toast.success('Leader added'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add'),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/leaders/${editingId}`, buildFormData(), { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-leaders'] }); queryClient.invalidateQueries({ queryKey: ['public-leaders'] }); toast.success('Leader updated'); closeModal() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/leaders/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-leaders'] }); queryClient.invalidateQueries({ queryKey: ['public-leaders'] }); toast.success('Leader removed') },
  })

  const closeModal = () => {
    setIsModalOpen(false); setEditingId(null)
    setFormData({ name: '', role: '', dept: '', initials: '', color: 'bg-blue-500', order: 0 })
    setImageFile(null); setImagePreview('')
  }

  const openAdd = () => { closeModal(); setIsModalOpen(true) }

  const handleEdit = (l) => {
    setEditingId(l._id)
    setFormData({ name: l.name, role: l.role, dept: l.dept, initials: l.initials, color: l.color, order: l.order })
    setImagePreview(l.imageUrl ? mediaUrl(l.imageUrl) : '')
    setImageFile(null)
    setIsModalOpen(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    editingId ? updateMutation.mutate() : createMutation.mutate()
  }

  const isBusy = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <FiUsers size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Leadership Team</h1>
              <p className="text-gray-400 text-xs mt-0.5">Shown on the public About page</p>
            </div>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <FiPlus size={16} /> Add Leader
          </button>
        </div>

        {/* Table Card for Desktop */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hidden md:block">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div className="col-span-1 flex items-center gap-1"><FiHash size={11} /> #</div>
            <div className="col-span-1">Photo</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Role / Title</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-1 text-center">Order</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-20">
              <FiAward className="mx-auto text-gray-200 mb-4" size={52} />
              <h3 className="text-base font-semibold text-gray-600 mb-1">No leaders yet</h3>
              <p className="text-gray-400 text-sm mb-5">Start building your leadership team.</p>
              <button onClick={openAdd} className="btn-primary mx-auto"><FiPlus size={14} /> Add First Leader</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leaders.map((l, idx) => (
                <div key={l._id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors group">
                  <div className="col-span-1 text-sm font-medium text-gray-300">{idx + 1}</div>

                  <div className="col-span-1">
                    {l.imageUrl ? (
                      <img src={mediaUrl(l.imageUrl)} alt={l.name} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className={`w-10 h-10 ${l.color} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                        {l.initials}
                      </div>
                    )}
                  </div>

                  <div className="col-span-3">
                    <p className="font-semibold text-slate-800 text-sm">{l.name}</p>
                  </div>

                  <div className="col-span-3">
                    <span className="text-sm text-primary font-medium">{l.role}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">{l.dept}</span>
                  </div>

                  <div className="col-span-1 text-center">
                    <span className="text-sm text-gray-400 font-mono">{l.order}</span>
                  </div>

                  <div className="col-span-1 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(l)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all">
                      <FiEdit2 size={13} />
                    </button>
                    <button onClick={() => { if (window.confirm(`Remove ${l.name}?`)) deleteMutation.mutate(l._id) }} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {leaders.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 bg-slate-50 text-xs text-gray-400">
              {leaders.length} member{leaders.length !== 1 ? 's' : ''} total
            </div>
          )}
        </div>

        {/* Card List for Mobile */}
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6">
              <FiAward className="mx-auto text-gray-200 mb-3" size={40} />
              <h3 className="text-sm font-semibold text-gray-600 mb-1">No leaders yet</h3>
              <p className="text-gray-400 text-xs mb-4">Start building your leadership team.</p>
              <button onClick={openAdd} className="btn-primary mx-auto btn-sm"><FiPlus size={14} /> Add Leader</button>
            </div>
          ) : (
            leaders.map((l, idx) => (
              <div key={l._id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {l.imageUrl ? (
                      <img src={mediaUrl(l.imageUrl)} alt={l.name} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className={`w-12 h-12 ${l.color} rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm`}>
                        {l.initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm">{l.name}</p>
                    <p className="text-xs text-primary font-medium">{l.role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Order</span>
                    <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{l.order}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase">{l.dept}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(l)} className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all">
                      <FiEdit2 size={13} />
                    </button>
                    <button onClick={() => { if (window.confirm(`Remove ${l.name}?`)) deleteMutation.mutate(l._id) }} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-bold text-slate-800 text-lg">{editingId ? 'Edit Leader' : 'Add New Leader'}</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative w-24 h-24 rounded-2xl cursor-pointer group overflow-hidden border-2 border-dashed border-gray-200 hover:border-primary transition-colors"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <FiCamera className="text-white" size={22} />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 group-hover:text-primary transition-colors">
                      <FiUser size={28} />
                      <span className="text-xs font-medium">Photo</span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <p className="text-xs text-gray-400">Click to upload photo · Max 3MB</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Full Name</label>
                  <input required type="text" className="form-input w-full" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. John Doe" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Job Role / Title</label>
                  <input required type="text" className="form-input w-full" value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="e.g. CEO & Founder" />
                </div>
                <div>
                  <label className="form-label">Department</label>
                  <input required type="text" className="form-input w-full" value={formData.dept}
                    onChange={e => setFormData({ ...formData, dept: e.target.value })} placeholder="e.g. Executive" />
                </div>
                <div>
                  <label className="form-label">Initials <span className="text-gray-400 font-normal">(fallback)</span></label>
                  <input type="text" className="form-input w-full uppercase text-center font-bold tracking-widest"
                    value={formData.initials} onChange={e => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
                    maxLength={2} placeholder="JD" />
                </div>
                <div>
                  <label className="form-label">Display Order</label>
                  <input type="number" min="0" className="form-input w-full" value={formData.order}
                    onChange={e => setFormData({ ...formData, order: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="form-label mb-2">Avatar Color <span className="text-gray-400 font-normal">(if no photo)</span></label>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c.value} type="button" onClick={() => setFormData({ ...formData, color: c.value })}
                        style={{ backgroundColor: c.hex }}
                        className={`w-7 h-7 rounded-full transition-all ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={isBusy} className="btn-primary flex-1">
                  <FiSave size={14} /> {editingId ? 'Update Leader' : 'Save Leader'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
