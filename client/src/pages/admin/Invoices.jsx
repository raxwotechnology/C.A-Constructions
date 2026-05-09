import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiCreditCard, FiSearch, FiEdit2, FiTrash2, FiSend, FiEye } from 'react-icons/fi'
import InvoiceDetail from './InvoiceDetail'

const STATUS_COLORS = { draft: 'badge-gray', unpaid: 'badge-yellow', partial: 'badge-blue', paid: 'badge-green', overdue: 'badge-red', cancelled: 'badge-gray' }

export default function AdminInvoices() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewInvoiceId, setViewInvoiceId] = useState(null)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  const { register, handleSubmit, reset, watch, control, setValue } = useForm({
    defaultValues: { invoicePrefix: 'INV', items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchItems = watch('items') || []
  const subtotal = watchItems.reduce((s, item) => s + (Number(item.quantity || 1) * Number(item.unitPrice || 0) * (1 - Number(item.discount || 0) / 100)), 0)
  const taxRate = Number(watch('taxRate') || 0)
  const tax = subtotal * taxRate / 100
  const total = subtotal + tax

  const selectedQuotation = watch('quotationRef')

  const { data: invData, isLoading } = useQuery({
    queryKey: ['admin-invoices', branchFilter],
    queryFn: () => api.get(`/invoices${branchFilter ? `?branch=${branchFilter}` : ''}`).then(r => r.data),
  })
  const { data: clientData } = useQuery({ queryKey: ['clients-list'], queryFn: () => api.get('/auth/users').then(r => r.data) })
  const { data: projData } = useQuery({ queryKey: ['projects-list'], queryFn: () => api.get('/projects').then(r => r.data) })
  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const { data: quotData } = useQuery({ queryKey: ['quotations'], queryFn: () => api.get('/quotations?status=confirmed').then(r => r.data) })

  const clients = (clientData?.users || []).filter(u => u.role === 'client')
  const projects = projData?.projects || []
  const branches = branchData?.branches || []
  const quotations = quotData?.quotations || []

  const createMut = useMutation({
    mutationFn: d => api.post('/invoices', d),
    onSuccess: () => { qc.invalidateQueries(['admin-invoices']); toast.success('Invoice created'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/invoices/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['admin-invoices']); toast.success('Invoice updated'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/invoices/${id}`),
    onSuccess: () => { qc.invalidateQueries(['admin-invoices']); toast.success('Invoice deleted') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  // When quotation is selected, auto-fill items and client
  const handleQuotationSelect = (e) => {
    const qId = e.target.value
    if (qId) {
      const q = quotations.find(x => x._id === qId)
      if (q) {
        setValue('client', q.client?._id || q.client)
        setValue('taxRate', q.taxRate || 0)
        setValue('notes', q.notes || '')
        setValue('paymentTerms', q.terms || '')
        setValue('items', q.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })))
      }
    }
  }

  const invoices = (invData?.invoices || []).filter(inv =>
    !search || inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) || inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => { reset({ invoicePrefix: 'INV', invoiceDate: new Date().toISOString().split('T')[0], items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }] }); setEditing(null); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); reset() }

  const onSubmit = d => {
    const payload = {
      ...d,
      taxRate: Number(d.taxRate || 0),
      items: (d.items || []).map(i => ({
        description: i.description,
        quantity: Number(i.quantity || 1),
        unitPrice: Number(i.unitPrice || 0),
        discount: Number(i.discount || 0)
      }))
    }
    editing ? updateMut.mutate({ id: editing._id, data: payload }) : createMut.mutate(payload)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invData?.count || 0} total invoices</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={15}/> Create Invoice</button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice no or client..." className="form-input pl-10"/>
        </div>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="form-select w-auto">
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Invoice No</th><th>Client</th><th>Branch</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <FiCreditCard size={36} className="mx-auto mb-2 opacity-30"/>No invoices found
              </td></tr>
            ) : invoices.map(inv => (
              <tr key={inv._id}>
                <td><span className="badge badge-navy">{inv.invoiceNo}</span></td>
                <td className="font-medium">{inv.client?.name}</td>
                <td className="text-sm text-gray-500">{inv.branch?.name || '—'}</td>
                <td className="font-bold text-gray-800">LKR {inv.total?.toLocaleString()}</td>
                <td className="text-sm text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-LK') : '—'}</td>
                <td><span className={`badge uppercase ${STATUS_COLORS[inv.status] || 'badge-gray'}`}>{inv.status}</span></td>
                <td>
                  <div className="flex gap-1 items-center">
                    <button onClick={() => setViewInvoiceId(inv._id)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="View Details"><FiEye size={14}/></button>
                    {inv.status === 'draft' && (
                      <button onClick={() => updateMut.mutate({ id: inv._id, data: { status: 'unpaid' } })} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg" title="Mark Sent"><FiSend size={13}/></button>
                    )}
                    {inv.status !== 'paid' && (
                      <button onClick={() => { if(window.confirm('Delete?')) deleteMut.mutate(inv._id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><FiTrash2 size={13}/></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b shrink-0 bg-white">
              <h3 className="text-lg font-bold text-primary font-heading">{editing ? 'Edit Invoice' : 'Create Invoice'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                {!editing && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                    <label className="form-label text-blue-800">Convert from Quotation (Optional)</label>
                    <select {...register('quotationRef')} onChange={(e) => { register('quotationRef').onChange(e); handleQuotationSelect(e); }} className="form-select border-blue-200">
                      <option value="">-- Select a confirmed quotation to auto-fill --</option>
                      {quotations.map(q => <option key={q._id} value={q._id}>{q.quotationNo} - {q.title} ({q.client?.name})</option>)}
                    </select>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="form-label">Client *</label>
                    <select {...register('client', {required:true})} className={`form-select ${watch('client')===''?'border-red-400':''}`}>
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select></div>
                  <div><label className="form-label">Project (Optional)</label>
                    <select {...register('project')} className="form-select">
                      <option value="">Link to project</option>
                      {projects.filter(p => !watch('client') || String(p.client?._id || p.client) === String(watch('client'))).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                    </select></div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div><label className="form-label">Branch</label>
                    <select {...register('branch')} className="form-select">
                      <option value="">Select branch</option>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select></div>
                  <div><label className="form-label">Invoice Prefix</label>
                    <input {...register('invoicePrefix')} className="form-input" placeholder="INV"/></div>
                  <div><label className="form-label">Invoice Date</label>
                    <input {...register('invoiceDate')} type="date" className="form-input"/></div>
                  <div><label className="form-label">Due Date</label>
                    <input {...register('dueDate')} type="date" className="form-input"/></div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <label className="form-label mb-0">Line Items</label>
                    <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, discount: 0 })}
                      className="btn-outline btn-sm"><FiPlus size={12}/> Add Item</button>
                  </div>
                  <div className="space-y-2">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-5"><input {...register(`items.${idx}.description`, { required: true })} className="form-input text-sm py-2" placeholder="Description *"/></div>
                        <div className="col-span-2"><input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min="1" className="form-input text-sm py-2" placeholder="Qty"/></div>
                        <div className="col-span-2"><input {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} type="number" className="form-input text-sm py-2" placeholder="Unit Price"/></div>
                        <div className="col-span-2"><input {...register(`items.${idx}.discount`, { valueAsNumber: true })} type="number" min="0" max="100" className="form-input text-sm py-2" placeholder="Disc%"/></div>
                        <div className="col-span-1 pt-2">
                          {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 p-1"><FiX size={14}/></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex gap-6 justify-end p-4 bg-slate-50 rounded-xl">
                    <div className="w-32">
                      <label className="form-label text-xs">Global Tax (%)</label>
                      <input {...register('taxRate', { valueAsNumber: true })} type="number" step="0.1" className="form-input py-1 text-sm text-right" placeholder="0"/>
                    </div>
                    <div className="w-48 space-y-1 text-sm mt-1">
                      <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>LKR {subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between text-slate-600"><span>Tax ({taxRate}%):</span><span>LKR {tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between font-bold text-primary pt-1 border-t border-slate-200"><span>Total:</span><span>LKR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="form-label">Notes</label>
                    <textarea {...register('notes')} rows={3} className="form-input resize-none" placeholder="Additional notes..."/></div>
                  <div><label className="form-label">Payment Terms</label>
                    <textarea {...register('paymentTerms')} rows={3} className="form-input resize-none" placeholder="Payment terms..."/></div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button type="button" onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                    {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : (editing ? 'Save Changes' : 'Create Invoice')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      <AnimatePresence>
        {viewInvoiceId && (
          <InvoiceDetail invoiceId={viewInvoiceId} onClose={() => setViewInvoiceId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
