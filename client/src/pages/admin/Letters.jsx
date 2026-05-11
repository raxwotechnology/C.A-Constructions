import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiFileText, FiPrinter, FiEye, FiEdit2, FiCheck } from 'react-icons/fi'

const LETTER_TYPES = [
  { value: 'offer',            label: 'Offer Letter',                   color: 'badge-blue',   icon: '📋' },
  { value: 'appointment',      label: 'Appointment Letter',             color: 'badge-green',  icon: '📌' },
  { value: 'internship',       label: 'Internship Letter',              color: 'badge-purple', icon: '🎓' },
  { value: 'contract',         label: 'Contract Letter',                color: 'badge-yellow', icon: '📝' },
  { value: 'part_time',        label: 'Part-Time Letter',               color: 'badge-navy',   icon: '⏰' },
  { value: 'resignation',      label: 'Resignation Acceptance',         color: 'badge-red',    icon: '🚪' },
  { value: 'confirmation',     label: 'Confirmation Letter',            color: 'badge-green',  icon: '✅' },
  { value: 'experience',       label: 'Experience Letter',              color: 'badge-navy',   icon: '🏅' },
  { value: 'salary',           label: 'Salary Confirmation',            color: 'badge-yellow', icon: '💰' },
  { value: 'service_agreement',label: 'Service Agreement',              color: 'badge-blue',   icon: '🤝' },
  { value: 'custom',           label: 'Custom Letter',                  color: 'badge-gray',   icon: '✏️' },
]

const TYPE_MAP = Object.fromEntries(LETTER_TYPES.map(t => [t.value, t]))

