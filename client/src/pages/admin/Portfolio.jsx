import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'

export default function AdminPortfolio() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [form, setForm] = useState({ title: '', category: '', description: '', technologies: '', result: '', imageUrl: '', active: true, order: 0 })

  const { data } = useQuery({
    queryKey: ['admin-portfolio-items'],
    queryFn: () => api.get('/content/portfolio').then((r) => r.data),
  })
  const items = data?.items || []

  const uploadImage = async () => {
    if (!imageFile) return form.imageUrl || ''
    const fd = new FormData()
    fd.append('image', imageFile)
    const { data: up } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return up.imageUrl
  }

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/content/portfolio', payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-portfolio-items'] }); toast.success('Portfolio item created'); setForm({ title: '', category: '', description: '', technologies: '', result: '', imageUrl: '', active: true, order: 0 }); setImageFile(null) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/content/portfolio/${id}`, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-portfolio-items'] }); toast.success('Portfolio item updated'); setEditing(null) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/content/portfolio/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-portfolio-items'] }); toast.success('Portfolio item deleted') },
  })

  const submit = async () => {
    const imageUrl = await uploadImage()
    const payload = { ...form, imageUrl }
    if (editing) updateMut.mutate({ id: editing._id, payload })
    else createMut.mutate(payload)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header"><div><h1 className="page-title">Portfolio Management</h1><p className="page-subtitle">Add, edit and delete public portfolio items.</p></div></div>
      <div className="card card-body space-y-3">
        <h3 className="font-bold text-primary font-heading">{editing ? 'Edit Portfolio Item' : 'Add Portfolio Item'}</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="form-input" placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
          <input className="form-input" placeholder="Category" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} />
          <textarea className="form-input md:col-span-2 min-h-24" placeholder="Description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          <input className="form-input" placeholder="Technologies comma separated" value={form.technologies} onChange={(e) => setForm((s) => ({ ...s, technologies: e.target.value }))} />
          <input className="form-input" placeholder="Result text" value={form.result} onChange={(e) => setForm((s) => ({ ...s, result: e.target.value }))} />
          <input type="file" accept="image/*" className="form-input md:col-span-2" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
        <div className="flex gap-3">
          <button className="btn-primary" onClick={submit}><FiPlus size={14} /> {editing ? 'Save Changes' : 'Add Item'}</button>
          {editing ? <button className="btn-ghost" onClick={() => { setEditing(null); setForm({ title: '', category: '', description: '', technologies: '', result: '', imageUrl: '', active: true, order: 0 }); setImageFile(null) }}>Cancel</button> : null}
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Item</th><th>Category</th><th>Result</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p._id}>
                <td><p className="font-semibold text-primary">{p.title}</p><p className="text-xs text-slate-500">{p.description}</p></td>
                <td>{p.category}</td>
                <td>{p.result || '—'}</td>
                <td><span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>{p.active ? 'Active' : 'Inactive'}</span></td>
                <td className="flex gap-1">
                  <button className="p-1.5 hover:bg-slate-100 rounded-lg" onClick={() => { setEditing(p); setForm({ title: p.title || '', category: p.category || '', description: p.description || '', technologies: (p.technologies || []).join(', '), result: p.result || '', imageUrl: p.imageUrl || '', active: p.active, order: p.order || 0 }) }}><FiEdit2 size={14} /></button>
                  <button className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" onClick={() => deleteMut.mutate(p._id)}><FiTrash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">No portfolio items yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

