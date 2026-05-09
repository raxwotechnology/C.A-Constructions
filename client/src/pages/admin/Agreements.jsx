import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiFileText, FiPrinter, FiDownload, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const AGREEMENT_TYPES = [
  { value: 'client_project', label: 'Client Project Agreement' },
  { value: 'subscription_service', label: 'Subscription Service Agreement' },
  { value: 'invoice_payment', label: 'Invoice Payment Agreement' },
  { value: 'general', label: 'General Agreement' },
]

export default function Agreements() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
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
    }
  })

  const [editorContent, setEditorContent] = useState('')
  const [step, setStep] = useState(1) // 1: Select type & records, 2: Edit content
  const [search, setSearch] = useState('')

  const printRef = useRef(null)

  useEffect(() => {
    if (shouldOpenNew) {
      setShowModal(true)
      if (initialProject) setValue('agreementType', 'client_project')
    }
  }, [shouldOpenNew, initialProject, setValue])

  // Queries
  const { data, isLoading } = useQuery({ queryKey: ['agreements'], queryFn: () => api.get('/agreements').then(r => r.data) })
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: () => api.get('/auth/users').then(r => r.data) })
  const { data: projectsData } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) })
  const { data: invoicesData } = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/invoices').then(r => r.data) })
  
  const agreements = (data?.agreements || []).filter(a => !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.agreementNo?.toLowerCase().includes(search.toLowerCase()))
  const clients = (clientsData?.users || []).filter(u => u.role === 'client')
  const projects = projectsData?.projects || []
  const invoices = invoicesData?.invoices || []

  // Mutations
  const generatePreviewMut = useMutation({
    mutationFn: d => api.post('/agreements/generate-preview', d),
    onSuccess: (res) => {
      setEditorContent(res.data.content)
      setStep(2)
    },
    onError: e => toast.error('Failed to generate preview')
  })

  const createMut = useMutation({
    mutationFn: d => api.post('/agreements', { ...d, content: editorContent }),
    onSuccess: () => { qc.invalidateQueries(['agreements']); toast.success('Agreement created'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/agreements/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['agreements']); toast.success('Agreement updated'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed')
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }) => api.put(`/agreements/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries(['agreements']); toast.success('Status updated') }
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/agreements/${id}`),
    onSuccess: () => { qc.invalidateQueries(['agreements']); toast.success('Agreement deleted') }
  })

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setStep(1)
    setEditorContent('')
    reset({ agreementType: 'general', client: '', project: '', invoice: '', subscription: '', title: '', agreementDate: new Date().toISOString().split('T')[0] })
  }

  const openCreate = () => {
    reset({ agreementType: 'general', client: '', project: '', invoice: '', subscription: '', title: '', agreementDate: new Date().toISOString().split('T')[0] })
    setEditorContent('')
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
    setEditorContent(agr.content || '')
    setStep(2)
    setShowModal(true)
  }

  const handleGenerateClick = (data) => {
    if (!data.title) return toast.error('Please enter an agreement title')
    generatePreviewMut.mutate(data)
  }

  const handleSave = (data) => {
    editing ? updateMut.mutate({ id: editing._id, data: { ...data, content: editorContent } }) : createMut.mutate(data)
  }

  const handlePrint = (content, title, no) => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>${no} - ${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.6; padding: 50px; max-width: 800px; margin: 0 auto; }
            h1, h2, h3 { color: #1e293b; margin-top: 20px; margin-bottom: 10px; }
            p { margin-bottom: 15px; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 40px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2>AGREEMENT DOCUMENT</h2>
            <p style="color: #64748b; margin:0;">Reference: ${no}</p>
          </div>
          <div class="content">${content}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const type = watch('agreementType')
  const clientVal = watch('client')

  const projectVal = watch('project')
  const invoiceVal = watch('invoice')

  // Auto-set title if client/project selected
  useEffect(() => {
    if (step === 1 && !editing) {
      const cName = clients.find(c => c._id === clientVal)?.name || ''
      const pName = projects.find(p => p._id === projectVal)?.title || ''
      const iNo = invoices.find(i => i._id === invoiceVal)?.invoiceNo || ''
      
      let t = ''
      if (type === 'client_project' && pName) t = `Project Agreement: ${pName}`
      else if (type === 'invoice_payment' && iNo) t = `Payment Agreement: ${iNo}`
      else if (cName) t = `Agreement with ${cName}`
      if (t) setValue('title', t)
    }
  }, [type, clientVal, projectVal, invoiceVal])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agreements</h1>
          <p className="page-subtitle">Manage client contracts and service agreements</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={15}/> Generate Agreement</button>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agreements..." className="form-input pl-9"/>
      </div>

      {isLoading ? (
        <div className="text-center py-20"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
      ) : agreements.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <FiFileText size={48} className="mx-auto mb-4 text-slate-300"/>
          <p className="text-slate-500 mb-4">No agreements found.</p>
          <button onClick={openCreate} className="btn-primary btn-sm mx-auto">Create First Agreement</button>
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-600">
              <tr>
                <th className="p-4 font-semibold">Agreement</th>
                <th className="p-4 font-semibold">Linked Entity</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agreements.map(agr => (
                <tr key={agr._id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <p className="font-bold text-slate-800 mb-0.5">{agr.title}</p>
                    <p className="text-xs text-slate-500 font-mono">{agr.agreementNo} • {AGREEMENT_TYPES.find(t=>t.value===agr.agreementType)?.label}</p>
                  </td>
                  <td className="p-4">
                    {agr.client && <p className="text-sm font-medium text-slate-700">Client: {agr.client.name}</p>}
                    {agr.project && <p className="text-xs text-slate-500 truncate max-w-xs">Proj: {agr.project.title}</p>}
                    {agr.invoice && <p className="text-xs text-slate-500">Inv: {agr.invoice.invoiceNo}</p>}
                  </td>
                  <td className="p-4">
                    <select 
                      value={agr.status} 
                      onChange={(e) => updateStatusMut.mutate({ id: agr._id, status: e.target.value })}
                      className={`text-xs py-1 px-2 rounded-lg font-bold border-none outline-none appearance-none cursor-pointer
                        ${agr.status === 'signed' ? 'bg-green-100 text-green-800' : agr.status === 'finalised' ? 'bg-blue-100 text-blue-800' : agr.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-800'}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="finalised">Finalised</option>
                      <option value="signed">Signed</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td className="p-4 text-slate-600">{new Date(agr.createdAt).toLocaleDateString('en-LK')}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handlePrint(agr.content, agr.title, agr.agreementNo)} className="p-2 text-slate-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors" title="Print/PDF"><FiPrinter size={14}/></button>
                      <button onClick={() => openEdit(agr)} className="p-2 text-slate-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><FiEdit2 size={14}/></button>
                      <button onClick={() => { if(window.confirm('Delete agreement?')) deleteMut.mutate(agr._id) }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><FiTrash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generator Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex justify-end" style={{ zIndex: 999999 }} onClick={closeModal}>
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              
              <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h2 className="text-xl font-bold font-heading text-slate-800">{editing ? 'Edit Agreement' : 'Generate Agreement'}</h2>
                  <p className="text-sm text-slate-500">{step === 1 ? 'Step 1: Configuration' : 'Step 2: Editor'}</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><FiX size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form id="agr-form" onSubmit={handleSubmit(step === 1 ? handleGenerateClick : handleSave)} className="space-y-6">
                  
                  {step === 1 && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-6 max-w-2xl">
                      <div>
                        <label className="form-label">Agreement Type</label>
                        <select {...register('agreementType')} className="form-select">
                          {AGREEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-xl border space-y-4">
                        <h4 className="text-sm font-bold text-slate-700 mb-2">Link Records (Auto-fills Template)</h4>
                        
                        <div>
                          <label className="form-label">Client</label>
                          <select {...register('client')} className="form-select">
                            <option value="">Select Client...</option>
                            {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        </div>

                        {type === 'client_project' && (
                          <div>
                            <label className="form-label">Project</label>
                            <select {...register('project')} className="form-select">
                              <option value="">Select Project...</option>
                              {projects.filter(p => !clientVal || p.client?._id === clientVal).map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                            </select>
                          </div>
                        )}

                        {type === 'invoice_payment' && (
                          <div>
                            <label className="form-label">Invoice</label>
                            <select {...register('invoice')} className="form-select">
                              <option value="">Select Invoice...</option>
                              {invoices.filter(i => !clientVal || i.client?._id === clientVal).map(i => <option key={i._id} value={i._id}>{i.invoiceNo} - LKR {i.total}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Agreement Title *</label>
                          <input {...register('title')} className={`form-input ${watch('title') === '' ? 'border-red-400' : ''}`} placeholder="e.g. Website Development Contract"/>
                        </div>
                        <div>
                          <label className="form-label">Agreement Date</label>
                          <input type="date" {...register('agreementDate')} className="form-input"/>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="h-full flex flex-col">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-bold text-slate-800">{watch('title')}</h4>
                        {editing && <span className="badge badge-blue">Editing Existing</span>}
                      </div>
                      <div className="border rounded-xl overflow-hidden flex-1 flex flex-col bg-white">
                        <ReactQuill 
                          theme="snow" 
                          value={editorContent} 
                          onChange={setEditorContent}
                          className="flex-1 overflow-y-auto"
                          modules={{
                            toolbar: [
                              [{ 'header': [1, 2, 3, false] }],
                              ['bold', 'italic', 'underline', 'strike'],
                              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                              ['link'],
                              ['clean']
                            ]
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </form>
              </div>

              <div className="p-6 border-t bg-slate-50 shrink-0 flex gap-3">
                {step === 2 && !editing && (
                  <button type="button" onClick={() => setStep(1)} className="btn-outline px-6">Back</button>
                )}
                <div className="flex-1"/>
                <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
                <button type="submit" form="agr-form" disabled={generatePreviewMut.isPending || createMut.isPending || updateMut.isPending} className="btn-primary px-8">
                  {generatePreviewMut.isPending || createMut.isPending || updateMut.isPending ? <span className="spinner"/> : step === 1 && !editing ? 'Generate Template' : 'Save Agreement'}
                </button>
              </div>

            </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
