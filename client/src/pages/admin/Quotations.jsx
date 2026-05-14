import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiFileText, FiCheck, FiArrowRight, FiTrash2, FiEdit2, FiSearch, FiCalendar, FiPrinter } from 'react-icons/fi'
import { INVOICE_CURRENCIES } from '../../lib/currencies'

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
  const [viewing, setViewing] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { register, handleSubmit, reset, setValue, watch, control } = useForm({
    defaultValues: { items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }], currency: 'LKR' }
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
  const watchedClientQ = watch('client')
  const { data: branchQuotData } = useQuery({
    queryKey: ['branches-for-quotation-modal'],
    queryFn: () => api.get('/branches').then((r) => r.data),
    enabled: showModal,
  })
  const { data: projQuotData } = useQuery({
    queryKey: ['projects-for-quotation-modal'],
    queryFn: () => api.get('/projects').then((r) => r.data),
    enabled: showModal,
  })
  const branchesQuot = branchQuotData?.branches || []
  const projectsQuot = (projQuotData?.projects || []).filter(
    (p) => !watchedClientQ || String(p.client?._id || p.client) === String(watchedClientQ)
  )

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
    onSuccess: (res) => { qc.invalidateQueries(['quotations']); qc.invalidateQueries(['admin-invoices']); toast.success(`Invoice ${res?.data?.invoice?.invoiceNo || ''} created!`) },
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

  const closeModal = () => { setShowModal(false); setEditing(null); reset({ items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }], currency: 'LKR', branch: '', project: '' }) }
  const openCreate = () => { reset({ quotationDate: new Date().toISOString().split('T')[0], items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }], currency: 'LKR', branch: '', project: '' }); setEditing(null); setShowModal(true) }
  const openEdit = (q) => {
    reset({
      client: q.client?._id || q.client,
      title: q.title || '',
      serviceType: q.serviceType || 'Other',
      branch: q.branch?._id || q.branch || '',
      project: q.project?._id || q.project || '',
      currency: q.currency || 'LKR',
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
    if (!payload.branch) delete payload.branch
    if (!payload.project) delete payload.project
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
                <td><span className="badge badge-navy font-mono text-xs tracking-tight">{q.quotationNo}</span></td>
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
                    <button onClick={() => setViewing(q)} title="View Quotation" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FiFileText size={13}/></button>
                    {q.status === 'draft' && (
                      <button onClick={() => statusMut.mutate({ id: q._id, status: 'sent' })} title="Mark Sent" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold">Sent</button>
                    )}
                    {q.status === 'sent' && (
                      <>
                        <button onClick={() => statusMut.mutate({ id: q._id, status: 'accepted' })} title="Mark Accepted" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><FiCheck size={13}/></button>
                        <button onClick={() => statusMut.mutate({ id: q._id, status: 'rejected' })} title="Mark Rejected" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FiX size={13}/></button>
                      </>
                    )}
                    {!['converted', 'rejected', 'expired'].includes(q.status) && (
                      <button onClick={() => { if(window.confirm('Convert this quotation to an invoice?')) convertMut.mutate(q._id) }} title="Convert to Invoice" className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><FiArrowRight size={13}/></button>
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
                <div><label className="form-label">Branch</label>
                  <select {...register('branch')} className="form-select">
                    <option value="">— None —</option>
                    {branchesQuot.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select></div>
                <div><label className="form-label">Linked project</label>
                  <select
                    {...register('project')}
                    onChange={(e) => {
                      register('project').onChange(e)
                      const pid = e.target.value
                      if (!pid) return
                      const pr = projectsQuot.find((p) => String(p._id) === String(pid))
                      if (pr?.deadline) {
                        setValue('validUntil', new Date(pr.deadline).toISOString().split('T')[0], { shouldDirty: false })
                      }
                    }}
                    className="form-select"
                  >
                    <option value="">— None —</option>
                    {projectsQuot.map((p) => (
                      <option key={p._id} value={p._id}>{p.title}</option>
                    ))}
                  </select></div>
                <div><label className="form-label">Currency</label>
                  <select {...register('currency')} className="form-select">
                    {INVOICE_CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Quotation Date</label>
                  <input {...register('quotationDate')} type="date" className="form-input"/></div>
                <div><label className="form-label">Valid Until</label>
                  <input {...register('validUntil')} type="date" className="form-input"/></div>
                <div><label className="form-label">Tax Rate (%)</label>
                  <input {...register('taxRate', { valueAsNumber: true })} type="number" step="0.1" className="form-input" placeholder="0"/></div>
              </div>

              {/* Line items — each row is one billable line with clear field names */}
              <div>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <div>
                    <label className="form-label mb-0">Line items</label>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl leading-snug">
                      Add one row per product or service: <strong>description</strong> (what you are charging for), <strong>quantity</strong>, <strong>unit price</strong> per unit in LKR, and optional <strong>discount %</strong> off that line. Line total updates from those values.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 })}
                    className="btn-outline btn-sm shrink-0"
                  >
                    <FiPlus size={12} /> Add line
                  </button>
                </div>

                {/* Column guide (desktop) */}
                <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100/80 rounded-t-lg border border-b-0 border-slate-200">
                  <div className="md:col-span-4">Item / service description</div>
                  <div className="md:col-span-2 text-center">Qty</div>
                  <div className="md:col-span-2 text-right">Unit price (LKR)</div>
                  <div className="md:col-span-2 text-right">Discount %</div>
                  <div className="md:col-span-2 text-right">Line total (LKR)</div>
                </div>

                <div className={`space-y-3 ${fields.length ? 'md:border md:border-t-0 md:border-slate-200 md:rounded-b-lg md:rounded-t-none md:p-3 md:bg-slate-50/30' : ''}`}>
                  {fields.map((field, idx) => {
                    const row = watchItems[idx] || {}
                    const qty = Number(row.quantity || 1)
                    const price = Number(row.unitPrice || 0)
                    const disc = Number(row.discount || 0)
                    const lineTotal = qty * price * (1 - disc / 100)
                    return (
                      <div
                        key={field.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 md:border-0 md:bg-transparent md:p-0 space-y-3 md:space-y-0"
                      >
                        <div className="flex items-center justify-between md:hidden">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Line {idx + 1}</span>
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(idx)} className="text-red-500 hover:text-red-700 p-1" title="Remove line">
                              <FiTrash2 size={15} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-2 md:items-end">
                          <div className="md:col-span-4">
                            <label className="form-label text-xs mb-1 md:sr-only">Item / service description *</label>
                            <input
                              {...register(`items.${idx}.description`, { required: true })}
                              className="form-input text-sm py-2"
                              placeholder="e.g. ERP module — Phase 1 implementation"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="form-label text-xs mb-1 md:sr-only">Quantity</label>
                            <input
                              {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                              type="number"
                              min="1"
                              step="1"
                              className="form-input text-sm py-2"
                              placeholder="Qty"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="form-label text-xs mb-1 md:sr-only">Unit price (LKR)</label>
                            <input
                              {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-input text-sm py-2"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="form-label text-xs mb-1 md:sr-only">Discount %</label>
                            <input
                              {...register(`items.${idx}.discount`, { valueAsNumber: true })}
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              className="form-input text-sm py-2"
                              placeholder="0"
                            />
                          </div>
                          <div className="md:col-span-2 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1 md:text-right">
                              <p className="text-[10px] font-semibold uppercase text-slate-400 md:hidden">Line total</p>
                              <p className="text-sm font-bold text-primary tabular-nums md:py-2">
                                LKR {lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(idx)}
                                className="hidden md:inline-flex text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"
                                title="Remove line"
                              >
                                <FiX size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
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

      {/* View/Print Modal */}
      {viewing && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 md:p-6 border-b bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">Quotation {viewing.quotationNo}</h3>
                <span className={`badge capitalize ${STATUS_COLOR[viewing.status] || 'badge-gray'}`}>{viewing.status}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  const printContent = document.getElementById('quotation-print-area').innerHTML;
                  const originalContent = document.body.innerHTML;
                  document.body.innerHTML = printContent;
                  window.print();
                  document.body.innerHTML = originalContent;
                  window.location.reload();
                }} className="btn-outline btn-sm print:hidden"><FiPrinter size={14}/> Print</button>
                <button onClick={() => setViewing(null)} className="p-2 hover:bg-slate-200 rounded-lg print:hidden"><FiX/></button>
              </div>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1 text-sm text-slate-700 bg-white" id="quotation-print-area">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">QUOTATION</h1>
                  <p className="text-slate-500 mt-1 font-medium">{viewing.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Date Issued</p>
                  <p className="font-medium text-slate-800 mb-2">{new Date(viewing.quotationDate || viewing.createdAt).toLocaleDateString('en-LK')}</p>
                  <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Valid Until</p>
                  <p className="font-medium text-slate-800">{viewing.validUntil ? new Date(viewing.validUntil).toLocaleDateString('en-LK') : '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 mb-2 tracking-wider">Quotation For</p>
                  <p className="font-bold text-slate-800 text-base">{viewing.client?.name || 'Walk-in Client'}</p>
                  <p className="text-slate-600 mt-1">{viewing.client?.email || ''}</p>
                  {viewing.client?.phone && <p className="text-slate-600">{viewing.client.phone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase font-bold text-slate-400 mb-2 tracking-wider">Prepared By</p>
                  <p className="font-bold text-slate-800 text-base">Raxwo ERP System</p>
                  <p className="text-slate-600 mt-1">{viewing.generatedBy?.name}</p>
                </div>
              </div>

              <table className="w-full text-left mb-8">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-500">
                    <th className="py-3 font-semibold w-1/2">Description</th>
                    <th className="py-3 font-semibold text-center">Qty</th>
                    <th className="py-3 font-semibold text-right">Unit Price</th>
                    <th className="py-3 font-semibold text-right">Discount</th>
                    <th className="py-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewing.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="py-4 font-medium text-slate-800">{item.description}</td>
                      <td className="py-4 text-center">{item.quantity}</td>
                      <td className="py-4 text-right">{(item.unitPrice || 0).toLocaleString()}</td>
                      <td className="py-4 text-right">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                      <td className="py-4 text-right font-semibold text-slate-800">{(item.total || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>LKR {(viewing.subtotal || 0).toLocaleString()}</span></div>
                  {viewing.taxRate > 0 && <div className="flex justify-between text-slate-600"><span>Tax ({viewing.taxRate}%)</span><span>LKR {(viewing.tax || 0).toLocaleString()}</span></div>}
                  <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t-2 border-slate-200">
                    <span>Total Amount</span>
                    <span>LKR {(viewing.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                {viewing.notes && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Notes</h4>
                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{viewing.notes}</p>
                  </div>
                )}
                {viewing.terms && (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 uppercase text-xs tracking-wider">Terms & Conditions</h4>
                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{viewing.terms}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}