export default function AdminLetters() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [preview, setPreview] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [prefilledType, setPrefilledType] = useState('')
  const { register, handleSubmit, reset, watch } = useForm()
  const selectedType = watch('type')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-letters'],
    queryFn: () => api.get('/letters').then(r => r.data),
  })
  const { data: empData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/employees').then(r => r.data),
  })
  const { data: companyData } = useQuery({
    queryKey: ['letter-company-info'],
    queryFn: () => api.get('/letters/company-info').then(r => r.data),
  })

  const company = companyData?.company || {}

  const generateMut = useMutation({
    mutationFn: d => api.post('/letters/generate', d),
    onSuccess: (r) => {
      qc.invalidateQueries(['admin-letters'])
      toast.success('Letter generated successfully')
      setPreview(r.data.letter)
      setEditContent(r.data.letter.content)
      setEditMode(false)
      closeModal()
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to generate'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/letters/${id}`, payload).then(r => r.data),
    onSuccess: (r) => {
      qc.invalidateQueries(['admin-letters'])
      setPreview(r.letter)
      setEditContent(r.letter.content)
      setEditMode(false)
      toast.success('Letter saved')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const onSubmit = d => generateMut.mutate({
    employeeId: d.employeeId,
    type: d.type,
    data: {
      startDate: d.startDate, endDate: d.endDate,
      confirmationDate: d.confirmationDate,
      resignationDate: d.resignationDate,
      noticePeriod: d.noticePeriod,
      purpose: d.purpose, scope: d.scope,
      duration: d.duration, supervisor: d.supervisor,
      workingHours: d.workingHours, workingDays: d.workingDays,
      hourlyRate: d.hourlyRate,
      letterTitle: d.letterTitle, customBody: d.customBody,
      signatoryTitle: d.signatoryTitle,
    },
  })

  const openModal = (type = '') => {
    setPrefilledType(type)
    reset({ type })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setPrefilledType('')
    reset()
  }

  const openPreview = (l) => {
    setPreview(l)
    setEditContent(l.content)
    setEditMode(false)
  }

  const printLetter = (l) => {
    const w = window.open('', '_blank')
    const logoHtml = company.logo
      ? `<img src="${company.logo}" style="height:60px;object-fit:contain;" alt="logo"/>`
      : `<div style="font-size:28px;font-weight:900;color:#0B1F3A;">${company.name || 'Raxwo Pvt Ltd'}</div>`

    w.document.write(`<!DOCTYPE html><html><head><title>${l.title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; max-width: 780px; margin: 40px auto; padding: 40px; color: #1a1a1a; line-height: 1.75; font-size: 13px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563EB; padding-bottom: 18px; margin-bottom: 28px; }
      .co-name { font-size: 22px; font-weight: 900; color: #0B1F3A; }
      .co-info { font-size: 11px; color: #555; line-height: 1.6; text-align: right; }
      .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 11px; color: #777; text-align: center; }
      pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 13px; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <div class="header">
      <div>${logoHtml}</div>
      <div class="co-info">
        <div style="font-weight:700;font-size:13px;">${company.name || ''}</div>
        ${company.address ? `<div>${company.address}</div>` : ''}
        ${company.email ? `<div>${company.email}</div>` : ''}
        ${company.phone ? `<div>${company.phone}</div>` : ''}
      </div>
    </div>
    <pre>${l.content}</pre>
    <div class="footer">${company.name || 'Raxwo Pvt Ltd'} &bull; ${company.address || ''} &bull; ${company.email || ''}</div>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.print() }, 400)
  }

  const letters = data?.letters || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Letter Generator</h1>
          <p className="page-subtitle">{letters.length} letters issued — {LETTER_TYPES.length} templates available</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary"><FiPlus size={15}/> Generate Letter</button>
      </div>

      {/* Letter type grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {LETTER_TYPES.map(lt => (
          <button key={lt.value} onClick={() => openModal(lt.value)}
            className="card p-4 text-center hover:border-secondary hover:shadow-md transition-all group">
            <div className="text-2xl mb-2">{lt.icon}</div>
            <p className="text-xs font-semibold text-gray-700 group-hover:text-secondary leading-tight">{lt.label}</p>
          </button>
        ))}
      </div>

      {/* Letters table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th><th>Letter Type</th><th>Issued By</th><th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : letters.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                <FiFileText size={36} className="mx-auto mb-2 opacity-30"/>No letters yet
              </td></tr>
            ) : letters.map(l => (
              <tr key={l._id}>
                <td>
                  <div className="font-medium text-gray-800">{l.employee?.userId?.name}</div>
                  <div className="text-xs text-gray-400">{l.employee?.employeeNo}</div>
                </td>
                <td>
                  <span className={`badge ${TYPE_MAP[l.type]?.color || 'badge-gray'} capitalize`}>
                    {TYPE_MAP[l.type]?.icon} {TYPE_MAP[l.type]?.label || l.type}
                  </span>
                </td>
                <td className="text-sm text-gray-600">{l.issuedBy?.name}</td>
                <td className="text-sm text-gray-500">{new Date(l.issuedDate).toLocaleDateString('en-LK')}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openPreview(l)} title="Preview" className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors">
                      <FiEye size={13}/>
                    </button>
                    <button onClick={() => printLetter(l)} title="Print" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <FiPrinter size={13}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-primary font-heading">Generate Letter</h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div><label className="form-label">Employee *</label>
                  <select {...register('employeeId', {required:true})} className="form-select">
                    <option value="">Select employee</option>
                    {(empData?.employees||[]).map(e => (
                      <option key={e._id} value={e._id}>{e.userId?.name} — {e.designation}</option>
                    ))}
                  </select>
                </div>
                <div><label className="form-label">Letter Type *</label>
                  <select {...register('type', {required:true})} className="form-select">
                    <option value="">Select type</option>
                    {LETTER_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.icon} {lt.label}</option>)}
                  </select>
                </div>

                {/* Conditional fields per type */}
                {(selectedType === 'offer' || selectedType === 'contract' || selectedType === 'part_time' || selectedType === 'internship') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Start Date</label>
                      <input {...register('startDate')} type="date" className="form-input"/></div>
                    <div><label className="form-label">End Date</label>
                      <input {...register('endDate')} type="date" className="form-input"/></div>
                  </div>
                )}
                {selectedType === 'internship' && (
                  <>
                    <div><label className="form-label">Duration (e.g. 3 months)</label>
                      <input {...register('duration')} className="form-input" placeholder="e.g. 3 months"/></div>
                    <div><label className="form-label">Supervisor Name</label>
                      <input {...register('supervisor')} className="form-input" placeholder="Supervisor / Mentor"/></div>
                  </>
                )}
                {selectedType === 'contract' && (
                  <div><label className="form-label">Notice Period</label>
                    <input {...register('noticePeriod')} className="form-input" placeholder="e.g. 30 days"/></div>
                )}
                {selectedType === 'part_time' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Working Hours/Day</label>
                      <input {...register('workingHours')} className="form-input" placeholder="e.g. 4 hours"/></div>
                    <div><label className="form-label">Working Days/Week</label>
                      <input {...register('workingDays')} className="form-input" placeholder="e.g. Mon–Fri"/></div>
                    <div className="col-span-2"><label className="form-label">Hourly Rate (LKR)</label>
                      <input {...register('hourlyRate')} className="form-input" placeholder="e.g. 500"/></div>
                  </div>
                )}
                {selectedType === 'resignation' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Resignation Date</label>
                      <input {...register('resignationDate')} type="date" className="form-input"/></div>
                    <div><label className="form-label">Last Working Date</label>
                      <input {...register('endDate')} type="date" className="form-input"/></div>
                    <div className="col-span-2"><label className="form-label">Notice Period</label>
                      <input {...register('noticePeriod')} className="form-input" placeholder="e.g. 30 days"/></div>
                  </div>
                )}
                {selectedType === 'experience' && (
                  <div><label className="form-label">Last Working Date</label>
                    <input {...register('endDate')} type="date" className="form-input"/></div>
                )}
                {selectedType === 'confirmation' && (
                  <div><label className="form-label">Confirmation Date</label>
                    <input {...register('confirmationDate')} type="date" className="form-input"/></div>
                )}
                {selectedType === 'salary' && (
                  <div><label className="form-label">Purpose of Letter</label>
                    <input {...register('purpose')} className="form-input" placeholder="e.g. Bank loan application"/></div>
                )}
                {selectedType === 'service_agreement' && (
                  <div>
                    <div><label className="form-label">Start Date</label>
                      <input {...register('startDate')} type="date" className="form-input"/></div>
                    <div className="mt-3"><label className="form-label">Scope of Service</label>
                      <textarea {...register('scope')} rows={2} className="form-input resize-none" placeholder="Scope of service / role responsibilities"/></div>
                  </div>
                )}
                {selectedType === 'custom' && (
                  <>
                    <div><label className="form-label">Letter Title *</label>
                      <input {...register('letterTitle', {required: selectedType==='custom'})} className="form-input" placeholder="e.g. Warning Letter"/></div>
                    <div><label className="form-label">Letter Body *</label>
                      <textarea {...register('customBody', {required: selectedType==='custom'})} rows={5} className="form-input resize-none" placeholder="Write your custom letter content here..."/></div>
                    <div><label className="form-label">Signatory Title</label>
                      <input {...register('signatoryTitle')} className="form-input" placeholder="e.g. Director / CEO"/></div>
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={generateMut.isPending} className="btn-primary flex-1 justify-center">
                    {generateMut.isPending ? <span className="spinner"/> : 'Generate Letter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview/Edit Modal */}
      {preview && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b bg-slate-50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-800">{preview.title}</h3>
                <span className={`badge text-xs ${TYPE_MAP[preview.type]?.color || 'badge-gray'} mt-1`}>
                  {TYPE_MAP[preview.type]?.label || preview.type}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditMode(m => !m)} className={`btn-outline btn-sm ${editMode ? 'text-orange-600 border-orange-300' : ''}`}>
                  <FiEdit2 size={13}/> {editMode ? 'Cancel Edit' : 'Edit'}
                </button>
                {editMode && (
                  <button onClick={() => updateMut.mutate({ id: preview._id, payload: { content: editContent, title: preview.title, type: preview.type }})}
                    disabled={updateMut.isPending} className="btn-primary btn-sm">
                    {updateMut.isPending ? <span className="spinner"/> : <><FiCheck size={13}/> Save</>}
                  </button>
                )}
                <button onClick={() => printLetter(preview)} className="btn-primary btn-sm"><FiPrinter size={13}/> Print</button>
                <button onClick={() => { setPreview(null); setEditMode(false) }} className="p-2 hover:bg-slate-200 rounded-lg"><FiX/></button>
              </div>
            </div>

            {/* Letter preview with company letterhead */}
            <div className="overflow-y-auto flex-1 p-6 md:p-8 bg-white">
              {/* Company Letterhead */}
              <div className="flex justify-between items-center border-b-4 border-secondary pb-5 mb-6">
                <div className="flex items-center gap-4">
                  {company.logo ? (
                    <img src={company.logo} alt="logo" className="h-14 object-contain"/>
                  ) : (
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl">
                      {(company.name || 'R').charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-xl font-black text-primary">{company.name || 'Raxwo Pvt Ltd'}</p>
                    {company.address && <p className="text-xs text-gray-500 mt-0.5">{company.address}</p>}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500 space-y-0.5">
                  {company.email && <p>{company.email}</p>}
                  {company.phone && <p>{company.phone}</p>}
                </div>
              </div>

              {/* Letter Content */}
              {editMode ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={22}
                  className="form-input font-mono text-xs leading-relaxed w-full"
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{editContent}</pre>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
                {company.name || 'Raxwo Pvt Ltd'} &bull; {company.address || ''} &bull; {company.email || ''}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}
