import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiFileText, FiDownload, FiEye } from 'react-icons/fi'

const LETTER_TYPES = [
  { value:'offer', label:'Offer Letter' },
  { value:'appointment', label:'Appointment Letter' },
  { value:'confirmation', label:'Confirmation Letter' },
  { value:'experience', label:'Experience Letter' },
  { value:'salary', label:'Salary Confirmation' },
  { value:'service_agreement', label:'Service Agreement' },
]

export default function AdminLetters() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [preview, setPreview] = useState(null)
  const [editContent, setEditContent] = useState('')
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

  const generateMut = useMutation({
    mutationFn: d => api.post('/letters/generate', d),
    onSuccess: (r) => {
      qc.invalidateQueries(['admin-letters'])
      toast.success('Letter generated successfully')
      setPreview(r.data.letter)
      setShowModal(false)
      reset()
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to generate'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/letters/${id}`, payload).then((r) => r.data),
    onSuccess: (r) => {
      qc.invalidateQueries(['admin-letters'])
      setPreview(r.letter)
      setEditContent(r.letter.content)
      toast.success('Letter updated')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  const onSubmit = d => generateMut.mutate({
    employeeId: d.employeeId,
    type: d.type,
    data: { startDate: d.startDate, endDate: d.endDate, confirmationDate: d.confirmationDate, purpose: d.purpose, scope: d.scope },
  })

  const printLetter = (content) => {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Letter</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 40px; color: #1a1a1a; line-height: 1.7; }
        h1 { text-align: center; color: #0B1F3A; }
        pre { white-space: pre-wrap; font-family: inherit; }
        .header { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #0B1F3A; }
        @media print { body { margin: 0; } }
      </style></head>
      <body>
        <div class="header"><div class="logo">Raxwo Pvt Ltd</div><p style="color:#666;font-size:12px;">123 Galle Road, Colombo 03, Sri Lanka · hello@raxwo.com</p></div>
        <pre>${content}</pre>
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  const letters = data?.letters || []
  const typeColor = { offer:'badge-blue', appointment:'badge-green', confirmation:'badge-purple', experience:'badge-navy', salary:'badge-yellow', service_agreement:'badge-blue' }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Letter Generator</h1>
          <p className="page-subtitle">{letters.length} letters issued</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><FiPlus size={15}/> Generate Letter</button>
      </div>

      {/* Letter type cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {LETTER_TYPES.map(lt => (
          <div key={lt.value} className="card p-4 text-center cursor-pointer hover:border-secondary transition-colors"
            onClick={() => setShowModal(true)}>
            <FiFileText size={24} className="text-secondary mx-auto mb-2"/>
            <p className="text-xs font-medium text-gray-700">{lt.label}</p>
          </div>
        ))}
      </div>

      {/* Letters table */}
      <div className="table-container">
        <table className="table">
          <thead><tr><th>Employee</th><th>Type</th><th>Issued By</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></td></tr>
            ) : letters.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                <FiFileText size={36} className="mx-auto mb-2 opacity-30"/>No letters yet
              </td></tr>
            ) : letters.map(l => (
              <tr key={l._id}>
                <td>
                  <div>
                    <p className="font-medium text-gray-800">{l.employee?.userId?.name}</p>
                    <p className="text-xs text-gray-400">{l.employee?.employeeNo}</p>
                  </div>
                </td>
                <td><span className={`badge ${typeColor[l.type]||'badge-gray'} capitalize`}>{l.type}</span></td>
                <td className="text-sm text-gray-600">{l.issuedBy?.name}</td>
                <td className="text-sm text-gray-500">{new Date(l.issuedDate).toLocaleDateString('en-LK')}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => { setPreview(l); setEditContent(l.content) }} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors" title="Preview">
                      <FiEye size={13}/>
                    </button>
                    <button onClick={() => printLetter(l.content)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Print/Download">
                      <FiDownload size={13}/>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-primary font-heading">Generate Letter</h3>
                <button onClick={() => { setShowModal(false); reset() }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div><label className="form-label">Employee *</label>
                  <select {...register('employeeId',{required:true})} className="form-select">
                    <option value="">Select employee</option>
                    {(empData?.employees||[]).map(e => <option key={e._id} value={e._id}>{e.userId?.name} — {e.designation}</option>)}
                  </select></div>
                <div><label className="form-label">Letter Type *</label>
                  <select {...register('type',{required:true})} className="form-select">
                    <option value="">Select type</option>
                    {LETTER_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                  </select></div>
                {selectedType === 'offer' && <div><label className="form-label">Start Date</label>
                  <input {...register('startDate')} type="date" className="form-input"/></div>}
                {selectedType === 'experience' && <div><label className="form-label">Last Working Date</label>
                  <input {...register('endDate')} type="date" className="form-input"/></div>}
                {selectedType === 'confirmation' && <div><label className="form-label">Confirmation Date</label>
                  <input {...register('confirmationDate')} type="date" className="form-input"/></div>}
                {selectedType === 'salary' && <div><label className="form-label">Purpose</label>
                  <input {...register('purpose')} placeholder="e.g. Bank loan application" className="form-input"/></div>}
                {selectedType === 'service_agreement' && <div><label className="form-label">Service Scope</label>
                  <input {...register('scope')} placeholder="Scope of service terms" className="form-input"/></div>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={generateMut.isPending} className="btn-primary flex-1 justify-center">
                    {generateMut.isPending ? <span className="spinner"/> : 'Generate'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                <h3 className="text-lg font-bold text-primary font-heading">{preview.title}</h3>
                <div className="flex gap-2">
                  <button onClick={() => printLetter(preview.content)} className="btn-primary btn-sm"><FiDownload size={13}/> Print</button>
                  <button onClick={() => setPreview(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
                </div>
              </div>
              <div className="p-8">
                <div className="text-center border-b-2 border-secondary pb-6 mb-6">
                  <p className="text-2xl font-bold text-primary font-heading">Raxwo Pvt Ltd</p>
                  <p className="text-gray-500 text-sm mt-1">123 Galle Road, Colombo 03, Sri Lanka</p>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={18}
                  className="form-input font-mono text-xs leading-relaxed"
                />
                <div className="pt-3 flex justify-end">
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => updateMut.mutate({ id: preview._id, payload: { content: editContent, title: preview.title, type: preview.type } })}
                    disabled={updateMut.isPending}
                    type="button"
                  >
                    {updateMut.isPending ? <span className="spinner" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
