import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiCreditCard, FiSearch, FiEdit2, FiTrash2, FiSend } from 'react-icons/fi'

export default function AdminInvoices() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { items: [{ description: '', quantity: 1, unitPrice: 0 }] } })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => api.get('/invoices').then(r => r.data),
  })
  const { data: clientData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/auth/users').then(r => r.data),
  })
  const { data: projData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const clients = (clientData?.users || []).filter(u => u.role === 'client')
  const selectedClient = watch('client')
  const projectOptions = (projData?.projects || []).filter((p) => {
    const projectClientId = p.client?._id || p.client
    return !selectedClient || String(projectClientId) === String(selectedClient)
  })

  const createMut = useMutation({
    mutationFn: d => {
      const items = d.items || []
      const subtotal = items.reduce((a, item) => a + (item.unitPrice * item.quantity), 0)
      const total = subtotal + (Number(d.tax) || 0) - (Number(d.discount) || 0)
      return api.post('/invoices', { ...d, items: items.map(i => ({ ...i, total: i.unitPrice * i.quantity })), subtotal, total })
    },
    onSuccess: () => { qc.invalidateQueries(['admin-invoices']); toast.success('Invoice created'); reset(); setShowModal(false) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, status }) => api.put(`/invoices/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries(['admin-invoices']); toast.success('Invoice updated') },
  })

  const invoices = (data?.invoices || []).filter(inv =>
    !search || inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) || inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = { draft:'badge-gray', sent:'badge-blue', paid:'badge-green', overdue:'badge-red', cancelled:'badge-gray' }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices & Payments</h1>
          <p className="page-subtitle">{data?.count || 0} total invoices</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><FiPlus size={15}/> Create Invoice</button>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="form-input pl-10"/>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Invoice No</th><th>Client</th><th>Project</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th>
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
                <td className="text-gray-500 text-sm">{inv.project?.title ? `This invoice belongs to ${inv.project.title}` : '—'}</td>
                <td className="font-bold text-gray-800">LKR {inv.total?.toLocaleString()}</td>
                <td className="text-sm text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-LK') : '—'}</td>
                <td>
                  <select value={inv.status} onChange={e => updateMut.mutate({ id: inv._id, status: e.target.value })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none cursor-pointer">
                    {['draft','sent','paid','overdue','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <button onClick={() => updateMut.mutate({ id: inv._id, status: 'sent' })} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg" title="Mark Sent">
                    <FiSend size={13}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-primary font-heading">Create Invoice</h3>
                <button onClick={() => { setShowModal(false); reset() }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>
              <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Client *</label>
                    <select {...register('client',{required:true})} className="form-select">
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select></div>
                  <div><label className="form-label">Project *</label>
                    <select {...register('project', { required: true })} className="form-select">
                      <option value="">Select project for this invoice</option>
                      {projectOptions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                    </select></div>
                </div>
                <div>
                  <label className="form-label">Item Description *</label>
                  <input {...register('items.0.description',{required:true})} placeholder="e.g. Web Development Services - Month 1" className="form-input"/>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="form-label">Quantity</label>
                    <input {...register('items.0.quantity',{valueAsNumber:true})} type="number" min={1} defaultValue={1} className="form-input"/></div>
                  <div><label className="form-label">Unit Price (LKR)</label>
                    <input {...register('items.0.unitPrice',{valueAsNumber:true})} type="number" placeholder="100000" className="form-input"/></div>
                  <div><label className="form-label">Tax (LKR)</label>
                    <input {...register('tax',{valueAsNumber:true})} type="number" placeholder="0" className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Due Date</label>
                    <input {...register('dueDate')} type="date" className="form-input"/></div>
                  <div><label className="form-label">Discount (LKR)</label>
                    <input {...register('discount',{valueAsNumber:true})} type="number" placeholder="0" className="form-input"/></div>
                </div>
                <div><label className="form-label">Notes</label>
                  <textarea {...register('notes')} rows={2} placeholder="Payment terms, bank details..." className="form-input resize-none"/></div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={createMut.isPending} className="btn-primary flex-1 justify-center">
                    {createMut.isPending ? <span className="spinner"/> : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
