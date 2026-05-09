import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiFileText, FiCheck, FiArrowRight, FiTrash2, FiEdit2, FiSearch, FiCalendar } from 'react-icons/fi'

const STATUS_COLOR = {
  draft:'badge-gray', sent:'badge-blue', accepted:'badge-green', confirmed:'badge-green',
  rejected:'badge-red', expired:'badge-yellow', converted:'badge-purple'
}

const STATUS_LIFECYCLE = ['draft','sent','accepted','rejected','expired']
const SERVICE_TYPES = ['ERP', 'POS', 'Hosting', 'Website', 'Maintenance', 'Custom', 'Other']

export default function AdminQuotations() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { register, handleSubmit, reset, setValue, watch, control } = useForm({
    defaultValues: { items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchItems = watch('items') || []
  const subtotal = watchItems.reduce((s, item) => {
    const qty = Number(item.quantity || 1)
    const price = Number(item.unitPrice || 0)
    const disc = Number(item.discount || 0)
    return s + (qty * price * (1 - disc / 100))
  }, 0)
  const taxRate = Number(watch('taxRate') || 0)
  const tax = subtotal * taxRate / 100
  const total = subtotal + tax

  const buildQuery = () => {
    const p = new URLSearchParams()
    if (statusFilter) p.set('status', statusFilter)
    if (startDate) p.set('startDate', startDate)
    if (endDate) p.set('endDate', endDate)
    return p.toString()
  }

  const { data: quotData, isLoading } = useQuery({
    queryKey: ['quotations', statusFilter, startDate, endDate],
    queryFn: () => api.get(`/quotations?${buildQuery()}`).then(r => r.data),
  })
  const { data: clientData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients').then(r => r.data),
    enabled: showModal,
  })

  const createMut = useMutation({
    mutationFn: d => api.post('/quotations', d),
    onSuccess: () => { qc.invalidateQueries(['quotations']); toast.success('Quotation created'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/quotations/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['quotations']); toast.success('Updated'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.put(`/quotations/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries(['quotations']); toast.success('Status updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const convertMut = useMutation({
    mutationFn: id => api.post(`/quotations/${id}/convert-to-invoice`),
    onSuccess: (data) => { qc.invalidateQueries(['quotations']); qc.invalidateQueries(['admin-invoices']); toast.success(`Invoice ${data.data?.invoice?.invoiceNo || ''} created!`) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/quotations/${id}`),
    onSuccess: () => { qc.invalidateQueries(['quotations']); toast.success('Deleted') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const clients = (clientData?.clients || clientData?.users || []).filter(u => !u.role || u.role === 'client')
  const quotations = (quotData?.quotations || []).filter(q =>
    !search || q.title?.toLowerCase().includes(search.toLowerCase()) ||
    q.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    q.quotationNo?.toLowerCase().includes(search.toLowerCase())
  )

  const closeModal = () => { setShowModal(false); setEditing(null); reset({ items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }] }) }
  const openCreate = () => { reset({ quotationDate: new Date().toISOString().split('T')[0], items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }] }); setEditing(null); setShowModal(true) }
  const openEdit = (q) => {
    reset({
      client: q.client?._id || q.client,
      title: q.title || '',
      serviceType: q.serviceType || 'Other',
      quotationDate: q.quotationDate ? new Date(q.quotationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      validUntil: q.validUntil ? new Date(q.validUntil).toISOString().split('T')[0] : '',
      taxRate: q.taxRate || 0,
      notes: q.notes || '',
      terms: q.terms || '',
      items: (q.items && q.items.length > 0) ? q.items.map(i => ({ description: i.description || '', quantity: i.quantity || 1, unitPrice: i.unitPrice || 0, discount: i.discount || 0, total: i.total || 0 })) : [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }],
    })
    setEditing(q)
    setShowModal(true)
  }

  const onSubmit = d => {
    const items = (d.items || []).map(item => ({
      ...item,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      discount: Number(item.discount || 0),
      total: Number(item.quantity || 1) * Number(item.unitPrice || 0) * (1 - Number(item.discount || 0) / 100),
    }))
    const sub = items.reduce((s, i) => s + i.total, 0)
    const tRate = Number(d.taxRate || 0)
    const taxAmt = sub * tRate / 100
    const payload = { ...d, items, subtotal: sub, tax: taxAmt, taxRate: tRate, total: sub + taxAmt }
    editing ? updateMut.mutate({ id: editing._id, data: payload }) : createMut.mutate(payload)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">{quotData?.count || 0} quotations total</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={15}/> New Quotation</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
          <input placeholder="Search quotations..." className="form-input pl-9 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="form-select py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['draft','sent','confirmed','rejected','expired','converted'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <input type="date" className="form-input py-2 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/>
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" className="form-input py-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Quotation No.</th><th>Client</th><th>Title</th>
              <th>Total</th><th>Valid Until</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : quotations.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                <FiFileText size={32} className="mx-auto mb-2 opacity-30"/>No quotations found
              </td></tr>
            ) : quotations.map(q => (
              <tr key={q._id}>
                <td><span className="badge badge-navy font-mono">{q.quotationNo}</span></td>
                <td>
                  <div className="font-medium text-gray-800">{q.client?.name || '—'}</div>
                  <div className="text-xs text-gray-400">{q.client?.email}</div>
                </td>
                <td className="font-medium text-gray-800 max-w-[180px] truncate">{q.title || '—'}</td>
                <td className="font-bold text-gray-800">LKR {(q.total || 0).toLocaleString()}</td>
                <td className="text-gray-500 text-xs">{q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-LK') : '—'}</td>
                <td><span className={`badge capitalize ${STATUS_COLOR[q.status] || 'badge-gray'}`}>{q.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {q.status === 'draft' && (
                      <button onClick={() => statusMut.mutate({ id: q._id, status: 'sent' })} title="Mark Sent" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold">Sent</button>
                    )}
                    {q.status === 'sent' && (
                      <>
                        <button onClick={() => statusMut.mutate({ id: q._id, status: 'accepted' })} title="Mark Accepted" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><FiCheck size={13}/></button>
                        <button onClick={() => statusMut.mutate({ id: q._id, status: 'rejected' })} title="Mark Rejected" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FiX size={13}/></button>
                      </>
                    )}
                    {(q.status === 'accepted' || q.status === 'confirmed') && (
                      <button onClick={() => { if(window.confirm('Convert to invoice?')) convertMut.mutate(q._id) }} title="Convert to Invoice" className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><FiArrowRight size={13}/></button>
                    )}
                    {['draft','sent'].includes(q.status) && (
                      <button onClick={() => openEdit(q)} title="Edit" className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={13}/></button>
                    )}
                    <button onClick={() => { if(window.confirm('Delete?')) deleteMut.mutate(q._id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-primary font-heading">{editing ? 'Edit Quotation' : 'New Quotation'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Client *</label>
                  <select {...register('client', { required: true })} className={`form-select ${watch('client') === '' ? 'border-red-400' : ''}`}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select></div>
                <div><label className="form-label">Service Type</label>
                  <select {...register('serviceType')} className="form-select">
                    {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
              <div><label className="form-label">Subject / Title</label>
                <input {...register('title')} className="form-input" placeholder="e.g. ERP System Development Proposal (optional)"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>
                  <input {...register('quotationDate')} type="date" className="form-input"/></div>
                <div><label className="form-label">Valid Until</label>
                  <input {...register('validUntil')} type="date" className="form-input"/></div>
                <div><label className="form-label">Tax Rate (%)</label>
                  <input {...register('taxRate', { valueAsNumber: true })} type="number" step="0.1" className="form-input" placeholder="0"/></div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="form-label mb-0">Line Items</label>
                  <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 })}
                    className="btn-outline btn-sm"><FiPlus size={12}/> Add Item</button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        <input {...register(`items.${idx}.description`, { required: true })} className="form-input text-sm py-2" placeholder="Description *"/>
                      </div>
                      <div className="col-span-2">
                        <input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min="1" className="form-input text-sm py-2" placeholder="Qty"/>
                      </div>
                      <div className="col-span-3">
                        <input {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} type="number" className="form-input text-sm py-2" placeholder="Unit Price"/>
                      </div>
                      <div className="col-span-2">
                        <input {...register(`items.${idx}.discount`, { valueAsNumber: true })} type="number" min="0" max="100" className="form-input text-sm py-2" placeholder="Disc%"/>
                      </div>
                      <div className="col-span-1 pt-2">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 p-1">
                            <FiX size={14}/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>LKR {subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Tax ({taxRate}%)</span><span>LKR {tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between font-bold text-primary pt-1 border-t border-gray-200"><span>Total</span><span>LKR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                </div>
              </div>

              <div><label className="form-label">Notes</label>
                <textarea {...register('notes')} rows={2} className="form-input resize-none" placeholder="Additional notes for client"/></div>
              <div><label className="form-label">Terms & Conditions</label>
                <textarea {...register('terms')} rows={2} className="form-input resize-none" placeholder="Payment terms, delivery terms..."/></div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                  {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : editing ? 'Save Changes' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}
