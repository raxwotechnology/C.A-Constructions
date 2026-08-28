import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiCreditCard, FiSearch, FiEdit2, FiTrash2, FiSend, FiEye, FiFileText, FiRefreshCw, FiExternalLink, FiDollarSign, FiCheckCircle, FiClock, FiDownload, FiCheck } from 'react-icons/fi'
import InvoiceDetail from './InvoiceDetail'
import InvoicePreviewPanel from '../../components/documents/InvoicePreviewPanel'
import PaymentReceiptModal from '../../components/documents/PaymentReceiptModal'
import { buildInvoiceDraft } from '../../lib/buildInvoiceDraft'
import { SITE_SETTINGS_QUERY_KEY } from '../../hooks/useSiteBranding'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { lookupLoaders } from '../../lib/lookupApi'
import { INVOICE_CURRENCIES, suggestedExchangeToLKR } from '../../lib/currencies'
import DocumentAssetPicker from '../../components/branding/DocumentAssetPicker'
import SignaturePad from '../../components/admin/SignaturePad'
import ExportBar from '../../components/ui/ExportBar'
import PasswordConfirmModal from '../../components/admin/PasswordConfirmModal'
import { calcDocumentTotals } from '../../lib/documentTotals'
import { resolveDocumentTerms } from '../../lib/documentTerms'
import { INVOICE_STATUS_OPTIONS } from '../../constants/invoiceStatus'

const STATUS_COLORS = { draft: 'badge-gray', unpaid: 'badge-yellow', partial: 'badge-blue', paid: 'badge-green', overdue: 'badge-red', cancelled: 'badge-gray' }

