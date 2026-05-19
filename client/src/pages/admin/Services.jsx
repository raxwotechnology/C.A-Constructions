import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiPackage, FiChevronDown, FiArchive, FiCheck, FiDollarSign, FiLayers } from 'react-icons/fi'

const EMPTY_SERVICE = { title: '', description: '', features: '', priceText: '', imageUrl: '', active: true, order: 0, type: 'service', category: '' }
const EMPTY_PKG = { name: '', price: '', currency: 'LKR', billingCycle: 'one-time', features: '', duration: '', discount: '', promotionLabel: '', isPopular: false }
const BILLING = ['one-time', 'monthly', 'quarterly', 'yearly']

export default function AdminServices() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('service')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_SERVICE)
  const [imageFile, setImageFile] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [expandedService, setExpandedService] = useState(null)
  const [showPkgModal, setShowPkgModal] = useState(null) // serviceId
  const [editingPkg, setEditingPkg] = useState(null)
  const [pkgForm, setPkgForm] = useState(EMPTY_PKG)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api.get('/content/services/admin').then(r => r.data),
  })
  const services = (data?.services || []).filter(s => s.type === tab || (!s.type && tab === 'service'))

  const uploadImage = async () => {
    if (!imageFile) return form.imageUrl || ''
    const fd = new FormData(); fd.append('image', imageFile)
    const { data: up } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return up.imageUrl
  }

  const createMut = useMutation({
    mutationFn: async (payload) => api.post('/content/services', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Created'); setShowModal(false); setForm(EMPTY_SERVICE); setImageFile(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/content/services/${id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Updated'); setShowModal(false); setEditing(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/content/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Deleted') },
  })
  const archiveMut = useMutation({
    mutationFn: (id) => api.put(`/content/services/${id}/archive`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Archived') },
  })
  const addPkgMut = useMutation({
    mutationFn: ({ id, pkg }) => api.post(`/content/services/${id}/packages`, pkg).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Package added'); setShowPkgModal(null); setPkgForm(EMPTY_PKG) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updatePkgMut = useMutation({
    mutationFn: ({ serviceId, pkgId, pkg }) => api.put(`/content/services/${serviceId}/packages/${pkgId}`, pkg).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Package updated'); setEditingPkg(null); setPkgForm(EMPTY_PKG) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deletePkgMut = useMutation({
    mutationFn: ({ serviceId, pkgId }) => api.delete(`/content/services/${serviceId}/packages/${pkgId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Package deleted') },
  })

  const submit = async () => {
    const imageUrl = await uploadImage()
    const payload = { ...form, imageUrl, type: tab }
    if (editing) updateMut.mutate({ id: editing._id, payload })
    else createMut.mutate(payload)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({ title: s.title, description: s.description, features: (s.features || []).join(', '), priceText: s.priceText, imageUrl: s.imageUrl, active: s.active, order: s.order || 0, type: s.type || 'service', category: s.category || '' })
    setImageFile(null)
    setShowModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Services & Products</h1>
          <p className="page-subtitle">Manage public-facing services, products, and pricing packages.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ ...EMPTY_SERVICE, type: tab }); setShowModal(true) }} className="btn-primary gap-2">
          <FiPlus size={14} /> Add {tab === 'service' ? 'Service' : 'Product'}
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[{ val: 'service', label: '🛠 Services' }, { val: 'product', label: '📦 Products' }].map(t => (
          <button key={t.val} onClick={() => setTab(t.val)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === t.val ? 'bg-white shadow text-secondary' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card card-body border border-red-200 bg-red-50">
          <p className="text-red-700 font-semibold">Failed to load. <button onClick={() => refetch()} className="underline ml-1">Retry</button></p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" /></div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FiLayers size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No {tab}s yet. Add your first one.</p>
          <button onClick={() => { setEditing(null); setForm({ ...EMPTY_SERVICE, type: tab }); setShowModal(true) }} className="btn-primary mt-4">Add {tab === 'service' ? 'Service' : 'Product'}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map(s => (
            <motion.div key={s._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="card border border-slate-200 overflow-hidden">
              {/* Service Header */}
              <div className="p-4 flex items-start gap-4">
                {s.imageUrl && (
                  <img src={s.imageUrl} alt={s.title} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-primary">{s.title}</h3>
                    <span className={`badge ${s.active ? 'badge-green' : 'badge-gray'} text-[10px]`}>{s.active ? 'Active' : 'Inactive'}</span>
                    {s.packages?.length > 0 && <span className="badge badge-blue text-[10px]">{s.packages.length} packages</span>}
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{s.description}</p>
                  {s.priceText && <p className="text-xs font-semibold text-secondary mt-1">{s.priceText}</p>}
                  {s.features?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.features.slice(0, 4).map((f, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                      {s.features.length > 4 && <span className="text-[10px] text-slate-400">+{s.features.length - 4} more</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><FiEdit2 size={14} /></button>
                  <button onClick={() => { setShowPkgModal(s._id); setPkgForm(EMPTY_PKG); setEditingPkg(null) }} className="p-2 hover:bg-blue-50 rounded-xl text-blue-500" title="Manage Packages"><FiPackage size={14} /></button>
                  <button onClick={() => archiveMut.mutate(s._id)} className="p-2 hover:bg-amber-50 rounded-xl text-amber-500"><FiArchive size={14} /></button>
                  <button onClick={() => deleteMut.mutate(s._id)} className="p-2 hover:bg-red-50 rounded-xl text-red-500"><FiTrash2 size={14} /></button>
                  <button onClick={() => setExpandedService(expandedService === s._id ? null : s._id)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                    <FiChevronDown size={14} className={`transition-transform ${expandedService === s._id ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Packages Panel */}
              <AnimatePresence>
                {expandedService === s._id && s.packages?.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-slate-100">
                    <div className="p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-3">Pricing Packages</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {s.packages.map(pkg => (
                          <div key={pkg._id} className={`bg-white rounded-xl border p-3 ${pkg.isPopular ? 'border-secondary shadow-sm' : 'border-slate-200'}`}>
                            {pkg.isPopular && <span className="text-[10px] bg-secondary text-white px-2 py-0.5 rounded-full font-bold mb-2 inline-block">{pkg.promotionLabel || 'POPULAR'}</span>}
                            <p className="font-bold text-primary">{pkg.name}</p>
                            <p className="text-xl font-black text-secondary">{pkg.currency} {Number(pkg.price).toLocaleString()}</p>
                            <p className="text-xs text-slate-400 capitalize">{pkg.billingCycle}{pkg.duration ? ` · ${pkg.duration}` : ''}</p>
                            {pkg.discount > 0 && <p className="text-xs text-emerald-600 font-semibold mt-1">{pkg.discount}% discount</p>}
                            <ul className="mt-2 space-y-1">
                              {(pkg.features || []).slice(0, 3).map((f, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600"><FiCheck size={10} className="text-emerald-500" />{f}</li>
                              ))}
                              {pkg.features?.length > 3 && <li className="text-xs text-slate-400">+{pkg.features.length - 3} more</li>}
                            </ul>
                            <div className="flex gap-1 mt-3 pt-2 border-t border-slate-100">
                              <button onClick={() => { setEditingPkg(pkg); setPkgForm({ ...pkg, features: (pkg.features || []).join('\n') }); setShowPkgModal(s._id) }}
                                className="btn-ghost btn-sm text-xs"><FiEdit2 size={11} /> Edit</button>
                              <button onClick={() => deletePkgMut.mutate({ serviceId: s._id, pkgId: pkg._id })}
                                className="btn-ghost btn-sm text-xs text-red-500"><FiTrash2 size={11} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Service Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h2 className="font-bold text-primary text-lg">{editing ? 'Edit' : 'Add'} {tab === 'service' ? 'Service' : 'Product'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-xl"><FiX /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Title</label>
                    <input className="form-input" placeholder="Service name" value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Category</label>
                    <input className="form-input" placeholder="e.g. Web, Mobile..." value={form.category} onChange={e => setForm(s => ({ ...s, category: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows="3" value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Features (comma-separated)</label>
                  <input className="form-input" placeholder="Feature 1, Feature 2..." value={form.features} onChange={e => setForm(s => ({ ...s, features: e.target.value }))} />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Price Text</label>
                    <input className="form-input" placeholder="From LKR 100,000" value={form.priceText} onChange={e => setForm(s => ({ ...s, priceText: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Order</label>
                    <input type="number" className="form-input" value={form.order} onChange={e => setForm(s => ({ ...s, order: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Image</label>
                  <input type="file" accept="image/*" className="form-input" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                  {form.imageUrl && !imageFile && <img src={form.imageUrl} className="mt-2 w-24 h-24 object-cover rounded-xl border border-slate-200" alt="" />}
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="active-chk" className="w-4 h-4" checked={form.active} onChange={e => setForm(s => ({ ...s, active: e.target.checked }))} />
                  <label htmlFor="active-chk" className="text-sm font-medium text-slate-700">Active (visible on website)</label>
                </div>
              </div>
              <div className="p-5 border-t bg-slate-50 rounded-b-2xl flex gap-3">
                <button onClick={submit} disabled={!form.title || createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                  {createMut.isPending || updateMut.isPending ? <span className="spinner" /> : editing ? 'Save Changes' : 'Create'}
                </button>
                <button onClick={() => setShowModal(false)} className="btn-ghost px-4">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Package Modal */}
      <AnimatePresence>
        {showPkgModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h2 className="font-bold text-primary text-lg">{editingPkg ? 'Edit Package' : 'Add Package'}</h2>
                <button onClick={() => { setShowPkgModal(null); setEditingPkg(null); setPkgForm(EMPTY_PKG) }} className="p-2 hover:bg-slate-200 rounded-xl"><FiX /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Package Name</label>
                    <input className="form-input" placeholder="e.g. Basic, Pro, Enterprise" value={pkgForm.name} onChange={e => setPkgForm(s => ({ ...s, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Billing Cycle</label>
                    <select className="form-select" value={pkgForm.billingCycle} onChange={e => setPkgForm(s => ({ ...s, billingCycle: e.target.value }))}>
                      {BILLING.map(b => <option key={b} value={b} className="capitalize">{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Price (LKR)</label>
                    <input type="number" className="form-input" placeholder="0" value={pkgForm.price} onChange={e => setPkgForm(s => ({ ...s, price: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Discount %</label>
                    <input type="number" className="form-input" placeholder="0" value={pkgForm.discount} onChange={e => setPkgForm(s => ({ ...s, discount: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Duration</label>
                    <input className="form-input" placeholder="e.g. 3 months" value={pkgForm.duration} onChange={e => setPkgForm(s => ({ ...s, duration: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Promotion Label</label>
                    <input className="form-input" placeholder="e.g. BEST VALUE" value={pkgForm.promotionLabel} onChange={e => setPkgForm(s => ({ ...s, promotionLabel: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Features (one per line)</label>
                  <textarea className="form-input" rows="4" placeholder="Feature 1&#10;Feature 2&#10;Feature 3" value={pkgForm.features} onChange={e => setPkgForm(s => ({ ...s, features: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="popular-chk" className="w-4 h-4" checked={pkgForm.isPopular} onChange={e => setPkgForm(s => ({ ...s, isPopular: e.target.checked }))} />
                  <label htmlFor="popular-chk" className="text-sm font-medium text-slate-700">Mark as Popular / Recommended</label>
                </div>
              </div>
              <div className="p-5 border-t bg-slate-50 rounded-b-2xl">
                <button
                  onClick={() => {
                    const payload = { ...pkgForm, features: typeof pkgForm.features === 'string' ? pkgForm.features.split('\n').filter(Boolean) : pkgForm.features }
                    if (editingPkg) updatePkgMut.mutate({ serviceId: showPkgModal, pkgId: editingPkg._id, pkg: payload })
                    else addPkgMut.mutate({ id: showPkgModal, pkg: payload })
                  }}
                  disabled={!pkgForm.name || addPkgMut.isPending || updatePkgMut.isPending}
                  className="btn-primary w-full justify-center">
                  {addPkgMut.isPending || updatePkgMut.isPending ? <span className="spinner" /> : editingPkg ? 'Save Package' : 'Add Package'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
