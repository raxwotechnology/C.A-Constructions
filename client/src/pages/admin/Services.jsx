import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'

export default function AdminServices() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', features: '', priceText: '', imageUrl: '', active: true, order: 0 })
  const [imageFile, setImageFile] = useState(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.get('/content/services/admin').then((r) => r.data),
    retry: 1,
  })
  const services = data?.services || []

  const uploadImage = async () => {
    if (!imageFile) return form.imageUrl || ''
    const fd = new FormData()
    fd.append('image', imageFile)
    const { data: up } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return up.imageUrl
  }

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/content/services', payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Service created'); setForm({ title: '', description: '', features: '', priceText: '', imageUrl: '', active: true, order: 0 }); setImageFile(null) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/content/services/${id}`, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Service updated'); setEditing(null) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/content/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Service deleted') },
  })

  const submit = async () => {
    const imageUrl = await uploadImage()
    const payload = { ...form, imageUrl }
    if (editing) updateMut.mutate({ id: editing._id, payload })
    else createMut.mutate(payload)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header"><div><h1 className="page-title">Services & Products</h1><p className="page-subtitle">Manage public-facing services and product offerings.</p></div></div>
      {error ? (
        <div className="card card-body border border-red-200 bg-red-50/60">
          <p className="font-semibold text-red-700">Failed to load services.</p>
          <p className="text-sm text-red-700/80 mt-1">{error.response?.data?.message || error.message}</p>
          <div className="mt-3">
            <button className="btn-danger" onClick={() => refetch()}>Retry</button>
          </div>
        </div>
      ) : null}
      <div className="card card-body space-y-3">
        <h3 className="font-bold text-primary font-heading">{editing ? 'Edit Service' : 'Add Service'}</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="form-input" placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          <input className="form-input" placeholder="Price text (e.g. From LKR 100,000)" value={form.priceText} onChange={(e) => setForm((s) => ({ ...s, priceText: e.target.value }))} />
          <textarea className="form-input md:col-span-2 min-h-24" placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          <input className="form-input md:col-span-2" placeholder="Features comma separated" value={form.features} onChange={(e) => setForm((s) => ({ ...s, features: e.target.value }))} />
          <input type="file" accept="image/*" className="form-input md:col-span-2" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
        <div className="flex gap-3">
          <button className="btn-primary" onClick={submit}><FiPlus size={14} /> {editing ? 'Save Changes' : 'Add Service'}</button>
          {editing ? <button className="btn-ghost" onClick={() => { setEditing(null); setForm({ title: '', description: '', features: '', priceText: '', imageUrl: '', active: true, order: 0 }); setImageFile(null) }}>Cancel</button> : null}
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Service</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">Loading…</td></tr>
            ) : null}
            {services.map((s) => (
              <tr key={s._id}>
                <td><p className="font-semibold text-primary">{s.title}</p><p className="text-xs text-slate-500">{s.description}</p></td>
                <td>{s.priceText || '—'}</td>
                <td><span className={`badge ${s.active ? 'badge-green' : 'badge-gray'}`}>{s.active ? 'Active' : 'Inactive'}</span></td>
                <td className="flex gap-1">
                  <button className="p-1.5 hover:bg-slate-100 rounded-lg" onClick={() => { setEditing(s); setForm({ title: s.title || '', description: s.description || '', features: (s.features || []).join(', '), priceText: s.priceText || '', imageUrl: s.imageUrl || '', active: s.active, order: s.order || 0 }) }}><FiEdit2 size={14} /></button>
                  <button className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" onClick={() => deleteMut.mutate(s._id)}><FiTrash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {!isLoading && services.length === 0 && !error ? <tr><td colSpan={4} className="text-center py-8 text-slate-400">No services yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

