import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiFolder, FiSearch, FiEdit2 } from 'react-icons/fi'

export default function AdminProjects() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues: { progress: 0 } })

  const { data: projData, isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })
  const { data: empData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/employees').then(r => r.data),
  })
  const { data: clientData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/auth/users').then(r => r.data),
  })

  const projects = (projData?.projects || []).filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))
  const clients = (clientData?.users || []).filter(u => u.role === 'client')
  const employees = empData?.employees || []

  const createMut = useMutation({
    mutationFn: d => api.post('/projects', d),
    onSuccess: () => { qc.invalidateQueries(['admin-projects']); toast.success('Project created'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/projects/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['admin-projects']); toast.success('Updated'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries(['admin-projects']); toast.success('Deleted') },
  })

  const openEdit = p => {
    setEditing(p)
    setValue('title', p.title || '')
    setValue('description', p.description || '')
    setValue('client', p.client?._id || '')
    setValue('status', p.status || 'planning')
    setValue('priority', p.priority || 'medium')
    setValue('budget', p.budget ?? 0)
    setValue('startDate', p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : '')
    setValue('deadline', p.deadline ? new Date(p.deadline).toISOString().slice(0, 10) : '')
    setValue('progress', p.progress ?? 0)
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); reset({ progress: 0 }) }
  const onSubmit = (d) => {
    const payload = { ...d }
    if (!payload.client) delete payload.client
    if (!payload.projectManager) delete payload.projectManager
    if (payload.budget === null || Number.isNaN(payload.budget)) delete payload.budget
    if (payload.progress === null || Number.isNaN(payload.progress)) delete payload.progress
    if (editing) updateMut.mutate({ id: editing._id, data: payload })
    else createMut.mutate(payload)
  }
  const progressValue = Number(watch('progress') || 0)

  const statusColor = { planning:'badge-gray', active:'badge-green', on_hold:'badge-yellow', completed:'badge-blue', cancelled:'badge-red' }
  const priorityColor = { low:'badge-gray', medium:'badge-yellow', high:'badge-red', critical:'badge-purple' }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projData?.count || 0} total projects</p>
        </div>
        <button onClick={() => { reset({ progress: 0 }); setEditing(null); setShowModal(true) }} className="btn-primary"><FiPlus size={15}/> New Project</button>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="form-input pl-10"/>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 text-center py-16"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
        ) : projects.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <FiFolder size={40} className="mx-auto mb-2 opacity-30"/>No projects found
          </div>
        ) : projects.map(p => (
          <motion.div key={p._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="card card-body card-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-2 flex-wrap">
                <span className={`badge ${statusColor[p.status]||'badge-gray'} capitalize`}>{p.status}</span>
                <span className={`badge ${priorityColor[p.priority]||'badge-gray'} capitalize`}>{p.priority}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={13}/></button>
                <button onClick={() => { if(window.confirm('Delete?')) deleteMut.mutate(p._id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiX size={13}/></button>
              </div>
            </div>
            <h3 className="font-bold text-primary font-heading mb-1">{p.title}</h3>
            <p className="text-gray-500 text-sm line-clamp-2 mb-3">{p.description}</p>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span><span>{p.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-secondary" style={{width:`${p.progress}%`}}/>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
              <span>Client: <span className="text-gray-700 font-medium">{p.client?.name || 'Internal'}</span></span>
              {p.budget > 0 && <span>LKR {(p.budget/1000).toFixed(0)}k</span>}
            </div>
            {p.deadline && (
              <p className="text-xs text-gray-400 mt-1">Due: {new Date(p.deadline).toLocaleDateString('en-LK')}</p>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-primary font-heading">{editing?'Edit Project':'New Project'}</h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div><label className="form-label">Title *</label>
                  <input {...register('title',{required:true})} placeholder="Project title" className="form-input"/></div>
                <div><label className="form-label">Description *</label>
                  <textarea {...register('description',{required:!editing})} rows={3} placeholder="Project description" className="form-input resize-none"/></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Client</label>
                    <select {...register('client')} className="form-select">
                      <option value="">Internal / No client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select></div>
                  <div><label className="form-label">Status</label>
                    <select {...register('status')} className="form-select">
                      {['planning','active','on_hold','completed','cancelled'].map(s=><option key={s}>{s}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Priority</label>
                    <select {...register('priority')} className="form-select">
                      {['low','medium','high','critical'].map(p=><option key={p}>{p}</option>)}
                    </select></div>
                  <div><label className="form-label">Budget (LKR)</label>
                    <input {...register('budget',{valueAsNumber:true})} type="number" placeholder="500000" className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Start Date</label>
                    <input {...register('startDate')} type="date" className="form-input"/></div>
                  <div><label className="form-label">Deadline</label>
                    <input {...register('deadline')} type="date" className="form-input"/></div>
                </div>
                <div>
                  <label className="form-label">Progress ({progressValue}%)</label>
                  <input {...register('progress',{valueAsNumber:true})} type="range" min={0} max={100} className="w-full accent-secondary"/>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={createMut.isPending||updateMut.isPending} className="btn-primary flex-1 justify-center">
                    {createMut.isPending||updateMut.isPending?<span className="spinner"/>:editing?'Save Changes':'Create'}
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
