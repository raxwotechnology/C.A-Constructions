import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import api from '../../lib/api'
import { assignableEmployeesUrl } from '../../lib/employeeApi'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiX,
  FiFileText,
  FiPrinter,
  FiEye,
  FiEdit2,
  FiCheck,
  FiDownload,
  FiMail,
  FiBriefcase,
  FiBookOpen,
  FiLayers,
  FiClock,
  FiLogOut,
  FiCheckCircle,
  FiAward,
  FiDollarSign,
  FiShield,
  FiEdit3,
  FiBookmark,
  FiCode,
  FiChevronDown,
  FiTrash2,
} from 'react-icons/fi'
import { absoluteMediaUrl } from '../../lib/media'
import { buildCompanyFromSettings, companyContactLines } from '../../lib/companyBranding'
import { useSiteBranding } from '../../hooks/useSiteBranding'
import { openLetterPrint, downloadLetterPdf } from '../../lib/letterDocument'
import SignaturePad from '../../components/admin/SignaturePad'
import DocumentAssetPicker from '../../components/branding/DocumentAssetPicker'
import PasswordConfirmModal from '../../components/admin/PasswordConfirmModal'
import EnterpriseLetterBuilder from '../../components/admin/EnterpriseLetterBuilder'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { lookupLoaders } from '../../lib/lookupApi'

