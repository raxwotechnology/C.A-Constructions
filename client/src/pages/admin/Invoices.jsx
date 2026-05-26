import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiCreditCard, FiSearch, FiEdit2, FiTrash2, FiSend, FiEye, FiFileText } from 'react-icons/fi'
import InvoiceDetail from './InvoiceDetail'
import InvoicePreviewPanel from '../../components/documents/InvoicePreviewPanel'
import { buildInvoiceDraft } from '../../lib/buildInvoiceDraft'
import { SITE_SETTINGS_QUERY_KEY } from '../../hooks/useSiteBranding'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { lookupLoaders } from '../../lib/lookupApi'
import { INVOICE_CURRENCIES, suggestedExchangeToLKR } from '../../lib/currencies'
import DocumentAssetPicker from '../../components/branding/DocumentAssetPicker'
import SignaturePad from '../../components/admin/SignaturePad'
import ExportBar from '../../components/ui/ExportBar'

const STATUS_COLORS = { draft: 'badge-gray', unpaid: 'badge-yellow', partial: 'badge-blue', paid: 'badge-green', overdue: 'badge-red', cancelled: 'badge-gray' }

export default function AdminInvoices() {
  const qc = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewInvoiceId, setViewInvoiceId] = useState(null)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [clientSelectLabel, setClientSelectLabel] = useState('')
  const [signatures, setSignatures] = useState({
    authorizer: { data: '', name: '', title: 'Authorized Signatory' },
    seal: { data: '' }
  })
  const [deletePending, setDeletePending] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [verifyingDelete, setVerifyingDelete] = useState(false)
  const [viewingInv, setViewingInv] = useState(null)
  const [sendTarget, setSendTarget] = useState(null)
  const [sendMethods, setSendMethods] = useState({ email: true, sms: false, link: true, pdf: true })

  const { register, handleSubmit, reset, watch, control, setValue } = useForm({
    defaultValues: {
      invoicePrefix: 'INV',
      currency: 'LKR',
      exchangeRateToLKR: 1,
      status: 'draft',
      items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }],
    },
  })
  const quotationRefField = register('quotationRef')
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchItems = watch('items') || []
  const subtotal = watchItems.reduce((s, item) => s + (Number(item.quantity || 1) * Number(item.unitPrice || 0) * (1 - Number(item.discount || 0) / 100)), 0)
  const taxRate = Number(watch('taxRate') || 0)
  const tax = subtotal * taxRate / 100
  const total = subtotal + tax

  const selectedQuotation = watch('quotationRef')
  const watchedCurrency = watch('currency') || 'LKR'
  const watchedProject = watch('project')

  useEffect(() => {
    const openId = location.state?.openInvoiceId
    if (!openId) return
    setViewInvoiceId(openId)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, location.pathname, navigate])

  const { data: invData, isLoading } = useQuery({
    queryKey: ['admin-invoices', branchFilter],
    queryFn: () => api.get(`/invoices${branchFilter ? `?branch=${branchFilter}` : ''}`).then(r => r.data),
  })
  const { data: siteData } = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: () => api.get('/site-settings').then((r) => r.data),
  })
  const siteSettings = siteData?.settings || {}

  const { data: clientData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients').then(r => r.data).catch(() => api.get('/auth/users').then(r => r.data)),
    enabled: showModal || !!viewingInv,
  })
  const { data: projData } = useQuery({ queryKey: ['projects-list'], queryFn: () => api.get('/projects').then(r => r.data) })
  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const { data: quotData } = useQuery({ queryKey: ['quotations'], queryFn: () => api.get('/quotations?status=confirmed').then(r => r.data) })

  const clients = (clientData?.users || clientData?.clients || []).filter((u) => !u.role || u.role === 'client')
  const projects = projData?.projects || []
  const branches = branchData?.branches || []
  const quotations = quotData?.quotations || []

  const formSnapshot = watch()
  const livePreviewInvoice = useMemo(
    () => buildInvoiceDraft(formSnapshot, { clients, editing, projects }),
    [formSnapshot, clients, editing, projects],
  )

  const syncPreviewToForm = (partial) => {
    Object.entries(partial).forEach(([key, value]) => {
      if (['notes', 'paymentTerms'].includes(key)) {
        setValue(key, value, { shouldDirty: true })
      }
    })
  }

  useEffect(() => {
    if (!watchedProject) return
    const pr = projects.find((p) => String(p._id) === String(watchedProject))
    if (pr?.deadline) {
      const d = new Date(pr.deadline).toISOString().split('T')[0]
      setValue('dueDate', d, { shouldDirty: false })
    }
  }, [watchedProject, projects, setValue])

  const openSavedInvoicePreview = async (invoice) => {
    if (!invoice?._id) return
    closeModal()
    try {
      const full = await api.get(`/invoices/${invoice._id}`).then((r) => r.data?.invoice)
      setViewingInv(full || invoice)
    } catch {
      setViewingInv(invoice)
    }
  }

  const downloadInvoicePdf = async (id, invoiceNo) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNo || 'invoice'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch {
      toast.error('PDF download failed')
    }
  }

  const sendMut = useMutation({
    mutationFn: ({ id, methods }) => api.post(`/invoices/${id}/send`, { methods }),
    onSuccess: (res, { methods }) => {
      qc.invalidateQueries(['admin-invoices'])
      const link = res.data?.shareLink
      if (link && methods?.includes('link')) {
        navigator.clipboard?.writeText(link).then(() => toast.success(`${res.data?.message || 'Sent'} · Link copied`)).catch(() => toast.success(res.data?.message || 'Sent'))
      } else {
        toast.success(res.data?.message || 'Sent')
      }
      setSendTarget(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Send failed'),
  })

  const previewSaveMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/invoices/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries(['admin-invoices'])
      qc.invalidateQueries(['invoice', id])
      toast.success('Invoice updated from preview')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Save failed'),
  })

  const createMut = useMutation({
    mutationFn: d => api.post('/invoices', d),
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-invoices'])
      toast.success('Invoice created')
      openSavedInvoicePreview(res.data?.invoice)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/invoices/${id}`, data),
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-invoices'])
      toast.success('Updated')
      openSavedInvoicePreview(res.data?.invoice)
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: ({ id, password }) => api.delete(`/invoices/${id}`, { data: { password } }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-invoices'])
      qc.invalidateQueries({ queryKey: ['finance-overview'] })
      qc.invalidateQueries({ queryKey: ['finance-entries-category'] })
      toast.success('Invoice deleted')
      setDeletePending(null)
      setDeletePassword('')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
    onSettled: () => setVerifyingDelete(false),
  })

  const confirmDeleteInvoice = async () => {
    if (!deletePending || !deletePassword.trim()) {
      toast.error('Enter your password')
      return
    }
    setVerifyingDelete(true)
    deleteMut.mutate({ id: deletePending._id, password: deletePassword })
  }

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
        const lineItems = q.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount }))
        if (Number(q.transportCharge) > 0) {
          lineItems.push({ description: 'Transport / delivery', quantity: 1, unitPrice: Number(q.transportCharge), discount: 0 })
        }
        setValue('items', lineItems)
        setValue('currency', q.currency || 'LKR')
        setValue('exchangeRateToLKR', suggestedExchangeToLKR(q.currency || 'LKR'))
        if (q.branch) setValue('branch', q.branch?._id || q.branch)
        if (q.project) {
          setValue('project', q.project?._id || q.project)
          const pr = projects.find((p) => String(p._id) === String(q.project?._id || q.project))
          if (pr?.deadline) setValue('dueDate', new Date(pr.deadline).toISOString().split('T')[0], { shouldDirty: false })
        }
      }
    }
  }

  const invoices = (invData?.invoices || []).filter(inv =>
    !search || inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) || inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    reset({
      invoicePrefix: 'INV',
      currency: 'LKR',
      exchangeRateToLKR: 1,
      status: 'draft',
      invoiceDate: new Date().toISOString().split('T')[0],
      items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }],
    })
    setSignatures({
      authorizer: { data: '', name: '', title: 'Authorized Signatory' },
      seal: { data: '' }
    })
    setEditing(null)
    setShowModal(true)
  }
  const openEdit = (inv) => {
    setEditing(inv)
    setClientSelectLabel(
      inv.client?.name ? `${inv.client.name}${inv.client.email ? ` (${inv.client.email})` : ''}` : ''
    )
    setShowModal(true)
    reset({
      client: inv.client?._id || inv.client,
      project: inv.project?._id || inv.project || '',
      branch: inv.branch?._id || inv.branch || '',
      quotationRef: inv.quotationRef?._id || inv.quotationRef || '',
      invoicePrefix: inv.invoicePrefix || 'INV',
      currency: inv.currency || 'LKR',
      exchangeRateToLKR: inv.exchangeRateToLKR ?? 1,
      taxRate: inv.taxRate || 0,
      notes: inv.notes || '',
      paymentTerms: inv.paymentTerms || '',
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      status: inv.status || 'draft',
      items: (inv.items || []).length
        ? inv.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
          }))
        : [{ description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }],
    })
    setSignatures({
      authorizer: { 
        data: inv.signatures?.authorizer?.data || '', 
        name: inv.signatures?.authorizer?.name || '', 
        title: inv.signatures?.authorizer?.title || 'Authorized Signatory' 
      },
      seal: { data: inv.signatures?.seal?.data || '' }
    })
  }
  const closeModal = () => { setShowModal(false); setEditing(null); reset() }

  const editingPaid = editing?.status === 'paid'

  const onSubmit = (d) => {
    if (editingPaid) {
      const payload = {
        status: d.status,
        notes: d.notes,
        paymentTerms: d.paymentTerms,
        invoiceDate: d.invoiceDate,
        dueDate: d.dueDate || undefined,
        branch: d.branch || undefined,
        project: d.project || undefined,
        currency: d.currency,
        exchangeRateToLKR: Number(d.exchangeRateToLKR) > 0 ? Number(d.exchangeRateToLKR) : 1,
        signatures,
      }
      updateMut.mutate({ id: editing._id, data: payload })
      return
    }
    const payload = {
      ...d,
      taxRate: Number(d.taxRate || 0),
      exchangeRateToLKR: Number(d.exchangeRateToLKR) > 0 ? Number(d.exchangeRateToLKR) : 1,
      status: d.status,
      signatures,
      items: (d.items || []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity || 1),
        unitPrice: Number(i.unitPrice || 0),
        discount: Number(i.discount || 0),
      })),
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
        <div className="flex items-center gap-3">
          <ExportBar
            data={invoices}
            columns={[
              { header: 'Invoice No', accessor: 'invoiceNo' },
              { header: 'Client', accessor: (i) => i.client?.name || '' },
              { header: 'Branch', accessor: (i) => i.branch?.name || '' },
              { header: 'Currency', accessor: 'currency' },
              { header: 'Total', accessor: (i) => i.total?.toLocaleString() },
              { header: 'Balance Due', accessor: (i) => i.remainingBalance?.toLocaleString() },
              { header: 'Status', accessor: 'status' },
              { header: 'Due Date', accessor: (i) => i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '' },
            ]}
            title="Invoices Report"
            filters={{ Branch: branches.find(b => b._id === branchFilter)?.name }}
          />
          <button onClick={openCreate} className="btn-primary"><FiPlus size={15}/> Create Invoice</button>
        </div>
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
                <td><span className="badge badge-navy font-mono text-xs tracking-tight">{inv.invoiceNo}</span></td>
                <td className="font-medium">{inv.client?.name}</td>
                <td className="text-sm text-gray-500">{inv.branch?.name || '—'}</td>
                <td className="font-bold text-gray-800">{inv.currency || 'LKR'} {inv.total?.toLocaleString()}</td>
                <td className="text-sm text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-LK') : '—'}</td>
                <td><span className={`badge uppercase ${STATUS_COLORS[inv.status] || 'badge-gray'}`}>{inv.status}</span></td>
                <td>
                  <div className="flex gap-1 items-center">
                    <button onClick={() => setViewInvoiceId(inv._id)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Payments & details"><FiEye size={14}/></button>
                    <button onClick={() => { setViewingInv(inv); setSendMethods({ email: true, sms: false, link: true, pdf: true }) }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Document preview"><FiFileText size={13}/></button>
                    <button type="button" onClick={() => openEdit(inv)} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg" title="Edit"><FiEdit2 size={13}/></button>
                    <button type="button" onClick={() => { setSendTarget(inv); setSendMethods({ email: true, sms: false, link: true, pdf: true }) }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Send"><FiSend size={13}/></button>
                    <button
                      type="button"
                      onClick={() => { setDeletePending(inv); setDeletePassword('') }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <FiTrash2 size={13}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4" style={{ zIndex: 999999 }}>
          <motion.div initial={{opacity:0,scale:0.98}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.98}}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[96vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between p-4 md:p-5 border-b shrink-0">
              <div>
                <h3 className="text-lg font-bold text-primary font-heading">{editing ? 'Edit Invoice' : 'New Invoice'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Fill details on the left; preview and print on the right.</p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              <form onSubmit={handleSubmit(onSubmit)} className="lg:w-[min(440px,42%)] xl:w-[min(480px,40%)] shrink-0 overflow-y-auto p-4 md:p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200">
                {editingPaid && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This invoice is fully paid. You can change <strong>status</strong>, dates, branch, project, currency, and notes only. Line items and tax are locked.
                  </div>
                )}
                {!editing && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                    <label className="form-label text-blue-800">Convert from Quotation (Optional)</label>
                    <select
                      {...quotationRefField}
                      onChange={(e) => {
                        quotationRefField.onChange(e)
                        handleQuotationSelect(e)
                      }}
                      className="form-select border-blue-200"
                    >
                      <option value="">-- Select a confirmed quotation to auto-fill --</option>
                      {quotations.map(q => <option key={q._id} value={q._id}>{q.quotationNo} - {q.title} ({q.client?.name})</option>)}
                    </select>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="form-label">Client *</label>
                    <input type="hidden" {...register('client', { required: true })} />
                    <SearchableSelect
                      value={watch('client') || ''}
                      onChange={(v, opt) => {
                        setValue('client', v, { shouldDirty: true, shouldValidate: true })
                        setClientSelectLabel(opt?.label || '')
                      }}
                      loadOptions={lookupLoaders.clients()}
                      placeholder="Search client…"
                      initialLabel={clientSelectLabel}
                    />
                  </div>
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
                    <input {...register('invoicePrefix')} className="form-input" placeholder="INV" disabled={!!editing}/></div>
                  <div><label className="form-label">Invoice Date</label>
                    <input {...register('invoiceDate')} type="date" className="form-input"/></div>
                  <div><label className="form-label">Due Date</label>
                    <input {...register('dueDate')} type="date" className="form-input"/></div>
                </div>

                {editing && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Invoice status</label>
                      <select {...register('status')} className="form-select">
                        {['draft', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Status is always editable; paid invoices only allow non-line changes.</p>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Currency</label>
                    <select
                      {...register('currency')}
                      onChange={(e) => {
                        register('currency').onChange(e)
                        setValue('exchangeRateToLKR', suggestedExchangeToLKR(e.target.value), { shouldValidate: true })
                      }}
                      className="form-select"
                    >
                      {INVOICE_CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Amounts are in this currency. LKR equivalent uses the rate below.</p>
                  </div>
                  {watchedCurrency !== 'LKR' && (
                    <div>
                      <label className="form-label">LKR per 1 {watchedCurrency}</label>
                      <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" placeholder="e.g. 303"/>
                      <p className="text-xs text-slate-500 mt-1">Used for reference (totals stay in {watchedCurrency}).</p>
                    </div>
                  )}
                </div>

                <div className={`pt-4 border-t ${editingPaid ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="form-label mb-0">Line Items</label>
                    <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, discount: 0 })}
                      className="btn-outline btn-sm" disabled={editingPaid}><FiPlus size={12}/> Add Item</button>
                  </div>
                  <div className="space-y-2">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-5"><input {...register(`items.${idx}.description`, { required: !editingPaid })} className="form-input text-sm py-2" placeholder="Description *" disabled={editingPaid}/></div>
                        <div className="col-span-2"><input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min="1" className="form-input text-sm py-2" placeholder="Qty" disabled={editingPaid}/></div>
                        <div className="col-span-2"><input {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} type="number" className="form-input text-sm py-2" placeholder="Unit Price" disabled={editingPaid}/></div>
                        <div className="col-span-2"><input {...register(`items.${idx}.discount`, { valueAsNumber: true })} type="number" min="0" max="100" className="form-input text-sm py-2" placeholder="Disc%" disabled={editingPaid}/></div>
                        <div className="col-span-1 pt-2">
                          {fields.length > 1 && !editingPaid && <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 p-1"><FiX size={14}/></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex gap-6 justify-end p-4 bg-slate-50 rounded-xl">
                    <div className="w-32">
                      <label className="form-label text-xs">Global Tax (%)</label>
                      <input {...register('taxRate', { valueAsNumber: true })} type="number" step="0.1" className="form-input py-1 text-sm text-right" placeholder="0" disabled={editingPaid}/>
                    </div>
                    <div className="w-56 space-y-1 text-sm mt-1">
                      <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>{watchedCurrency} {subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between text-slate-600"><span>Tax ({taxRate}%):</span><span>{watchedCurrency} {tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      <div className="flex justify-between font-bold text-primary pt-1 border-t border-slate-200"><span>Total:</span><span>{watchedCurrency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                      {watchedCurrency !== 'LKR' && Number(watch('exchangeRateToLKR')) > 0 && (
                        <div className="flex justify-between text-xs text-slate-500 pt-1">
                          <span>≈ LKR (ref.)</span>
                          <span>{(total * Number(watch('exchangeRateToLKR'))).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="form-label">Notes</label>
                    <textarea {...register('notes')} rows={3} className="form-input resize-none" placeholder="Additional notes..."/></div>
                  <div><label className="form-label">Payment Terms</label>
                    <textarea {...register('paymentTerms')} rows={3} className="form-input resize-none" placeholder="Payment terms..."/></div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Authorizer Signature</p>
                    <DocumentAssetPicker label="Signature (upload or saved)" value={{ data: signatures.authorizer.data }} onChange={(v) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, data: v.data } }))} roleKey="admin" />
                    <input className="form-input text-sm" placeholder="Signatory name" value={signatures.authorizer.name} onChange={(e) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, name: e.target.value } }))} />
                    <input className="form-input text-sm" placeholder="Signatory title (e.g. Authorized Signatory)" value={signatures.authorizer.title} onChange={(e) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, title: e.target.value } }))} />
                    <SignaturePad label="Draw signature" value={signatures.authorizer.data} onChange={(data) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, data } }))} />
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Company Seal</p>
                    <DocumentAssetPicker label="Seal image" assetType="seal" value={{ data: signatures.seal.data }} onChange={(v) => setSignatures((s) => ({ ...s, seal: { data: v.data } }))} />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white pb-1">
                  <button type="button" onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                    {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : (editing ? 'Save & Preview' : 'Create Invoice')}
                  </button>
                </div>
              </form>
              <div className="flex-1 min-h-[280px] lg:min-h-0 flex flex-col">
                <InvoicePreviewPanel
                  printRootId="invoice-form-preview-root"
                  isDraft={!editing?._id}
                  invoice={livePreviewInvoice}
                  siteSettings={siteSettings}
                  onFieldSync={syncPreviewToForm}
                  onSaveDraft={editing?._id ? (draft) => previewSaveMut.mutate({
                    id: editing._id,
                    data: { notes: draft.notes, paymentTerms: draft.paymentTerms },
                  }) : undefined}
                  saving={previewSaveMut.isPending}
                  onDownloadPdf={editing?._id ? (id) => downloadInvoicePdf(id, editing.invoiceNo) : undefined}
                />
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {viewingInv && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-[999999]">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[96vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between gap-3 p-4 border-b bg-slate-50 shrink-0 no-print">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 truncate">Invoice preview</h3>
                <span className="badge badge-navy font-mono text-xs shrink-0">{viewingInv.invoiceNo}</span>
                <span className={`badge uppercase shrink-0 ${STATUS_COLORS[viewingInv.status] || 'badge-gray'}`}>{viewingInv.status}</span>
              </div>
              <button type="button" onClick={() => setViewingInv(null)} className="p-2 hover:bg-slate-200 rounded-lg shrink-0"><FiX/></button>
            </div>
            <InvoicePreviewPanel
              invoice={viewingInv}
              siteSettings={siteSettings}
              saving={previewSaveMut.isPending}
              onSaveDraft={(draft) => previewSaveMut.mutate({
                id: viewingInv._id,
                data: { notes: draft.notes, paymentTerms: draft.paymentTerms },
              }, { onSuccess: () => api.get(`/invoices/${viewingInv._id}`).then((r) => setViewingInv(r.data?.invoice || viewingInv)) })}
              onSend={(draft) => {
                previewSaveMut.mutate({
                  id: viewingInv._id,
                  data: { notes: draft.notes, paymentTerms: draft.paymentTerms },
                }, { onSuccess: () => { setSendTarget(viewingInv); setSendMethods({ email: true, sms: false, link: true, pdf: true }) } })
              }}
              onDownloadPdf={(id) => downloadInvoicePdf(id, viewingInv.invoiceNo)}
            />
          </motion.div>
        </div>,
        document.body
      )}

      {sendTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1000000]">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg">Send {sendTarget.invoiceNo}</h3>
            <p className="text-sm text-slate-500">Choose one or more delivery methods.</p>
            <div className="space-y-2">
              {[
                { key: 'email', label: 'Email (PDF attached + portal link)' },
                { key: 'sms', label: 'SMS (share link)' },
                { key: 'link', label: 'Copy shareable link only' },
                { key: 'pdf', label: 'Generate PDF (included with email)' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sendMethods[key]}
                    onChange={(e) => setSendMethods((m) => ({ ...m, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-ghost flex-1 justify-center" onClick={() => setSendTarget(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary flex-1 justify-center"
                disabled={sendMut.isPending || !Object.values(sendMethods).some(Boolean)}
                onClick={() => {
                  const methods = Object.entries(sendMethods).filter(([, v]) => v).map(([k]) => k)
                  sendMut.mutate({ id: sendTarget._id, methods })
                }}
              >
                {sendMut.isPending ? <span className="spinner" /> : 'Send'}
              </button>
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

      {deletePending && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[100001] p-4 backdrop-blur-[2px]">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Delete invoice?</h3>
            <p className="text-sm text-slate-500">
              This permanently removes <strong>{deletePending.invoiceNo}</strong> and reverses linked bank deposits. Enter your admin password to confirm.
            </p>
            <input
              type="password"
              className="form-input"
              placeholder="Admin password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmDeleteInvoice() }}
              autoComplete="current-password"
            />
            <div className="flex gap-3">
              <button type="button" className="btn-ghost flex-1 justify-center" onClick={() => { setDeletePending(null); setDeletePassword('') }}>Cancel</button>
              <button type="button" className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 border-red-600" disabled={verifyingDelete || !deletePassword} onClick={confirmDeleteInvoice}>
                {verifyingDelete ? <span className="spinner" /> : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}
