import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiFileText, FiPrinter, FiEdit2, FiTrash2, FiSearch, FiDownload, FiClock } from 'react-icons/fi'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { mediaUrl } from '../../lib/media'
import { openAgreementPrint, downloadAgreementPdf } from '../../lib/agreementPrint'
import SignaturePad from '../../components/admin/SignaturePad'

const AGREEMENT_TYPES = [
  { value: 'client_project', label: 'Client Project Agreement' },
  { value: 'subscription_service', label: 'Subscription Service Agreement' },
  { value: 'invoice_payment', label: 'Invoice Payment Agreement' },
  { value: 'general', label: 'General Agreement' },
  { value: 'custom', label: 'Custom Agreement (blank shell)' },
]

const EMPTY_SIG = () => ({
  provider: { data: '', signerName: '' },
  client: { data: '', signerName: '' },
  witness: { name: '', data: '' },
})

export default function Agreements() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)

  const initialProject = searchParams.get('project') || ''
  const initialClient = searchParams.get('client') || ''
  const shouldOpenNew = searchParams.get('new') === 'true'

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      agreementType: 'general',
      client: initialClient,
      project: initialProject,
      invoice: '',
      subscription: '',
      title: '',
      agreementDate: new Date().toISOString().split('T')[0],
    },
  })

  const [editorContent, setEditorContent] = useState('')
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState('')
  const [signatures, setSignatures] = useState(EMPTY_SIG())
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['agreements'],
    queryFn: () => api.get('/agreements').then((r) => r.data),
  })
  const { data: templatesRes } = useQuery({
    queryKey: ['agreement-templates'],
    queryFn: () => api.get('/agreements/templates').then((r) => r.data),
  })
  const { data: siteData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.get('/site-settings').then((r) => r.data),
  })
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: () => api.get('/auth/users').then((r) => r.data) })
  const { data: projectsData } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then((r) => r.data) })
  const { data: invoicesData } = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/invoices').then((r) => r.data) })

  const site = siteData?.settings || {}
  const templates = templatesRes?.templates || []
  const agreements = (data?.agreements || []).filter(
    (a) =>
      !search ||
      a.title?.toLowerCase().includes(search.toLowerCase()) ||
      a.agreementNo?.toLowerCase().includes(search.toLowerCase())
  )
  const clients = (clientsData?.users || []).filter((u) => u.role === 'client')
  const projects = projectsData?.projects || []
  const invoices = invoicesData?.invoices || []

  const printOpts = (agr, html) => ({
    siteName: site.siteName,
    logoUrl: site.logoUrl ? mediaUrl(site.logoUrl) : '',
    address: site.contactAddress,
    phone: site.contactPhone,
    email: site.contactEmail,
    title: agr?.title || watch('title'),
    agreementNo: agr?.agreementNo || '—',
    agreementDate: (() => {
      const d = agr?.agreementDate || (watch('agreementDate') ? new Date(watch('agreementDate')) : null)
      return d ? new Date(d).toLocaleDateString('en-LK') : new Date().toLocaleDateString('en-LK')
    })(),
    bodyHtml: html,
    signatures: agr?.signatures || signatures,
  })

  const generatePreviewMut = useMutation({
    mutationFn: (d) => api.post('/agreements/generate-preview', d),
    onSuccess: (res) => {
      setEditorContent(res.data.content)
      setStep(2)
    },
    onError: () => toast.error('Failed to generate preview'),
  })

  const createMut = useMutation({
    mutationFn: (d) => api.post('/agreements', { ...d, content: editorContent, signatures }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement created')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/agreements/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement updated')
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }) => api.put(`/agreements/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Status updated')
    },
  })

  const updateApprovalMut = useMutation({
    mutationFn: ({ id, approvalStatus }) => api.put(`/agreements/${id}`, { approvalStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Approval updated')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/agreements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] })
      toast.success('Agreement deleted')
    },
  })

  const createTplMut = useMutation({
    mutationFn: (body) => api.post('/agreements/templates', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreement-templates'] })
      toast.success('Template saved')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save template'),
  })

  const deleteTplMut = useMutation({
    mutationFn: (id) => api.delete(`/agreements/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreement-templates'] })
      toast.success('Template removed')
    },
  })

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setStep(1)
    setEditorContent('')
    setSignatures(EMPTY_SIG())
    setSelectedTemplateId('')
    reset({
      agreementType: 'general',
      client: '',
      project: '',
      invoice: '',
      subscription: '',
      title: '',
      agreementDate: new Date().toISOString().split('T')[0],
    })
  }

  const openCreate = () => {
    reset({
      agreementType: 'general',
      client: '',
      project: '',
      invoice: '',
      subscription: '',
      title: '',
      agreementDate: new Date().toISOString().split('T')[0],
    })
    setEditorContent('')
    setSignatures(EMPTY_SIG())
    setStep(1)
    setEditing(null)
    setShowModal(true)
  }

  const openEdit = (agr) => {
    setEditing(agr)
    setValue('agreementType', agr.agreementType)
    setValue('title', agr.title)
    setValue('client', agr.client?._id || '')
    setValue('project', agr.project?._id || '')
    setValue('invoice', agr.invoice?._id || '')
    setValue('agreementDate', agr.agreementDate ? new Date(agr.agreementDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    setEditorContent(agr.content || '')
    setSignatures(
      agr.signatures
        ? {
            provider: { data: agr.signatures.provider?.data || '', signerName: agr.signatures.provider?.signerName || '' },
            client: { data: agr.signatures.client?.data || '', signerName: agr.signatures.client?.signerName || '' },
            witness: { name: agr.signatures.witness?.name || '', data: agr.signatures.witness?.data || '' },
          }
        : EMPTY_SIG()
    )
    setStep(2)
    setShowModal(true)
  }

  const handleGenerateClick = (data) => {
    if (!data.title) return toast.error('Please enter an agreement title')
    generatePreviewMut.mutate(data)
  }

  const handleSave = (data) => {
    const payload = { ...data, content: editorContent, signatures }
    editing ? updateMut.mutate({ id: editing._id, data: payload }) : createMut.mutate(payload)
  }

  const handlePrintAgreement = (agr) => {
    openAgreementPrint(printOpts(agr, agr.content))
  }

  const handlePdfAgreement = async (agr) => {
    try {
      await downloadAgreementPdf(printOpts(agr, agr.content), agr.agreementNo || 'agreement')
      toast.success('PDF downloaded')
    } catch {
      toast.error('PDF export failed')
    }
  }

  const loadTemplateIntoEditor = (id) => {
    if (!id) return
    const t = templates.find((x) => x._id === id)
    if (!t) return
    setEditorContent(t.content || '')
    setValue('agreementType', t.agreementType || 'custom')
    setStep(2)
    toast.success(`Loaded template: ${t.name}`)
  }

  const saveCurrentAsTemplate = () => {
    const name = window.prompt('Template name')
    if (!name || !name.trim()) return
    createTplMut.mutate({ name: name.trim(), content: editorContent, agreementType: watch('agreementType') })
  }

  const type = watch('agreementType')
  const clientVal = watch('client')
  const projectVal = watch('project')
  const invoiceVal = watch('invoice')

  useEffect(() => {
    if (shouldOpenNew) {
      setShowModal(true)
      if (initialProject) setValue('agreementType', 'client_project')
    }
  }, [shouldOpenNew, initialProject, setValue])

  useEffect(() => {
    if (step === 1 && !editing) {
      const cName = clients.find((c) => c._id === clientVal)?.name || ''
      const pName = projects.find((p) => p._id === projectVal)?.title || ''
      const iNo = invoices.find((i) => i._id === invoiceVal)?.invoiceNo || ''

      let t = ''
      if (type === 'client_project' && pName) t = `Project Agreement: ${pName}`
      else if (type === 'invoice_payment' && iNo) t = `Payment Agreement: ${iNo}`
      else if (cName) t = `Agreement with ${cName}`
      if (t) setValue('title', t)
    }
  }, [type, clientVal, projectVal, invoiceVal, step, editing, clients, projects, invoices, setValue])

  const approvalBadge = (s) => {
    const map = {
      none: 'bg-slate-100 text-slate-600',
      pending: 'bg-amber-100 text-amber-900',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return map[s] || map.none
  }

  return (
    <div className="erp-module space-y-6 animate-fade-in pb-10">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agreements</h1>
          <p className="page-subtitle">Corporate agreements, templates, signatures, and approvals</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <FiPlus size={15} /> New agreement
        </button>
      </div>

      <div className="relative filter-toolbar max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agreements…"
          className="form-input pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" />
        </div>
      ) : agreements.length === 0 ? (
        <div className="card card-body text-center py-20 border-dashed">
          <FiFileText size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 mb-4">No agreements found.</p>
          <button type="button" onClick={openCreate} className="btn-primary btn-sm mx-auto">
            Create first agreement
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Agreement</th>
                <th>Linked</th>
                <th>Document</th>
                <th>Approval</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((agr) => (
                <tr key={agr._id}>
                  <td>
                    <p className="font-semibold text-slate-800">{agr.title}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {agr.agreementNo} · {AGREEMENT_TYPES.find((t) => t.value === agr.agreementType)?.label || agr.agreementType}
                    </p>
                  </td>
                  <td className="text-sm text-slate-600">
                    {agr.client && <p>Client: {agr.client.name}</p>}
                    {agr.project && <p className="text-xs text-slate-500 truncate max-w-[200px]">Project: {agr.project.title}</p>}
                    {agr.invoice && <p className="text-xs text-slate-500">Invoice: {agr.invoice.invoiceNo}</p>}
                    {!agr.client && !agr.project && !agr.invoice && <span className="text-slate-400">—</span>}
                  </td>
                  <td>
                    <select
                      value={agr.status}
                      onChange={(e) => updateStatusMut.mutate({ id: agr._id, status: e.target.value })}
                      className="form-select text-xs py-1.5 min-w-[8.5rem]"
                    >
                      <option value="draft">Draft</option>
                      <option value="finalised">Finalised</option>
                      <option value="signed">Signed</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={agr.approvalStatus || 'none'}
                      onChange={(e) => updateApprovalMut.mutate({ id: agr._id, approvalStatus: e.target.value })}
                      className={`form-select text-xs py-1.5 min-w-[8.5rem] font-semibold border-0 ${approvalBadge(agr.approvalStatus || 'none')}`}
                    >
                      <option value="none">None</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="text-slate-600 whitespace-nowrap text-sm">{new Date(agr.createdAt).toLocaleDateString('en-LK')}</td>
                  <td className="text-right">
                    <div className="flex justify-end flex-wrap gap-1">
                      <button
                        type="button"
                        title="History"
                        onClick={() => setHistoryFor(agr)}
                        className="p-2 text-slate-400 hover:text-secondary hover:bg-blue-50 rounded-lg"
                      >
                        <FiClock size={14} />
                      </button>
                      <button
                        type="button"
                        title="Print"
                        onClick={() => handlePrintAgreement(agr)}
                        className="p-2 text-slate-400 hover:text-secondary hover:bg-blue-50 rounded-lg"
                      >
                        <FiPrinter size={14} />
                      </button>
                      <button
                        type="button"
                        title="PDF"
                        onClick={() => handlePdfAgreement(agr)}
                        className="p-2 text-slate-400 hover:text-secondary hover:bg-blue-50 rounded-lg"
                      >
                        <FiDownload size={14} />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEdit(agr)}
                        className="p-2 text-slate-400 hover:text-secondary hover:bg-blue-50 rounded-lg"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => {
                          if (window.confirm('Delete agreement?')) deleteMut.mutate(agr._id)
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyFor && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[999999]" onClick={() => setHistoryFor(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-primary">Agreement history</h3>
              <button type="button" onClick={() => setHistoryFor(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <FiX size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar text-sm space-y-3">
              {(historyFor.history || []).length === 0 ? (
                <p className="text-slate-400">No history entries yet.</p>
              ) : (
                [...(historyFor.history || [])].reverse().map((h, i) => (
                  <div key={`${h.at}-${i}`} className="border border-slate-100 rounded-xl p-3 bg-slate-50/80">
                    <p className="text-xs text-slate-400">{h.at ? new Date(h.at).toLocaleString('en-LK') : ''}</p>
                    <p className="font-semibold text-slate-700 capitalize">{h.action}</p>
                    {h.detail && <p className="text-slate-600 mt-1">{h.detail}</p>}
                    {h.user?.name && <p className="text-xs text-slate-500 mt-1">By {h.user.name}</p>}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex justify-end z-[999999]" onClick={closeModal}>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="bg-white w-full max-w-5xl h-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h2 className="text-xl font-bold font-heading text-slate-800">{editing ? 'Edit agreement' : 'New agreement'}</h2>
                <p className="text-sm text-slate-500">{step === 1 ? 'Step 1: Type & records' : 'Step 2: Document & signatures'}</p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-lg">
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="agr-form" onSubmit={handleSubmit(step === 1 && !editing ? handleGenerateClick : handleSave)} className="space-y-6">
                {step === 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
                    <div>
                      <label className="form-label">Agreement type</label>
                      <select {...register('agreementType')} className="form-select">
                        {AGREEMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="card card-body space-y-3 border-slate-200">
                      <p className="text-sm font-semibold text-slate-700">Saved templates</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          className="form-select flex-1"
                          value={selectedTemplateId}
                          onChange={(e) => {
                            setSelectedTemplateId(e.target.value)
                            loadTemplateIntoEditor(e.target.value)
                          }}
                        >
                          <option value="">Load a template…</option>
                          {templates.map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        {selectedTemplateId && (
                          <button
                            type="button"
                            className="btn-ghost border border-slate-200 text-sm whitespace-nowrap"
                            onClick={() => {
                              if (window.confirm('Delete this template?')) {
                                deleteTplMut.mutate(selectedTemplateId, {
                                  onSuccess: () => setSelectedTemplateId(''),
                                })
                              }
                            }}
                          >
                            Delete template
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="card card-body space-y-4 border-slate-200">
                      <h4 className="text-sm font-bold text-slate-700">Link records (auto-fills tokens)</h4>
                      <div>
                        <label className="form-label">Client</label>
                        <select {...register('client')} className="form-select">
                          <option value="">Select client…</option>
                          {clients.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {type === 'client_project' && (
                        <div>
                          <label className="form-label">Project</label>
                          <select {...register('project')} className="form-select">
                            <option value="">Select project…</option>
                            {projects.filter((p) => !clientVal || p.client?._id === clientVal).map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {type === 'invoice_payment' && (
                        <div>
                          <label className="form-label">Invoice</label>
                          <select {...register('invoice')} className="form-select">
                            <option value="">Select invoice…</option>
                            {invoices.filter((i) => !clientVal || i.client?._id === clientVal).map((i) => (
                              <option key={i._id} value={i._id}>
                                {i.invoiceNo} — LKR {i.total}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Title *</label>
                        <input {...register('title')} className="form-input" placeholder="e.g. Service agreement" />
                      </div>
                      <div>
                        <label className="form-label">Agreement date</label>
                        <input type="date" {...register('agreementDate')} className="form-input" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col xl:flex-row gap-6 min-h-[50vh]">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-800">{watch('title')}</h4>
                        <div className="flex flex-wrap gap-2">
                          {editing && <span className="badge badge-blue">Editing</span>}
                          <button type="button" className="btn-ghost border border-slate-200 text-xs" onClick={saveCurrentAsTemplate}>
                            Save as template
                          </button>
                          <button
                            type="button"
                            className="btn-ghost border border-slate-200 text-xs"
                            onClick={() => openAgreementPrint(printOpts(editing, editorContent))}
                          >
                            <FiPrinter size={13} /> Print
                          </button>
                          <button
                            type="button"
                            className="btn-ghost border border-slate-200 text-xs"
                            onClick={async () => {
                              try {
                                await downloadAgreementPdf(printOpts(editing, editorContent), editing?.agreementNo || 'agreement')
                                toast.success('PDF downloaded')
                              } catch {
                                toast.error('PDF failed')
                              }
                            }}
                          >
                            <FiDownload size={13} /> PDF
                          </button>
                        </div>
                      </div>
                      <div className="border rounded-xl overflow-hidden flex-1 flex flex-col bg-white min-h-[320px]">
                        <ReactQuill
                          theme="snow"
                          value={editorContent}
                          onChange={setEditorContent}
                          className="flex-1 agreement-quill"
                          modules={{
                            toolbar: [
                              [{ header: [1, 2, 3, false] }],
                              ['bold', 'italic', 'underline', 'strike'],
                              [{ list: 'ordered' }, { list: 'bullet' }],
                              ['link'],
                              ['clean'],
                            ],
                          }}
                        />
                      </div>
                    </div>

                    <div className="w-full xl:w-80 shrink-0 space-y-4 border border-slate-200 rounded-xl p-4 bg-slate-50/80">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Digital signatures</p>
                      <input
                        className="form-input text-sm"
                        placeholder="Provider signatory name"
                        value={signatures.provider.signerName}
                        onChange={(e) => setSignatures((s) => ({ ...s, provider: { ...s.provider, signerName: e.target.value } }))}
                      />
                      <SignaturePad
                        label="Provider"
                        value={signatures.provider.data}
                        onChange={(data) => setSignatures((s) => ({ ...s, provider: { ...s.provider, data } }))}
                      />
                      <input
                        className="form-input text-sm"
                        placeholder="Client signatory name"
                        value={signatures.client.signerName}
                        onChange={(e) => setSignatures((s) => ({ ...s, client: { ...s.client, signerName: e.target.value } }))}
                      />
                      <SignaturePad
                        label="Client"
                        value={signatures.client.data}
                        onChange={(data) => setSignatures((s) => ({ ...s, client: { ...s.client, data } }))}
                      />
                      <input
                        className="form-input text-sm"
                        placeholder="Witness name (optional)"
                        value={signatures.witness.name}
                        onChange={(e) => setSignatures((s) => ({ ...s, witness: { ...s.witness, name: e.target.value } }))}
                      />
                      <SignaturePad
                        label="Witness (optional)"
                        value={signatures.witness.data}
                        onChange={(data) => setSignatures((s) => ({ ...s, witness: { ...s.witness, data } }))}
                      />
                    </div>
                  </motion.div>
                )}
              </form>
            </div>

            <div className="p-6 border-t bg-slate-50 shrink-0 flex gap-3 flex-wrap">
              {step === 2 && !editing && (
                <button type="button" onClick={() => setStep(1)} className="btn-outline px-6">
                  Back
                </button>
              )}
              <div className="flex-1" />
              <button type="button" onClick={closeModal} className="btn-ghost">
                Cancel
              </button>
              <button
                type="submit"
                form="agr-form"
                disabled={generatePreviewMut.isPending || createMut.isPending || updateMut.isPending}
                className="btn-primary px-8"
              >
                {generatePreviewMut.isPending || createMut.isPending || updateMut.isPending ? (
                  <span className="spinner" />
                ) : step === 1 && !editing ? (
                  'Generate document'
                ) : (
                  'Save agreement'
                )}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}
