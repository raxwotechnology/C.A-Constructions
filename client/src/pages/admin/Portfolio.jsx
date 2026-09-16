import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiImage, FiToggleLeft, FiToggleRight, FiEye, FiEyeOff, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import { mediaUrl } from '../../lib/media'

const EMPTY = { title: '', category: '', description: '', technologies: '', result: '', imageUrl: '', active: true, order: 0, colorFrom: '#3b82f6', colorTo: '#1d4ed8', caseStudyUrl: '' }

const CATEGORY_PRESETS = ['Enterprise', 'E-Commerce', 'Healthcare', 'Logistics', 'Education', 'Finance', 'Mobile', 'Other']

export default function AdminPortfolio() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)

  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-portfolio-items'],
    queryFn: () => api.get('/content/portfolio/admin').then(r => r.data),
    retry: 1,
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
    mutationFn: payload => api.post('/content/portfolio', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-portfolio-items'] })
      toast.success('Portfolio item created')
      setForm(EMPTY); setImageFile(null); setImagePreview(null); setShowForm(false)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/content/portfolio/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-portfolio-items'] })
      toast.success('Portfolio item updated')
      setEditing(null); setShowForm(false); setImageFile(null); setImagePreview(null)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/content/portfolio/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-portfolio-items'] }); toast.success('Portfolio item deleted') },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => api.put(`/content/portfolio/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-portfolio-items'] }),
  })

  const submit = async () => {
    const imageUrl = await uploadImage()
    const payload = {
      ...form,
      imageUrl,
      technologies: typeof form.technologies === 'string'
        ? form.technologies.split(',').map(t => t.trim()).filter(Boolean)
        : form.technologies,
    }
    if (editing) updateMut.mutate({ id: editing._id, payload })
    else createMut.mutate(payload)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      title: item.title || '',
      category: item.category || '',
      description: item.description || '',
      technologies: (item.technologies || []).join(', '),
      result: item.result || '',
      imageUrl: item.imageUrl || '',
      active: item.active !== false,
      order: item.order || 0,
      colorFrom: item.colorFrom || '#3b82f6',
      colorTo: item.colorTo || '#1d4ed8',
      caseStudyUrl: item.caseStudyUrl || '',
    })
    setImagePreview(item.imageUrl ? mediaUrl(item.imageUrl) : null)
    setImageFile(null)
    setShowForm(true)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY)
    setImageFile(null)
    setImagePreview(null)
    setShowForm(true)
  }

  const handleImageChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Portfolio Management</h1>
          <p className="page-subtitle">Add, edit and manage public-facing portfolio case studies.</p>
        </div>
        <button onClick={openAdd} className="btn-primary gap-2"><FiPlus size={14} /> Add Portfolio Item</button>
      </div>

      {error && (
        <div className="card card-body border border-red-200 bg-red-50/60">
          <p className="font-semibold text-red-700">Failed to load portfolio items.</p>
          <button className="btn-ghost btn-sm mt-2" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="card border border-secondary/30">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-primary font-heading">{editing ? 'Edit Portfolio Item' : 'Add Portfolio Item'}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null) }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="Project title" value={form.title} onChange={e => f('title', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Category *</label>
                  <div className="flex gap-2">
                    <select className="form-select flex-1" value={form.category} onChange={e => f('category', e.target.value)}>
                      <option value="">Select…</option>
                      {CATEGORY_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="form-input flex-1" placeholder="Custom" value={form.category} onChange={e => f('category', e.target.value)} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Description *</label>
                  <textarea className="form-input min-h-24 resize-none" placeholder="Project description and impact..." value={form.description} onChange={e => f('description', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Technologies (comma separated)</label>
                  <input className="form-input" placeholder="React, Node.js, MongoDB" value={form.technologies} onChange={e => f('technologies', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Result / Achievement</label>
                  <input className="form-input" placeholder="e.g. 40% efficiency gain" value={form.result} onChange={e => f('result', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Case Study URL (optional)</label>
                  <input className="form-input" placeholder="https://..." value={form.caseStudyUrl} onChange={e => f('caseStudyUrl', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Display Order</label>
                  <input type="number" className="form-input" value={form.order} onChange={e => f('order', Number(e.target.value))} />
                </div>
              </div>

              {/* Gradient color pickers */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border">
                <div>
                  <label className="form-label text-xs">Gradient From</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.colorFrom} onChange={e => f('colorFrom', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border" />
                    <input className="form-input w-28 font-mono text-xs" value={form.colorFrom} onChange={e => f('colorFrom', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label text-xs">Gradient To</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.colorTo} onChange={e => f('colorTo', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border" />
                    <input className="form-input w-28 font-mono text-xs" value={form.colorTo} onChange={e => f('colorTo', e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 h-12 rounded-xl" style={{ background: `linear-gradient(135deg, ${form.colorFrom}, ${form.colorTo})` }} />
              </div>

              {/* Image upload */}
              <div>
                <label className="form-label flex items-center gap-1.5"><FiImage size={12} /> Cover Image</label>
                <div className="flex items-start gap-4">
                  {imagePreview && (
                    <div className="relative shrink-0">
                      <img src={imagePreview} alt="preview" className="w-24 h-20 object-cover rounded-xl border border-slate-200" />
                      <button onClick={() => { setImageFile(null); setImagePreview(null); f('imageUrl', '') }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <FiX size={10} />
                      </button>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="form-input text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    onChange={handleImageChange} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Active</label>
                <button onClick={() => f('active', !form.active)} className={`transition-colors ${form.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {form.active ? <FiToggleRight size={28} /> : <FiToggleLeft size={28} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t bg-slate-50">
              <button onClick={() => { setShowForm(false); setEditing(null) }} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={submit} disabled={isPending || !form.title}
                className="btn-primary flex-1 justify-center gap-2">
                {isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : `${editing ? 'Save Changes' : 'Add Item'}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" /></div>
      ) : items.length === 0 && !error ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <FiImage size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No portfolio items yet</p>
          <button onClick={openAdd} className="btn-primary btn-sm mt-4 gap-1"><FiPlus size={13} /> Add First Item</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p, i) => (
            <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`card overflow-hidden group transition-all ${!p.active ? 'opacity-60' : ''}`}>
              {/* Gradient header */}
              <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${p.colorFrom || '#3b82f6'}, ${p.colorTo || '#1d4ed8'})` }}>
                {p.imageUrl && <img src={mediaUrl(p.imageUrl)} alt={p.title} className="absolute inset-0 w-full h-full object-cover opacity-40" />}
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.active ? 'bg-emerald-500 text-white' : 'bg-white/80 text-slate-600'}`}>
                    {p.active ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-primary text-sm truncate">{p.title}</h3>
                  <span className="badge badge-blue text-xs shrink-0">{p.category}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description}</p>

                {p.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.technologies.slice(0, 3).map(t => <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">{t}</span>)}
                    {p.technologies.length > 3 && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">+{p.technologies.length - 3}</span>}
                  </div>
                )}

                {p.result && <p className="text-xs text-emerald-600 font-semibold mb-3">✓ {p.result}</p>}

                <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
                  <button onClick={() => toggleActive.mutate({ id: p._id, active: !p.active })}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title={p.active ? 'Hide' : 'Show'}>
                    {p.active ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                  </button>
                  <button onClick={() => openEdit(p)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                    <FiEdit2 size={14} />
                  </button>
                  <button onClick={() => { if (window.confirm('Delete this portfolio item?')) deleteMut.mutate(p._id) }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