export default function AdminInvoices() {
  const qc = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('invoices') // 'invoices' | 'subscriptions'
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [mobileTab, setMobileTab] = useState('form')
  const [viewInvoiceId, setViewInvoiceId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [clientSelectLabel, setClientSelectLabel] = useState('')
  const [signatures, setSignatures] = useState({
    authorizer: { data: '', name: '', title: 'Authorized Signatory' },
    seal: { data: '' }
  })
  const [signatoryEmpId, setSignatoryEmpId] = useState('')
  const [deletePending, setDeletePending] = useState(null)
  const [viewingInv, setViewingInv] = useState(null)
  const [sendTarget, setSendTarget] = useState(null)
  const [sendMethods, setSendMethods] = useState({ email: true, sms: false, link: true, pdf: true })

  // Quick Partial Payment Modal & Receipt States
  const [recordPaymentInvoice, setRecordPaymentInvoice] = useState(null)
  const [receiptPayment, setReceiptPayment] = useState(null)
  const [receiptInvoice, setReceiptInvoice] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    bankAccount: '',
    reference: '',
    notes: '',
  })

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
  const docTotals = calcDocumentTotals(watchItems, {
    taxRate: watch('taxRate') || 0,
    globalDiscountValue: watch('globalDiscountValue') || 0,
    globalDiscountType: watch('globalDiscountType') || 'fixed',
    transportCharge: watch('transportCharge') || 0,
  })
  const { grossSubtotal, discountTotal: totalDiscount, tax, total, transportCharge: watchedTransport } = docTotals
  const taxRate = Number(watch('taxRate') || 0)

  const selectedQuotation = watch('quotationRef')
  const watchedCurrency = watch('currency') || 'LKR'
  const watchedProject = watch('project')

  const buildQuery = (source = 'manual') => {
    const p = new URLSearchParams()
    p.set('source', source)
    if (statusFilter) p.set('status', statusFilter)
    if (startDate) p.set('startDate', startDate)
    if (endDate) p.set('endDate', endDate)
    if (serviceTypeFilter) p.set('serviceType', serviceTypeFilter)
    if (branchFilter) p.set('branch', branchFilter)
    if (clientFilter) p.set('client', clientFilter)
    if (paymentMethodFilter) p.set('paymentMethod', paymentMethodFilter)
    return p.toString()
  }

  const { data: invData, isLoading } = useQuery({
    queryKey: ['admin-invoices', statusFilter, startDate, endDate, serviceTypeFilter, branchFilter, clientFilter, paymentMethodFilter],
    queryFn: () => api.get(`/invoices?${buildQuery('manual')}`).then(r => r.data),
  })

  const { data: subInvData, isLoading: subInvLoading } = useQuery({
    queryKey: ['admin-subscription-invoices', statusFilter, startDate, endDate, branchFilter, clientFilter],
    queryFn: () => api.get(`/invoices?${buildQuery('subscription')}`).then(r => r.data),
    enabled: activeTab === 'subscriptions',
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
  const { data: quotData } = useQuery({ queryKey: ['quotations-for-invoices'], queryFn: () => api.get('/quotations').then(r => r.data) })
  const { data: bankData } = useQuery({ queryKey: ['banks-list'], queryFn: () => api.get('/bank-accounts').then(r => r.data).catch(() => api.get('/settings/bank-accounts').then(r => r.data)) })

  const clients = useMemo(() => (clientData?.users || clientData?.clients || []).filter((u) => !u.role || u.role === 'client'), [clientData])
  const projects = useMemo(() => projData?.projects || [], [projData])
  const branches = useMemo(() => branchData?.branches || [], [branchData])
  const banks = useMemo(() => bankData?.accounts || [], [bankData])
  const quotations = useMemo(() => (quotData?.quotations || []).filter(
    (q) => !q.convertedToInvoice && !['rejected', 'converted', 'expired'].includes(q.status)
  ), [quotData])

  const handledLocationKeyRef = useRef(null)

  useEffect(() => {
    const state = location.state
    if (!state || handledLocationKeyRef.current === location.key) return
    handledLocationKeyRef.current = location.key

    if (state.openInvoiceId) {
      setViewInvoiceId(state.openInvoiceId)
      return
    }

    if (state.generateForProject) {
      const proj = state.generateForProject
      const clientObj = proj.client?._id ? proj.client : clients.find(c => String(c._id) === String(proj.client)) || proj.client
      const clientId = clientObj?._id || clientObj || ''
      const budgetAmt = Number(proj.budget || proj.contractValue || 0)

      reset({
        invoicePrefix: 'INV',
        currency: 'LKR',
        exchangeRateToLKR: 1,
        status: 'unpaid',
        invoiceDate: new Date().toISOString().split('T')[0],
        client: clientId,
        project: proj._id || '',
        branch: proj.branch?._id || proj.branch || '',
        serviceType: proj.serviceType || 'Residential Construction',
        dueDate: proj.deadline ? new Date(proj.deadline).toISOString().split('T')[0] : '',
        items: [{
          description: `${proj.title || 'Project'} — Milestone / Construction Works`,
          quantity: 1,
          unitPrice: budgetAmt > 0 ? budgetAmt : 0,
          discount: 0,
          total: budgetAmt > 0 ? budgetAmt : 0,
        }],
        paymentTerms: (() => { try { return localStorage.getItem('defaultInvoiceTerms') || '' } catch { return '' } })(),
        terms: (() => { try { return localStorage.getItem('defaultInvoiceTerms') || '' } catch { return '' } })(),
        notes: `Invoice generated for project: ${proj.title || 'Project'}`,
      })
      if (clientObj?.name) {
        setClientSelectLabel(clientObj.name)
      }
      setEditing(null)
      setShowModal(true)
    }
  }, [location.key, location.state, reset, clients])

  const formSnapshot = watch()
  const livePreviewInvoice = useMemo(
    () => ({
      ...buildInvoiceDraft(formSnapshot, { clients, editing, projects, banks }),
      signatures
    }),
    [formSnapshot, clients, editing, projects, signatures, banks],
  )

  const syncPreviewToForm = (partial) => {
    Object.entries(partial).forEach(([key, value]) => {
      if (key === 'notes') setValue('notes', value, { shouldDirty: true })
      if (key === 'paymentTerms') {
        setValue('paymentTerms', value, { shouldDirty: true })
        setValue('terms', value, { shouldDirty: true })
      }
    })
  }

  const bankBranchOptions = useMemo(() => {
    const names = new Set()
    banks.forEach((b) => {
      const n = String(b.branchName || '').trim()
      if (n) names.add(n)
    })
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [banks])

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

  const downloadPdf = async (id, invoiceNo) => {
    try {
      const { htmlStringToPdfDownload } = await import('../../lib/pdfGenerator')
      const res = await api.get(`/invoices/${id}/pdf?html=true&t=${Date.now()}`, { responseType: 'text' })
      const htmlStr = typeof res.data === 'string' ? res.data : await res.data.text()
      const fname = `${invoiceNo || 'invoice'}.pdf`
      toast.loading('Generating PDF...', { id: 'pdf-toast' })
      await htmlStringToPdfDownload(htmlStr, fname)
      toast.success('PDF downloaded', { id: 'pdf-toast' })
    } catch (err) {
      console.error(err)
      toast.error('PDF download failed', { id: 'pdf-toast' })
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
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  // ── Direct Partial / Installment Payment Recording ──────────────────────────
  const openRecordPayment = (inv) => {
    const remaining = typeof inv.remainingBalance === 'number'
      ? inv.remainingBalance
      : Math.max(0, Number(inv.total || 0) - Number(inv.totalPaid || 0))
    setRecordPaymentInvoice(inv)
    setPaymentForm({
      amount: remaining > 0 ? remaining : inv.total || '',
      date: new Date().toISOString().split('T')[0],
      method: 'cash',
      bankAccount: banks[0]?._id || '',
      reference: '',
      notes: inv.payments?.length ? `Installment #${inv.payments.length + 1}` : 'Initial advance / payment',
    })
  }

  const directRecordPaymentMutation = useMutation({
    mutationFn: ({ invoiceId, data }) => api.post(`/invoices/${invoiceId}/payments`, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects-list'] })
      qc.invalidateQueries({ queryKey: ['finance-overview'] })
      qc.invalidateQueries({ queryKey: ['bank-accounts'] })
      const updatedInv = res.data?.invoice
      const lastPay = updatedInv?.payments?.[updatedInv.payments.length - 1]
      const remBal = typeof updatedInv?.remainingBalance === 'number' ? updatedInv.remainingBalance : 0
      toast.success(`Payment of LKR ${Number(paymentForm.amount).toLocaleString()} recorded! Remaining Balance: LKR ${remBal.toLocaleString()}`)
      setRecordPaymentInvoice(null)
      if (lastPay) {
        setReceiptInvoice(updatedInv)
        setReceiptPayment(lastPay)
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record payment')
    },
  })

  // When quotation is selected, auto-fill items and client
  const handleQuotationSelect = (e) => {
    const qId = e.target.value
    if (qId) {
      const q = quotations.find(x => x._id === qId)
      if (q) {
        setValue('client', q.client?._id || q.client)
        setValue('taxRate', q.taxRate || 0)
        setValue('globalDiscountType', q.globalDiscountType || 'fixed')
        setValue('globalDiscountValue', q.globalDiscountValue || 0)
        setValue('notes', q.notes || '')
        const termsText = q.terms || q.paymentTerms || ''
        setValue('paymentTerms', termsText)
        setValue('terms', termsText)
        setValue('serviceType', q.serviceType || 'Other')
        setValue('paymentMethod', q.paymentMethod || '')
        setValue('paymentMethodCustom', q.paymentMethodCustom || '')
        setValue('transportCharge', q.transportCharge || 0)
        if (q.bankAccount) setValue('bankAccount', q.bankAccount._id || q.bankAccount)
        setValue('bankBranch', q.bankBranch || '')
        
        const lineItems = q.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount }))
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
      paymentTerms: (() => { try { return localStorage.getItem('defaultInvoiceTerms') || '' } catch { return '' } })(),
      terms: (() => { try { return localStorage.getItem('defaultInvoiceTerms') || '' } catch { return '' } })(),
    })
    setSignatures({
      authorizer: { data: '', name: '', title: 'Authorized Signatory' },
      seal: { data: '', note: '' }
    })
    setSignatoryEmpId('')
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
      globalDiscountType: inv.globalDiscountType || 'fixed',
      globalDiscountValue: inv.globalDiscountValue || 0,
      serviceType: inv.serviceType || 'Other',
      transportCharge: inv.transportCharge || 0,
      paymentMethod: inv.paymentMethod || '',
      paymentMethodCustom: inv.paymentMethodCustom || '',
      bankAccount: inv.bankAccount?._id || inv.bankAccount || '',
      bankBranch: inv.bankBranch || '',
      notes: inv.notes || '',
      paymentTerms: resolveDocumentTerms(inv),
      terms: resolveDocumentTerms(inv),
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
      seal: { data: inv.signatures?.seal?.data || '', note: inv.signatures?.seal?.note || '' }
    })
    setSignatoryEmpId('')
  }
  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setSignatoryEmpId('')
    setMobileTab('form')
    reset()
  }

  useEffect(() => {
    if (!showModal) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showModal])

  const editingPaid = editing?.status === 'paid'

  const onFormError = (errors) => {
    console.error('Invoice form validation errors:', errors)
    const errKeys = Object.keys(errors || {})
    if (errKeys.length > 0) {
      const firstKey = errKeys[0]
      const errObj = errors[firstKey]
      const msg = errObj?.message || (firstKey === 'client' ? 'Client is required — please select or enter client name' : `Please check the ${firstKey} field`)
      toast.error(msg)
    }
  }

  const onSubmit = (d) => {
    if (!d.client || !String(d.client).trim()) {
      toast.error('Client is required — please select or enter client name')
      return
    }
    const validItems = (d.items || []).filter((i) => i && String(i.description || '').trim())
    if (!editingPaid && validItems.length === 0) {
      toast.error('At least one line item with description is required!')
      return
    }
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
      if (!payload.branch) delete payload.branch
      if (!payload.project) delete payload.project
      if (!payload.dueDate) delete payload.dueDate

      updateMut.mutate({ id: editing._id, data: payload })
      return
    }
    const totals = calcDocumentTotals(d.items || [], {
      taxRate: d.taxRate || 0,
      globalDiscountValue: d.globalDiscountValue || 0,
      globalDiscountType: d.globalDiscountType || 'fixed',
      transportCharge: d.transportCharge || 0,
    })
    const termsText = String(d.paymentTerms || d.terms || '').trim()
    const payload = {
      ...d,
      client: String(d.client).trim(),
      paymentTerms: termsText,
      terms: termsText,
      taxRate: Number(d.taxRate || 0),
      globalDiscountType: d.globalDiscountType || 'fixed',
      globalDiscountValue: Number(d.globalDiscountValue || 0),
      discountTotal: totals.discountTotal,
      transportCharge: Number(d.transportCharge || 0),
      subtotal: totals.grossSubtotal,
      tax: totals.tax,
      total: totals.total,
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

    if (!payload.branch) delete payload.branch
    if (!payload.project) delete payload.project
    if (!payload.quotationRef) delete payload.quotationRef
    if (!payload.bankAccount) delete payload.bankAccount
    if (!payload.dueDate) delete payload.dueDate

    editing ? updateMut.mutate({ id: editing._id, data: payload }) : createMut.mutate(payload)
  }

  const subInvoices = ((activeTab === 'subscriptions' ? subInvData?.invoices : []) || []).filter(inv =>
    !search || inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) || inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const activeInvoices = activeTab === 'subscriptions' ? subInvoices : invoices
  const activeIsLoading = activeTab === 'subscriptions' ? subInvLoading : isLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">
            {activeTab === 'subscriptions'
              ? `${subInvData?.count || 0} subscription invoices`
              : `${invData?.count || 0} total invoices`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportBar
            data={activeInvoices}
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
            title={activeTab === 'subscriptions' ? 'Subscription Invoices Report' : 'Invoices Report'}
            filters={{ Branch: branches.find(b => b._id === branchFilter)?.name }}
          />
          {activeTab === 'invoices' && (
            <button onClick={openCreate} className="btn-primary"><FiPlus size={15}/> Create Invoice</button>
          )}
          {activeTab === 'subscriptions' && (
            <button onClick={() => navigate('/admin/subscriptions')} className="btn-outline flex items-center gap-2 text-sm">
              <FiExternalLink size={14}/> Go to Subscriptions
            </button>
          )}
        </div>
      </div>

      {/* ── Financial Summary KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Invoiced</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><FiFileText size={15} /></span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            LKR {activeInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{activeInvoices.length} Total Invoices</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600">Total Collected</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><FiCheckCircle size={15} /></span>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            LKR {activeInvoices.reduce((s, i) => s + (Number(i.totalPaid) || 0), 0).toLocaleString()}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
            {(() => {
              const tot = activeInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
              const paid = activeInvoices.reduce((s, i) => s + (Number(i.totalPaid) || 0), 0);
              const pct = tot > 0 ? Math.min(100, Math.round((paid / tot) * 100)) : 0;
              return <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />;
            })()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600">Outstanding Balance</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><FiClock size={15} /></span>
          </div>
          <p className="text-xl font-extrabold text-rose-600 mt-1">
            LKR {activeInvoices.reduce((s, i) => s + (typeof i.remainingBalance === 'number' ? i.remainingBalance : Math.max(0, (Number(i.total) || 0) - (Number(i.totalPaid) || 0))), 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-rose-500 mt-0.5 font-medium">To be collected from clients</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600">Settlement Status</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><FiDollarSign size={15} /></span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
              {activeInvoices.filter(i => i.status === 'paid').length} Paid
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700">
              {activeInvoices.filter(i => i.status === 'partial').length} Partial
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
              {activeInvoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').length} Unpaid
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tracking live client payments</p>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex border-b border-slate-200 -mb-2">
        {[
          { key: 'invoices', label: 'Invoices', count: invData?.count },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors relative ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary -mb-[2px]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:flex-1 sm:w-auto sm:min-w-[200px]">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice no, client or project..." className="form-input !pl-10 w-full"/>
        </div>
        <select className="form-select py-2 text-sm w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['draft', 'unpaid', 'partial', 'paid', 'overdue', 'cancelled'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select className="form-select py-2 text-sm w-auto" value={serviceTypeFilter} onChange={e => setServiceTypeFilter(e.target.value)}>
          <option value="">All Services</option>
          {['Residential Construction', 'Commercial Construction', 'Renovation & Remodeling', 'Interior Design & Fit-out', 'Civil Engineering & Infrastructure', 'Architectural Design', 'MEP Services'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select py-2 text-sm w-auto" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select className="form-select py-2 text-sm w-auto max-w-xs" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="">All Customers</option>
          {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="form-select py-2 text-sm w-auto" value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)}>
          <option value="">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
          <option value="card">Card</option>
          <option value="online">Online</option>
          <option value="custom">Custom</option>
        </select>
        {/* Date range picker */}
        <div className="w-full sm:w-auto grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          <div className="relative flex-1 sm:w-40">
            <span className="absolute left-2.5 top-1 text-[9px] font-bold text-slate-400 uppercase">From</span>
            <input
              type="date"
              className="form-input pt-4 pb-1 px-2.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-secondary/20 w-full"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="relative flex-1 sm:w-40">
            <span className="absolute left-2.5 top-1 text-[9px] font-bold text-slate-400 uppercase">To</span>
            <input
              type="date"
              className="form-input pt-4 pb-1 px-2.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-secondary/20 w-full"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate('') }}
              className="col-span-2 sm:col-span-1 py-2 px-3 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
              title="Clear dates"
            >
              <FiX size={13}/> Clear Dates
            </button>
          )}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-3">
        {activeIsLoading ? (
          <div className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
        ) : activeInvoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FiCreditCard size={36} className="mx-auto mb-2 opacity-30"/>
            {activeTab === 'subscriptions' ? 'No subscription invoices found. Create one from the Subscriptions page.' : 'No invoices found'}
          </div>
        ) : activeInvoices.map(inv => {
          const tot = Number(inv.total || 0);
          const paid = Number(inv.totalPaid || 0);
          const rem = typeof inv.remainingBalance === 'number' ? inv.remainingBalance : Math.max(0, tot - paid);
          const pct = tot > 0 ? Math.min(100, Math.round((paid / tot) * 100)) : 0;
          return (
            <div key={inv._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="badge badge-navy font-mono text-xs tracking-tight">{inv.invoiceNo}</span>
                  {activeTab === 'subscriptions' && <span className="ml-1.5 badge badge-blue text-[10px]">Subscription</span>}
                  <p className="font-semibold text-slate-800 mt-1 truncate">{inv.client?.name}</p>
                  {inv.project?.title && (
                    <p className="text-xs font-bold text-amber-700 truncate">Project: {inv.project.title}</p>
                  )}
                  <p className="text-xs text-slate-400">{inv.serviceType || 'Other'} {inv.branch?.name ? `· ${inv.branch.name}` : ''}</p>
                </div>
                <span className={`badge uppercase shrink-0 ${STATUS_COLORS[inv.status] || 'badge-gray'}`}>
                  {inv.status === 'partial' ? `Partial (${pct}%)` : inv.status}
                </span>
              </div>

              {/* Financial Snapshot */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Invoiced:</span>
                  <span className="font-bold text-slate-800">{inv.currency || 'LKR'} {tot.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid to Date:</span>
                  <span className="font-bold text-emerald-600">{inv.currency || 'LKR'} {paid.toLocaleString()} ({pct}%)</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="font-bold text-rose-700">Balance Due:</span>
                  <span className="font-extrabold text-rose-700">{inv.currency || 'LKR'} {rem.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                {rem > 0 && inv.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => openRecordPayment(inv)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <FiDollarSign size={14}/> Record Installment Payment
                  </button>
                )}
                <button onClick={() => setViewInvoiceId(inv._id)} className="flex-1 btn-ghost btn-sm justify-center text-xs"><FiEye size={13}/> Ledger</button>
                <button onClick={() => { setViewingInv(inv); setSendMethods({ email: true, sms: false, link: true, pdf: true }) }} className="flex-1 btn-ghost btn-sm justify-center text-xs"><FiFileText size={13}/> Preview</button>
                <button type="button" onClick={() => openEdit(inv)} className="flex-1 btn-ghost btn-sm justify-center text-xs"><FiEdit2 size={13}/> Edit</button>
                <button type="button" onClick={() => { setSendTarget(inv); setSendMethods({ email: true, sms: false, link: true, pdf: true }) }} className="flex-1 btn-ghost btn-sm justify-center text-xs"><FiSend size={13}/> Send</button>
                <button type="button" onClick={() => setDeletePending(inv)} className="flex-1 btn-ghost btn-sm justify-center text-xs text-red-500 hover:bg-red-50"><FiTrash2 size={13}/> Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block table-container">
        <table className="table text-xs">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Client &amp; Project</th>
              <th>Service</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Balance Due</th>
              <th>Due Date</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeIsLoading ? (
              <tr><td colSpan={9} className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></td></tr>
            ) : activeInvoices.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                <FiCreditCard size={36} className="mx-auto mb-2 opacity-30"/>
                {activeTab === 'subscriptions'
                  ? 'No subscription invoices yet. Generate them from the Subscriptions page → Payment History → Invoice button.'
                  : 'No invoices found'}
              </td></tr>
            ) : activeInvoices.map(inv => {
              const tot = Number(inv.total || 0);
              const paid = Number(inv.totalPaid || 0);
              const rem = typeof inv.remainingBalance === 'number' ? inv.remainingBalance : Math.max(0, tot - paid);
              const pct = tot > 0 ? Math.min(100, Math.round((paid / tot) * 100)) : 0;
              const payCount = (inv.payments || []).length;
              return (
                <tr key={inv._id} className="hover:bg-slate-50/70 transition">
                  <td>
                    <span className="badge badge-navy font-mono text-xs tracking-tight">{inv.invoiceNo}</span>
                    {activeTab === 'subscriptions' && <span className="ml-1.5 badge badge-blue text-[10px]">Sub</span>}
                  </td>

                  <td>
                    <div className="font-bold text-slate-900">{inv.client?.name || 'N/A'}</div>
                    {inv.project?.title ? (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {inv.project.title}
                      </span>
                    ) : inv.branch?.name ? (
                      <span className="text-[11px] text-slate-400">{inv.branch.name}</span>
                    ) : null}
                  </td>

                  <td className="text-slate-600">{inv.serviceType || 'Other'}</td>

                  {/* Total Invoiced */}
                  <td className="font-extrabold text-slate-900">
                    {inv.currency || 'LKR'} {tot.toLocaleString()}
                  </td>

                  {/* Paid to Date */}
                  <td>
                    <div className="font-bold text-emerald-600">
                      {inv.currency || 'LKR'} {paid.toLocaleString()}
                    </div>
                    {payCount > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {payCount} {payCount === 1 ? 'payment' : 'installments'} ({pct}%)
                      </span>
                    )}
                  </td>

                  {/* Balance Due */}
                  <td>
                    <div className={`font-extrabold ${rem > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {inv.currency || 'LKR'} {rem.toLocaleString()}
                    </div>
                    <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </td>

                  <td className="text-slate-500 whitespace-nowrap">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-LK') : '—'}
                  </td>

                  {/* Status */}
                  <td>
                    <span className={`badge uppercase ${STATUS_COLORS[inv.status] || 'badge-gray'}`}>
                      {inv.status === 'partial' ? `Partial (${pct}%)` : inv.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="text-right">
                    <div className="flex gap-1 items-center justify-end">
                      {/* Direct Record Payment button */}
                      {rem > 0 && inv.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => openRecordPayment(inv)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                          title="Record Installment / Partial Payment"
                        >
                          <FiDollarSign size={13}/>
                          <span>Pay</span>
                        </button>
                      )}

                      <button
                        onClick={() => setViewInvoiceId(inv._id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Payments Ledger & Details"
                      >
                        <FiEye size={14}/>
                      </button>

                      <button
                        onClick={() => { setViewingInv(inv); setSendMethods({ email: true, sms: false, link: true, pdf: true }) }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        title="Document preview"
                      >
                        <FiFileText size={13}/>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(inv)}
                        className="p-1.5 text-slate-400 hover:text-secondary hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit"
                      >
                        <FiEdit2 size={13}/>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setSendTarget(inv); setSendMethods({ email: true, sms: false, link: true, pdf: true }) }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        title="Send"
                      >
                        <FiSend size={13}/>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletePending(inv)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Delete"
                      >
                        <FiTrash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-0 sm:p-2 lg:p-4 z-[999999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <motion.div initial={{opacity:0,scale:0.98}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.98}}
            className="doc-editor-modal bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-[95vw] 2xl:max-w-[1600px] h-full sm:h-[96vh] overflow-hidden flex flex-col border-0 sm:border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 sm:p-4 md:p-5 border-b shrink-0 bg-white z-10">
              <div className="min-w-0 pr-2">
                <h3 className="text-base sm:text-lg font-bold text-primary font-heading truncate">{editing ? 'Edit Invoice' : 'New Invoice'}</h3>
                {(editing?.invoiceNo || watch('invoiceNo')) && <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">#{editing?.invoiceNo || watch('invoiceNo')}</p>}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-xl shrink-0 cursor-pointer text-slate-500 hover:text-slate-900 transition-colors"
                title="Close"
              >
                <FiX size={20}/>
              </button>
            </div>
            {/* Mobile tab switcher */}
            <div className="lg:hidden flex border-b border-slate-200 shrink-0">
              <button type="button" onClick={() => setMobileTab('form')} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mobileTab === 'form' ? 'text-primary border-b-2 border-primary bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>Form</button>
              <button type="button" onClick={() => setMobileTab('preview')} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mobileTab === 'preview' ? 'text-primary border-b-2 border-primary bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>Preview</button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              <form onSubmit={handleSubmit(onSubmit, onFormError)} className={`lg:w-[450px] xl:w-[550px] 2xl:w-[600px] overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-200 ${mobileTab === 'preview' ? 'hidden lg:flex lg:flex-col lg:shrink-0 lg:flex-none' : 'flex flex-col flex-1 min-h-0 min-w-0 lg:flex-none lg:shrink-0'}`}>
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
                      <option value="">-- Select an eligible quotation to auto-fill --</option>
                      {quotations.map(q => (
                        <option key={q._id} value={q._id}>
                          {q.quotationNo} - {q.client?.name} - {new Date(q.createdAt).toLocaleDateString()} - {q.status.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">1. Core Details</h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="form-label mb-0">Client *</label>
                        <span className="text-[10px] text-slate-400 font-medium">Auto-suggest or type new</span>
                      </div>
                      <input type="hidden" {...register('client', { required: 'Please select or type a client name' })} />
                      <SearchableSelect
                        value={watch('client') || ''}
                        onChange={(v, opt) => {
                          setValue('client', v, { shouldDirty: true, shouldValidate: true })
                          setClientSelectLabel(opt?.label || v || '')
                        }}
                        loadOptions={lookupLoaders.clients()}
                        placeholder="Search or type new client…"
                        initialLabel={clientSelectLabel}
                        allowCustom={true}
                      />
                    </div>
                    <div>
                      <label className="form-label">Service Type</label>
                      <select {...register('serviceType')} className="form-select">
                        {['Residential Construction', 'Commercial Construction', 'Renovation & Remodeling', 'Interior Design & Fit-out', 'Civil Engineering & Infrastructure', 'Architectural Design', 'MEP Services'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Branch</label>
                      <select {...register('branch')} className="form-select">
                        <option value="">Select branch</option>
                        {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Project (Optional)</label>
                      <select {...register('project')} className="form-select">
                        <option value="">Link to project</option>
                        {projects.map(p => (
                          <option key={p._id} value={p._id}>
                            {p.title} {p.client?.name ? `(${p.client.name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">Invoice Prefix</label>
                      <input {...register('invoicePrefix')} className="form-input" placeholder="INV" disabled={!!editing}/>
                    </div>
                    <div>
                      <label className="form-label">Invoice Date</label>
                      <input {...register('invoiceDate')} type="date" className="form-input"/>
                    </div>
                    <div>
                      <label className="form-label">Due Date</label>
                      <input {...register('dueDate')} type="date" className="form-input"/>
                    </div>
                  </div>

                  {editing && (
                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="form-label">Invoice Status</label>
                        <select {...register('status')} className="form-select border-amber-300 bg-amber-50">
                          {INVOICE_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <p className="text-xs text-amber-700 mt-1">Status updates on save and is recorded in audit logs.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">2. Financial Settings</h4>
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
                    </div>
                    {watchedCurrency !== 'LKR' ? (
                      <div>
                        <label className="form-label">LKR per 1 {watchedCurrency}</label>
                        <input {...register('exchangeRateToLKR', { valueAsNumber: true })} type="number" step="0.01" min="0.01" className="form-input" placeholder="e.g. 303"/>
                      </div>
                    ) : <div />}
                  </div>
                </div>

                <div className={`space-y-4 ${editingPaid ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">3. Line Items</h4>
                    <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, discount: 0 })}
                      className="btn-outline btn-sm" disabled={editingPaid}><FiPlus size={12}/> Add Item</button>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start bg-white p-2 rounded border border-slate-200">
                        <div className="col-span-12 md:col-span-5">
                          <label className="form-label text-[10px]">Description</label>
                          <input {...register(`items.${idx}.description`, { required: !editingPaid })} className="form-input text-sm py-1.5" placeholder="Description *" disabled={editingPaid}/>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="form-label text-[10px]">Quantity</label>
                          <input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min="1" className="form-input text-sm py-1.5" placeholder="Qty" disabled={editingPaid}/>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <label className="form-label text-[10px]">Unit Price</label>
                          <input {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} type="number" className="form-input text-sm py-1.5" placeholder="Price" disabled={editingPaid}/>
                        </div>
                        <div className="col-span-3 md:col-span-2">
                          <label className="form-label text-[10px]">Disc %</label>
                          <input {...register(`items.${idx}.discount`, { valueAsNumber: true })} type="number" min="0" max="100" className="form-input text-sm py-1.5" placeholder="Disc%" disabled={editingPaid}/>
                        </div>
                        <div className="col-span-1 pt-6 flex justify-end">
                          {fields.length > 1 && !editingPaid && <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded"><FiX size={14}/></button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="form-label">Transport Charge</label>
                      <input {...register('transportCharge', { valueAsNumber: true })} type="number" step="0.01" className="form-input" placeholder="0" disabled={editingPaid}/>
                    </div>
                    <div>
                      <label className="form-label">Global Tax (%)</label>
                      <input {...register('taxRate', { valueAsNumber: true })} type="number" step="0.1" className="form-input" placeholder="0" disabled={editingPaid}/>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Global Discount Type</label>
                      <select {...register('globalDiscountType')} className="form-select" disabled={editingPaid}>
                        <option value="fixed">Fixed Amount</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Global Discount Value</label>
                      <input {...register('globalDiscountValue', { valueAsNumber: true })} type="number" step="0.01" className="form-input" placeholder="0" disabled={editingPaid}/>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-slate-800 text-white rounded-xl shadow-inner">
                    <div className="flex justify-between text-slate-300 text-sm mb-1"><span>Subtotal:</span><span>{watchedCurrency} {grossSubtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    {totalDiscount > 0 && <div className="flex justify-between text-red-300 text-sm mb-1"><span>Discount:</span><span>-{watchedCurrency} {totalDiscount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>}
                    {watchedTransport > 0 && (
                      <div className="flex justify-between text-slate-300 text-sm mb-1"><span>Transport:</span><span>{watchedCurrency} {watchedTransport.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    )}
                    <div className="flex justify-between text-slate-300 text-sm mb-1"><span>Tax ({taxRate}%):</span><span>{watchedCurrency} {tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-600 mt-2"><span>Total:</span><span>{watchedCurrency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">4. Payment & Bank Details</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Payment Method</label>
                      <select {...register('paymentMethod')} className="form-select">
                        <option value="">Select Method</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    {watch('paymentMethod') === 'custom' && (
                      <div>
                        <label className="form-label">Custom Method Name</label>
                        <input {...register('paymentMethodCustom')} className="form-input" placeholder="Enter method..." />
                      </div>
                    )}
                    <div>
                      <label className="form-label">Bank Account</label>
                      {/* Note: since bankData is not fetched in Invoices yet, we will just provide a plain text field or assume it's hidden if not fetched. But wait, I need to fetch it in Invoices.jsx! I will update the top of Invoices.jsx to fetch banks. Let's assume bankData exists for now, I'll add the query. */}
                      <select
                        {...register('bankAccount')}
                        className="form-select"
                        onChange={(e) => {
                          register('bankAccount').onChange(e)
                          const selected = banks.find((b) => String(b._id) === String(e.target.value))
                          if (selected?.branchName) {
                            setValue('bankBranch', selected.branchName, { shouldDirty: true })
                          }
                        }}
                      >
                        <option value="">Select Bank Account</option>
                        {banks.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.bankName} - {b.accountNumber}{b.branchName ? ` (${b.branchName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Bank Branch</label>
                      <SearchableSelect
                        value={watch('bankBranch') || ''}
                        onChange={(v) => setValue('bankBranch', v, { shouldDirty: true })}
                        loadOptions={async ({ search, page }) => {
                          const filtered = bankBranchOptions.filter(
                            (n) => !search || n.toLowerCase().includes(search.toLowerCase()),
                          )
                          const pageSize = 25
                          const start = ((page || 1) - 1) * pageSize
                          const slice = filtered.slice(start, start + pageSize)
                          return {
                            options: slice.map((n) => ({ value: n, label: n })),
                            hasMore: start + pageSize < filtered.length,
                          }
                        }}
                        placeholder="Select bank branch…"
                        initialLabel={watch('bankBranch') || ''}
                        allowCustom
                      />
                      <input type="hidden" {...register('bankBranch')} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">5. Notes & Terms</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Notes</label>
                      <textarea {...register('notes')} rows={3} className="form-input resize-none" placeholder="Additional notes..."/>
                    </div>
                    <div>
                      <label className="form-label">Terms & Conditions</label>
                      <textarea
                        {...register('paymentTerms')}
                        onChange={(e) => {
                          register('paymentTerms').onChange(e)
                          setValue('terms', e.target.value, { shouldDirty: true })
                        }}
                        rows={3}
                        className="form-input resize-none"
                        placeholder="Terms & Conditions..."
                      />
                      <div className="flex justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              localStorage.setItem('defaultInvoiceTerms', watch('paymentTerms') || '')
                              toast.success('Default terms saved')
                            } catch {
                              toast.error('Could not save default terms')
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Save as default
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">6. Signatures</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-slate-500 tracking-wide">Authorizer Signature</p>
                      <div>
                        <label className="form-label text-xs">Auto-fill from Employee (optional)</label>
                        <SearchableSelect
                          value={signatoryEmpId}
                          onChange={async (empId) => {
                            setSignatoryEmpId(empId)
                            if (!empId) return
                            try {
                              const res = await api.get(`/employees/${empId}`)
                              const emp = res.data?.employee
                              if (emp) {
                                setSignatures((s) => ({
                                  ...s,
                                  authorizer: {
                                    ...s.authorizer,
                                    name: emp.userId?.name || emp.name || s.authorizer.name,
                                    title: emp.designation || '',
                                  },
                                }))
                              }
                            } catch {}
                          }}
                          loadOptions={lookupLoaders.employeesAll()}
                          placeholder="Search employee to auto-fill…"
                        />
                      </div>
                      <DocumentAssetPicker 
                        label="Signature (upload or saved)" 
                        value={{ data: signatures.authorizer.data }} 
                        onChange={(v) => {
                          setSignatures((s) => ({
                            ...s,
                            authorizer: {
                              ...s.authorizer,
                              data: v.data,
                              ...(v.label ? { name: v.label, title: v.label } : {})
                            }
                          }))
                        }} 
                      />
                      <div>
                        <label className="form-label text-xs">Signatory Name</label>
                        <input className="form-input text-sm" placeholder="Name" value={signatures.authorizer.name} onChange={(e) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, name: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="form-label text-xs">Signatory Title</label>
                        <input className="form-input text-sm" placeholder="Title" list="signatory-titles" value={signatures.authorizer.title} onChange={(e) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, title: e.target.value } }))} />
                      </div>
                      <datalist id="signatory-titles">
                        <option value="Director" />
                        <option value="Authorized Signatory" />
                        <option value="Manager" />
                        <option value="HR" />
                      </datalist>
                      <SignaturePad label="Draw signature" value={signatures.authorizer.data} onChange={(data) => setSignatures((s) => ({ ...s, authorizer: { ...s.authorizer, data } }))} />
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-slate-500 tracking-wide">Company Seal</p>
                      <DocumentAssetPicker label="Seal image" assetType="seal" value={{ data: signatures.seal.data }} onChange={(v) => setSignatures((s) => ({ ...s, seal: { ...s.seal, data: v.data } }))} />
                      <div>
                        <label className="form-label text-xs">Text under seal</label>
                        <input className="form-input text-sm" placeholder="For and on behalf of..." value={signatures.seal.note || ''} onChange={(e) => setSignatures((s) => ({ ...s, seal: { ...s.seal, note: e.target.value } }))} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t sticky bottom-0 bg-white pb-1 z-10">
                  <button type="button" onClick={closeModal} className="btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                    {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : (editing ? 'Save Invoice' : 'Create Invoice')}
                  </button>
                </div>
              </form>
              <div className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden ${mobileTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
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
                  onDownloadPdf={editing?._id ? (id) => downloadPdf(id, editing.invoiceNo) : undefined}
                />
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {viewingInv && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-0 sm:p-4 z-[999999]">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-[95vw] 2xl:max-w-[1600px] h-full sm:h-[96vh] overflow-hidden flex flex-col border-0 sm:border border-slate-200">
            <div className="flex items-start justify-between gap-4 p-4 sm:p-5 border-b bg-slate-50 shrink-0 no-print">
              <div className="min-w-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Preview</h3>
                  <span className="badge badge-navy font-mono text-[10px] sm:text-xs px-2 py-0.5">{viewingInv.invoiceNo}</span>
                </div>
                <div className="flex items-center">
                  <span className={`badge uppercase text-[10px] sm:text-xs px-2 py-0.5 ${STATUS_COLORS[viewingInv.status] || 'badge-gray'}`}>{viewingInv.status}</span>
                </div>
              </div>
              <button type="button" onClick={() => setViewingInv(null)} className="p-2 sm:p-2.5 bg-white hover:bg-slate-100 rounded-xl shrink-0 border border-slate-200 shadow-sm transition-colors"><FiX size={18}/></button>
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
              onDownloadPdf={(id) => downloadPdf(id, viewingInv.invoiceNo)}
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

      {/* ── QUICK RECORD INSTALLMENT / PARTIAL PAYMENT MODAL ── */}
      {recordPaymentInvoice && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <FiDollarSign size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Record Installment Payment</h3>
                  <p className="text-xs text-slate-500 font-mono">Invoice #{recordPaymentInvoice.invoiceNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecordPaymentInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Financial Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Client:</span>
                <span className="font-bold text-slate-900">{recordPaymentInvoice.client?.name || 'N/A'}</span>
              </div>
              {recordPaymentInvoice.project?.title && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Project:</span>
                  <span className="font-semibold text-amber-800">{recordPaymentInvoice.project.title}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Invoiced:</span>
                <span className="font-bold text-slate-800">
                  {recordPaymentInvoice.currency || 'LKR'} {Number(recordPaymentInvoice.total || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-bold text-emerald-600">
                  {recordPaymentInvoice.currency || 'LKR'} {Number(recordPaymentInvoice.totalPaid || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1.5 text-sm">
                <span className="font-bold text-rose-700">Remaining Balance Due:</span>
                <span className="font-extrabold text-rose-700">
                  {recordPaymentInvoice.currency || 'LKR'}{' '}
                  {(
                    typeof recordPaymentInvoice.remainingBalance === 'number'
                      ? recordPaymentInvoice.remainingBalance
                      : Math.max(0, Number(recordPaymentInvoice.total || 0) - Number(recordPaymentInvoice.totalPaid || 0))
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
                  toast.error('Please enter a valid payment amount')
                  return
                }
                directRecordPaymentMutation.mutate({
                  invoiceId: recordPaymentInvoice._id,
                  data: {
                    amount: Number(paymentForm.amount),
                    date: paymentForm.date || new Date(),
                    method: paymentForm.method,
                    bankAccount: paymentForm.bankAccount || undefined,
                    reference: paymentForm.reference,
                    notes: paymentForm.notes,
                  },
                })
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Payment Amount (LKR) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const rem = typeof recordPaymentInvoice.remainingBalance === 'number'
                        ? recordPaymentInvoice.remainingBalance
                        : Math.max(0, Number(recordPaymentInvoice.total || 0) - Number(recordPaymentInvoice.totalPaid || 0))
                      setPaymentForm({ ...paymentForm, amount: rem })
                    }}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="e.g. 25000"
                  className="form-input text-sm font-bold text-slate-900 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="form-input text-xs w-full"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-600 block mb-1">Payment Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="form-select text-xs w-full"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>

              {['bank_transfer', 'cheque'].includes(paymentForm.method) && banks.length > 0 && (
                <div>
                  <label className="font-medium text-slate-600 block mb-1">Deposit To Bank Account</label>
                  <select
                    value={paymentForm.bankAccount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankAccount: e.target.value })}
                    className="form-select text-xs w-full"
                  >
                    <option value="">Select Bank Account...</option>
                    {banks.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.bankName} - {b.accountNumber} ({b.accountName || b.branchName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-medium text-slate-600 block mb-1">Cheque / Reference Number (optional)</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="e.g. CHQ-89421 or Bank Txn ID"
                  className="form-input text-xs w-full"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">Payment Notes / Description</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="e.g. 1st installment for foundation work"
                  className="form-input text-xs w-full"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setRecordPaymentInvoice(null)}
                  className="btn-ghost btn-sm text-xs px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directRecordPaymentMutation.isPending}
                  className="btn-primary btn-sm text-xs px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <FiCheck size={14} />
                  <span>{directRecordPaymentMutation.isPending ? 'Recording...' : 'Record Payment & Issue Receipt'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── PAYMENT RECEIPT MODAL (AUTO OPENS AFTER RECORDING PAYMENT) ── */}
      {receiptPayment && receiptInvoice && (
        <PaymentReceiptModal
          isOpen={Boolean(receiptPayment && receiptInvoice)}
          onClose={() => {
            setReceiptPayment(null)
            setReceiptInvoice(null)
          }}
          invoice={receiptInvoice}
          payment={receiptPayment}
          siteSettings={siteSettings}
        />
      )}

      <PasswordConfirmModal
        open={Boolean(deletePending)}
        onClose={() => setDeletePending(null)}
        title="Delete invoice?"
        message={
          deletePending
            ? `This permanently removes ${deletePending.invoiceNo} and reverses linked bank deposits. Enter your admin password to confirm.`
            : ''
        }
        confirmLabel="Delete invoice"
        isSubmitting={deleteMut.isPending}
        onConfirm={async (password) => {
          if (!deletePending) return
          await deleteMut.mutateAsync({ id: deletePending._id, password })
        }}
      />
    </div>
  )
}