const LETTER_TYPES = [
  { value: 'offer', label: 'Offer letter', Icon: FiMail, accent: 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40' },
  { value: 'appointment', label: 'Appointment', Icon: FiBriefcase, accent: 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40' },
  { value: 'internship', label: 'Internship', Icon: FiBookOpen, accent: 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/40' },
  { value: 'contract', label: 'Contract', Icon: FiLayers, accent: 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40' },
  { value: 'part_time', label: 'Part-time', Icon: FiClock, accent: 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/80' },
  { value: 'resignation', label: 'Resignation acceptance', Icon: FiLogOut, accent: 'border-slate-200 hover:border-red-200 hover:bg-red-50/30' },
  { value: 'confirmation', label: 'Confirmation', Icon: FiCheckCircle, accent: 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40' },
  { value: 'experience', label: 'Experience', Icon: FiAward, accent: 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40' },
  { value: 'salary', label: 'Salary confirmation', Icon: FiDollarSign, accent: 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40' },
  { value: 'service_agreement', label: 'Service agreement', Icon: FiShield, accent: 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40' },
  { value: 'custom', label: 'Custom letter', Icon: FiEdit3, accent: 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/80' },
]

const TYPE_MAP = Object.fromEntries(LETTER_TYPES.map((t) => [t.value, t]))

function isHtmlContent(s) {
  return typeof s === 'string' && /^\s*</.test(s)
}

const LETTER_QUILL_FORMATS = ['bold', 'italic', 'underline', 'strike', 'size', 'font', 'color', 'background', 'align', 'list', 'blockquote', 'link', 'indent']

export default function AdminLetters() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [preview, setPreview] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [letterEditHtmlSource, setLetterEditHtmlSource] = useState(false)
  const [prefilledType, setPrefilledType] = useState('')
  const [signatures, setSignatures] = useState({
    hr: { data: '', name: '', title: 'Human Resources' },
    manager: { data: '', name: '', title: 'Line Manager' },
    seal: { data: '' }
  })
  const [selectedTplId, setSelectedTplId] = useState('')
  const [showLetterTemplates, setShowLetterTemplates] = useState(false)
  const [tplPwdOpen, setTplPwdOpen] = useState(false)
  const [letterPwdOpen, setLetterPwdOpen] = useState(false)
  const [letterDeleteId, setLetterDeleteId] = useState(null)
  
  const [showBuilder, setShowBuilder] = useState(false)
  const [builderEmployee, setBuilderEmployee] = useState(null)
  const [builderInitialData, setBuilderInitialData] = useState(null)

  const { register, handleSubmit, reset, watch, setValue } = useForm()
  const selectedType = watch('type')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-letters'],
    queryFn: () => api.get('/letters').then((r) => r.data),
  })
  const { data: tplData } = useQuery({
    queryKey: ['letter-templates'],
    queryFn: () => api.get('/letters/templates').then((r) => r.data),
  })
  const { data: empData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get(assignableEmployeesUrl()).then((r) => r.data),
  })
  const { settings: siteSettings } = useSiteBranding()

  const company = useMemo(() => {
    const co = buildCompanyFromSettings(siteSettings)
    return {
      ...co,
      logo: co.logoPath || co.logo ? absoluteMediaUrl(co.logoPath || co.logo) : '',
      footer: co.footer || co.address || '',
    }
  }, [siteSettings])

  const letterQuillModules = useMemo(
    () => ({
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ size: ['small', false, 'large', 'huge'] }],
        [{ font: [] }],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link', 'clean'],
      ],
    }),
    []
  )

  const generateMut = useMutation({
    mutationFn: (d) => api.post('/letters/generate', d),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admin-letters'] })
      toast.success('Letter generated')
      const letter = r.data.letter
      setPreview(letter)
      setEditContent(letter.content)
      setSignatures({
        hr: { data: letter.signatures?.hr?.data || '', name: letter.signatures?.hr?.name || '', title: letter.signatures?.hr?.title || 'Human Resources' },
        manager: {
          data: letter.signatures?.manager?.data || '',
          name: letter.signatures?.manager?.name || '',
          title: letter.signatures?.manager?.title || 'Line Manager',
        },
        seal: { data: letter.signatures?.seal?.data || '' }
      })
      setEditMode(false)
      setLetterEditHtmlSource(false)
      closeModal()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to generate'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/letters/${id}`, payload).then((r) => r.data),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admin-letters'] })
      const letter = r.letter
      setPreview(letter)
      setEditContent(letter.content)
      setSignatures({
        hr: { data: letter.signatures?.hr?.data || '', name: letter.signatures?.hr?.name || '', title: letter.signatures?.hr?.title || 'Human Resources' },
        manager: {
          data: letter.signatures?.manager?.data || '',
          name: letter.signatures?.manager?.name || '',
          title: letter.signatures?.manager?.title || 'Line Manager',
        },
        seal: { data: letter.signatures?.seal?.data || '' }
      })
      setEditMode(false)
      setLetterEditHtmlSource(false)
      toast.success('Letter saved')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const approvalMut = useMutation({
    mutationFn: ({ id, approvalStatus }) => api.put(`/letters/${id}`, { approvalStatus }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-letters'] })
      toast.success('Approval status updated')
    },
  })

  const saveTplMut = useMutation({
    mutationFn: (body) => api.post('/letters/templates', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letter-templates'] })
      toast.success('Template saved')
    },
  })

  const delTplMut = useMutation({
    mutationFn: ({ id, password }) => api.delete(`/letters/templates/${id}`, { data: { password } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letter-templates'] })
      setSelectedTplId('')
      toast.success('Template removed')
    },
  })

  const delLetterMut = useMutation({
    mutationFn: ({ id, password }) => api.delete(`/letters/${id}`, { data: { password } }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin-letters'] })
      qc.invalidateQueries({ queryKey: ['my-letters'] })
      setLetterPwdOpen(false)
      setLetterDeleteId(null)
      setPreview((prev) => (prev && v?.id && prev._id === v.id ? null : prev))
      toast.success('Letter deleted')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not delete letter'),
  })

  const onSubmit = (d) => {
    if (d.type === 'custom') {
      const emp = (empData?.employees || []).find(e => e._id === d.employeeId)
      setBuilderEmployee(emp)
      
      let initData = null
      if (selectedTplId) {
        const t = templates.find((x) => x._id === selectedTplId)
        if (t) {
          initData = {
            title: t.name,
            content: t.content,
            structuredData: t.structuredData,
            type: 'custom'
          }
        }
      }
      
      setBuilderInitialData(initData) // New custom letter
      setShowModal(false)
      setShowBuilder(true)
      return
    }

    generateMut.mutate({
      employeeId: d.employeeId,
      type: d.type,
      approvalStatus: d.approvalStatus || 'none',
      data: {
        startDate: d.startDate,
        endDate: d.endDate,
        confirmationDate: d.confirmationDate,
        resignationDate: d.resignationDate,
        noticePeriod: d.noticePeriod,
        purpose: d.purpose,
        scope: d.scope,
        duration: d.duration,
        supervisor: d.supervisor,
        workingHours: d.workingHours,
        workingDays: d.workingDays,
        hourlyRate: d.hourlyRate,
        reportingManager: d.reportingManager,
      },
    })
  }

  const openModal = (type = '') => {
    setPrefilledType(type)
    reset({ type: type || '', approvalStatus: 'none' })
    setSelectedTplId('')
    setShowLetterTemplates(false)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setPrefilledType('')
    setShowLetterTemplates(false)
    reset()
  }

  const openPreview = (l) => {
    setPreview(l)
    setEditContent(l.content)
    setEditMode(false)
    setLetterEditHtmlSource(false)
    setSignatures({
      hr: { data: l.signatures?.hr?.data || '', name: l.signatures?.hr?.name || '', title: l.signatures?.hr?.title || 'Human Resources' },
      manager: {
        data: l.signatures?.manager?.data || '',
        name: l.signatures?.manager?.name || '',
        title: l.signatures?.manager?.title || 'Line Manager',
      },
      seal: { data: l.signatures?.seal?.data || '' }
    })
  }

  const printOpts = (letter) => ({
    company,
    letterTitle: letter.title,
    letterRef: letter.letterRef,
    issuedDate: letter.issuedDate ? new Date(letter.issuedDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
    bodyHtml: editMode ? editContent : letter.content,
    signatures: letter.signatures || signatures,
  })

  const handlePrint = (letter) => {
    openLetterPrint({
      ...printOpts(letter),
      bodyHtml: letter.content,
      signatures: letter.signatures || signatures,
    })
  }

  const handlePdf = async (letter) => {
    try {
      await downloadLetterPdf(
        {
          ...printOpts(letter),
          bodyHtml: letter.content,
          signatures: letter.signatures || signatures,
        },
        letter.letterRef || 'letter'
      )
      toast.success('PDF downloaded')
    } catch {
      toast.error('PDF export failed')
    }
  }

  const letters = data?.letters || []
  const templates = tplData?.templates || []

  const loadTemplate = (id) => {
    if (!id) return
    const t = templates.find((x) => x._id === id)
    if (!t) return
    if (t.type) setValue('type', t.type)
    toast.success(`Loaded template: ${t.name}`)
  }

  if (showBuilder) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-slate-50 flex flex-col">
        <EnterpriseLetterBuilder 
          initialData={builderInitialData}
          employee={builderEmployee}
          company={company}
          employeesList={empData?.employees || []}
          letterTypesList={LETTER_TYPES}
          onSave={(payload) => {
             if (builderInitialData?._id) {
               updateMut.mutate({ id: builderInitialData._id, payload: { ...payload, type: payload.dbLetterType } })
             } else {
               generateMut.mutate({ 
                 employeeId: payload.dbEmployeeId || (builderEmployee ? builderEmployee._id : 'custom'), 
                 type: payload.dbLetterType || 'custom', 
                 approvalStatus: 'none', 
                 data: payload 
               })
             }
             setShowBuilder(false)
          }}
          onCancel={() => setShowBuilder(false)}
          isSaving={generateMut.isPending || updateMut.isPending}
        />
      </div>,
      document.body
    )
  }

  return (
    <div className="erp-module space-y-8 animate-fade-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Letter management</h1>
          <p className="page-subtitle">Corporate HR letters with branding, PDF export, signatures, and approvals</p>
        </div>
        <button type="button" onClick={() => openModal()} className="btn-primary gap-2">
          <FiPlus size={16} /> Generate letter
        </button>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Templates</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose a letter type — content is generated with company letterhead on print/PDF</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {LETTER_TYPES.map((lt) => {
            const Icon = lt.Icon
            return (
              <button
                key={lt.value}
                type="button"
                onClick={() => openModal(lt.value)}
                className={`finance-tx-card text-left p-4 border-2 transition-all group ${lt.accent}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shrink-0 group-hover:border-secondary/40">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-primary">{lt.label}</p>
                    <p className="text-[11px] text-slate-500 mt-1 capitalize">{lt.value.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="card card-body border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Issued letters</h2>
          <span className="text-xs text-slate-500">{letters.length} on file</span>
        </div>
        <div className="table-container border-0 shadow-none rounded-xl overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Issued</th>
                <th>Approval</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : letters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-slate-400">
                    <FiFileText size={40} className="mx-auto mb-2 opacity-25" />
                    No letters yet. Generate one from the templates above.
                  </td>
                </tr>
              ) : (
                letters.map((l) => (
                  <tr key={l._id}>
                    <td className="font-mono text-xs text-slate-600">{l.letterRef || '—'}</td>
                    <td>
                      <div className="font-medium text-slate-800">{l.employee?.userId?.name}</div>
                      <div className="text-xs text-slate-400">{l.employee?.employeeNo}</div>
                    </td>
                    <td>
                      <span className="badge badge-navy capitalize">{TYPE_MAP[l.type]?.label || l.type}</span>
                    </td>
                    <td className="text-sm text-slate-600 whitespace-nowrap">
                      {l.issuedDate ? new Date(l.issuedDate).toLocaleDateString('en-LK') : '—'}
                      <div className="text-xs text-slate-400">{l.issuedBy?.name}</div>
                    </td>
                    <td>
                      <select
                        className="form-select text-xs py-1.5 min-w-[7.5rem]"
                        value={l.approvalStatus || 'none'}
                        onChange={(e) => approvalMut.mutate({ id: l._id, approvalStatus: e.target.value })}
                      >
                        <option value="none">None</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                      </select>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-0.5">
                        <button type="button" title="Preview" onClick={() => openPreview(l)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <FiEye size={15} />
                        </button>
                        <button type="button" title="Print" onClick={() => handlePrint(l)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <FiPrinter size={15} />
                        </button>
                        <button type="button" title="PDF" onClick={() => handlePdf(l)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <FiDownload size={15} />
                        </button>
                        <button
                          type="button"
                          title="Delete letter"
                          onClick={() => {
                            setLetterDeleteId(l._id)
                            setLetterPwdOpen(true)
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-primary font-heading">Generate letter</h3>
                <button type="button" onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                {templates.length === 0 ? (
                  <p className="text-xs text-slate-400 px-0.5">
                    No saved letter templates yet. After you generate a letter, use &quot;Save template&quot; in the preview to store one here.
                  </p>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowLetterTemplates((v) => !v)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100/80 transition-colors"
                    >
                      <span>Optional: apply a saved letter template</span>
                      <FiChevronDown className={`shrink-0 text-slate-400 transition-transform ${showLetterTemplates ? 'rotate-180' : ''}`} size={18} />
                    </button>
                    {showLetterTemplates ? (
                      <div className="px-4 pb-4 pt-0 space-y-2 border-t border-slate-100 bg-white">
                        <p className="text-xs text-slate-500 pt-3 leading-relaxed">
                          Pick a template to set the letter type from your saved list. This does not paste full letter HTML into the form.
                        </p>
                        <div className="flex gap-2">
                          <select
                            className="form-select flex-1 text-sm"
                            value={selectedTplId}
                            onChange={(e) => {
                              setSelectedTplId(e.target.value)
                              loadTemplate(e.target.value)
                            }}
                          >
                            <option value="">Choose template…</option>
                            {templates.map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          {selectedTplId ? (
                            <button
                              type="button"
                              className="btn-ghost text-xs border border-slate-200 shrink-0 text-red-600 hover:bg-red-50"
                              onClick={() => setTplPwdOpen(true)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
                <div>
                  <label className="form-label">Employee *</label>
                  <SearchableSelect
                    value={watch('employeeId')}
                    onChange={(v) => setValue('employeeId', v, { shouldValidate: true })}
                    loadOptions={async (params) => {
                      const res = await lookupLoaders.employeesAll()(params)
                      if (params.page === 1) {
                        const customOpt = { value: 'custom', label: '-- External / Custom (No Employee) --' }
                        if (!params.search || customOpt.label.toLowerCase().includes(params.search.toLowerCase()) || 'custom'.includes(params.search.toLowerCase())) {
                          res.options.unshift(customOpt)
                        }
                      }
                      return res
                    }}
                    placeholder="Search employee…"
                  />
                </div>
                <div>
                  <label className="form-label">Letter type *</label>
                  <SearchableSelect
                    value={selectedType}
                    onChange={(v) => setValue('type', v, { shouldValidate: true })}
                    loadOptions={async ({ search }) => {
                      const q = (search || '').toLowerCase()
                      const options = LETTER_TYPES
                        .filter(lt => lt.label.toLowerCase().includes(q) || lt.value.includes(q))
                        .map(lt => ({ value: lt.value, label: lt.label }))
                      return { options, hasMore: false }
                    }}
                    placeholder="Search type…"
                  />
                </div>
                <div>
                  <label className="form-label">Approval before issue (optional)</label>
                  <select {...register('approvalStatus')} className="form-select">
                    <option value="none">None — issue immediately</option>
                    <option value="pending">Mark as pending HR approval</option>
                    <option value="approved">Mark as approved</option>
                  </select>
                </div>

                {(selectedType === 'offer' || selectedType === 'contract' || selectedType === 'part_time' || selectedType === 'internship') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Start date</label>
                      <input {...register('startDate')} type="date" className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">End date</label>
                      <input {...register('endDate')} type="date" className="form-input" />
                    </div>
                  </div>
                )}
                {selectedType === 'appointment' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">Reporting manager</label>
                        <input {...register('reportingManager')} className="form-input" placeholder="Name (overrides employee record)" />
                      </div>
                      <div>
                        <label className="form-label">Working hours</label>
                        <input {...register('workingHours')} className="form-input" placeholder="e.g. 9:00–17:30 Mon–Fri" />
                      </div>
                    </div>
                  </div>
                )}
                {selectedType === 'internship' && (
                  <>
                    <div>
                      <label className="form-label">Duration</label>
                      <input {...register('duration')} className="form-input" placeholder="e.g. 3 months" />
                    </div>
                    <div>
                      <label className="form-label">Supervisor</label>
                      <input {...register('supervisor')} className="form-input" placeholder="Supervisor / mentor" />
                    </div>
                  </>
                )}
                {selectedType === 'contract' && (
                  <div>
                    <label className="form-label">Notice period</label>
                    <input {...register('noticePeriod')} className="form-input" placeholder="e.g. 30 days" />
                  </div>
                )}
                {selectedType === 'part_time' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Hours / day</label>
                      <input {...register('workingHours')} className="form-input" placeholder="e.g. 4 hours" />
                    </div>
                    <div>
                      <label className="form-label">Days / week</label>
                      <input {...register('workingDays')} className="form-input" placeholder="e.g. Mon–Fri" />
                    </div>
                    <div className="col-span-2">
                      <label className="form-label">Hourly rate (LKR)</label>
                      <input {...register('hourlyRate')} className="form-input" placeholder="e.g. 500" />
                    </div>
                  </div>
                )}
                {selectedType === 'resignation' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Resignation date</label>
                      <input {...register('resignationDate')} type="date" className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">Last working date</label>
                      <input {...register('endDate')} type="date" className="form-input" />
                    </div>
                    <div className="col-span-2">
                      <label className="form-label">Notice period</label>
                      <input {...register('noticePeriod')} className="form-input" placeholder="e.g. 30 days" />
                    </div>
                  </div>
                )}
                {selectedType === 'experience' && (
                  <div>
                    <label className="form-label">Last working date</label>
                    <input {...register('endDate')} type="date" className="form-input" />
                  </div>
                )}
                {selectedType === 'confirmation' && (
                  <div>
                    <label className="form-label">Confirmation date</label>
                    <input {...register('confirmationDate')} type="date" className="form-input" />
                  </div>
                )}
                {selectedType === 'salary' && (
                  <div>
                    <label className="form-label">Purpose</label>
                    <input {...register('purpose')} className="form-input" placeholder="e.g. Bank loan" />
                  </div>
                )}
                {selectedType === 'service_agreement' && (
                  <div>
                    <div>
                      <label className="form-label">Start date</label>
                      <input {...register('startDate')} type="date" className="form-input" />
                    </div>
                    <div className="mt-3">
                      <label className="form-label">Scope of service</label>
                      <textarea {...register('scope')} rows={3} className="form-input resize-y min-h-[72px]" placeholder="Scope / responsibilities" />
                    </div>
                  </div>
                )}
                {/* 'custom' type form fields removed as it launches builder */}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center gap-2">
                    <FiChevronDown className="rotate-90" /> Back
                  </button>
                  <button type="submit" disabled={generateMut.isPending} className="btn-primary flex-1 justify-center">
                    {generateMut.isPending ? <span className="spinner" /> : 'Generate'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {preview &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] overflow-hidden flex flex-col"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b bg-slate-50 shrink-0">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-slate-500">{preview.letterRef}</p>
                  <h3 className="font-bold text-slate-900 truncate">{preview.title}</h3>
                  <span className="badge badge-navy text-[10px] mt-1 capitalize">{TYPE_MAP[preview.type]?.label || preview.type}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (preview.type === 'custom') {
                        setBuilderInitialData(preview)
                        setBuilderEmployee(preview.employee)
                        setPreview(null)
                        setShowBuilder(true)
                      } else {
                        setEditMode((m) => {
                          const next = !m
                          if (!next) setLetterEditHtmlSource(false)
                          return next
                        })
                      }
                    }}
                    className={`btn-outline btn-sm ${editMode ? 'border-amber-300 text-amber-700' : ''}`}
                  >
                    <FiEdit2 size={14} /> {preview.type === 'custom' ? 'Open Builder' : (editMode ? 'Done editing' : 'Edit letter')}
                  </button>
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => updateMut.mutate({ id: preview._id, payload: { content: editContent, title: preview.title, type: preview.type, signatures } })}
                      disabled={updateMut.isPending}
                      className="btn-primary btn-sm"
                    >
                      {updateMut.isPending ? <span className="spinner" /> : (
                        <>
                          <FiCheck size={14} /> Save
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt('Template name')
                      if (!name?.trim()) return
                      saveTplMut.mutate({ name: name.trim(), type: preview.type, content: editContent || preview.content })
                    }}
                    className="btn-ghost btn-sm border border-slate-200"
                  >
                    <FiBookmark size={14} /> Save template
                  </button>
                  <button type="button" onClick={() => handlePrint({ ...preview, content: editContent })} className="btn-primary btn-sm">
                    <FiPrinter size={14} /> Print
                  </button>
                  <button type="button" onClick={() => handlePdf({ ...preview, content: editContent })} className="btn-outline btn-sm">
                    <FiDownload size={14} /> PDF
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setPreview(null); setEditMode(false); setLetterEditHtmlSource(false) }} 
                    className="btn-ghost btn-sm gap-2 border border-slate-200 ml-1 hover:bg-slate-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 flex flex-col lg:flex-row min-h-0">
                <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-[#fafbfc] border-b lg:border-b-0 lg:border-r border-slate-200">
                  <div className="max-w-[720px] mx-auto bg-white shadow-sm border border-slate-200/80 rounded-lg p-8 sm:p-10 min-h-[400px]">
                    <div className="flex justify-between gap-4 border-b-2 border-primary/20 pb-5 mb-6">
                      <div className="flex gap-4 min-w-0">
                        {company.logo ? <img src={company.logo} alt="" className="h-14 object-contain shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-primary text-white flex items-center justify-center font-black text-xl shrink-0">{(company.name || 'R').charAt(0)}</div>}
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-primary leading-tight">{company.name}</p>
                          {company.tagline ? <p className="text-xs text-slate-500 mt-1 italic">{company.tagline}</p> : null}
                          <div className="text-xs text-slate-500 mt-2 leading-relaxed space-y-0.5 text-right">
                            {companyContactLines(company).map((l) => (
                              <p key={l.label}><span className="text-slate-400">{l.label}:</span> {l.text}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500 shrink-0 space-y-0.5">
                        <p>
                          <span className="text-slate-400">Ref</span> {preview.letterRef}
                        </p>
                        <p>
                          <span className="text-slate-400">Date</span>{' '}
                          {preview.issuedDate ? new Date(preview.issuedDate).toLocaleDateString('en-LK') : ''}
                        </p>
                      </div>
                    </div>
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-500 leading-snug max-w-xl">
                            Toolbar: <strong>bold</strong>, <u>underline</u>, font size, font family, text color, highlight. Tables from generated letters are easier to keep in{' '}
                            <span className="font-medium text-slate-700">raw HTML</span> mode.
                          </p>
                          <button
                            type="button"
                            onClick={() => setLetterEditHtmlSource((s) => !s)}
                            className={`btn-ghost btn-sm shrink-0 border ${letterEditHtmlSource ? 'border-emerald-200 text-emerald-800' : 'border-slate-200'}`}
                          >
                            <FiCode size={14} /> {letterEditHtmlSource ? 'Rich text' : 'Raw HTML'}
                          </button>
                        </div>
                        {letterEditHtmlSource ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={24}
                            spellCheck={false}
                            className="form-input font-mono text-xs leading-relaxed w-full"
                          />
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner">
                            <ReactQuill
                              key={`${preview._id}-quill`}
                              theme="snow"
                              value={editContent}
                              onChange={setEditContent}
                              className="letter-quill"
                              modules={letterQuillModules}
                              formats={LETTER_QUILL_FORMATS}
                            />
                          </div>
                        )}
                      </div>
                    ) : isHtmlContent(editContent) ? (
                      <div className="letter-pdf-prose text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: editContent }} />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{editContent}</pre>
                    )}
                  </div>
                </div>
                <aside className="w-full lg:w-72 shrink-0 p-4 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 space-y-4 overflow-y-auto max-h-[40vh] lg:max-h-none">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Signatures (print / PDF)</p>
                  <DocumentAssetPicker label="HR signature (upload or saved)" value={{ data: signatures.hr.data }} onChange={(v) => setSignatures((s) => ({ ...s, hr: { ...s.hr, data: v.data } }))} roleKey="hr" />
                  <input className="form-input text-xs" placeholder="HR signatory name" value={signatures.hr.name} onChange={(e) => setSignatures((s) => ({ ...s, hr: { ...s.hr, name: e.target.value } }))} />
                  <SignaturePad label="HR (draw)" value={signatures.hr.data} onChange={(data) => setSignatures((s) => ({ ...s, hr: { ...s.hr, data } }))} />
                  <DocumentAssetPicker label="Manager signature" value={{ data: signatures.manager.data }} onChange={(v) => setSignatures((s) => ({ ...s, manager: { ...s.manager, data: v.data } }))} roleKey="manager" />
                  <input className="form-input text-xs" placeholder="Manager name" value={signatures.manager.name} onChange={(e) => setSignatures((s) => ({ ...s, manager: { ...s.manager, name: e.target.value } }))} />
                  <SignaturePad label="Manager (draw)" value={signatures.manager.data} onChange={(data) => setSignatures((s) => ({ ...s, manager: { ...s.manager, data } }))} />
                  <DocumentAssetPicker label="Company seal" assetType="seal" value={{ data: signatures.seal?.data || '' }} onChange={(v) => setSignatures((s) => ({ ...s, seal: { data: v.data } }))} />
                  <button
                    type="button"
                    className="btn-primary w-full btn-sm justify-center"
                    onClick={() => updateMut.mutate({ id: preview._id, payload: { signatures } })}
                    disabled={updateMut.isPending}
                  >
                    Store signatures
                  </button>
                </aside>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      <PasswordConfirmModal
        open={tplPwdOpen}
        onClose={() => setTplPwdOpen(false)}
        title="Delete letter template"
        message="This permanently removes the saved template. Enter your account password to confirm."
        confirmLabel="Delete template"
        isSubmitting={delTplMut.isPending}
        onConfirm={async (password) => {
          if (!selectedTplId) return
          await delTplMut.mutateAsync({ id: selectedTplId, password })
        }}
      />

      <PasswordConfirmModal
        open={letterPwdOpen}
        onClose={() => {
          setLetterPwdOpen(false)
          setLetterDeleteId(null)
        }}
        title="Delete issued letter"
        message="This permanently removes the letter from HR records and employee “My letters”. Enter your account password to confirm."
        confirmLabel="Delete letter"
        isSubmitting={delLetterMut.isPending}
        onConfirm={async (password) => {
          if (!letterDeleteId) return
          await delLetterMut.mutateAsync({ id: letterDeleteId, password })
        }}
      />
    </div>
  )
}
