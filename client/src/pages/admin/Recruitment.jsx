import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiBriefcase, FiUsers, FiSearch, FiEye, FiEdit2 } from 'react-icons/fi'

const TABS = ['Jobs', 'Applications']

export default function AdminRecruitment() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('Jobs')
  const [showModal, setShowModal] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [search, setSearch] = useState('')
  const { register, handleSubmit, reset, setValue } = useForm()

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => api.get('/recruitment/jobs?status=').then(r => r.data),
    enabled: tab === 'Jobs',
  })
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: () => api.get('/recruitment/applications').then(r => r.data),
    enabled: tab === 'Applications',
  })

  const createJobMut = useMutation({
    mutationFn: d => api.post('/recruitment/jobs', { ...d, skills: d.skills?.split(',').map(s => s.trim()).filter(Boolean), requirements: d.requirements?.split('\n').filter(Boolean) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-jobs'] }); toast.success('Job posted'); reset(); setShowModal(false) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateJobMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/recruitment/jobs/${id}`, {
      ...d,
      skills: d.skills?.split(',').map(s => s.trim()).filter(Boolean),
      requirements: d.requirements?.split('\n').filter(Boolean),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-jobs'] }); toast.success('Job updated'); reset(); setShowModal(false); setEditJob(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteJobMut = useMutation({
    mutationFn: id => api.delete(`/recruitment/jobs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-jobs'] }); toast.success('Job deleted') },
  })
  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }) => api.put(`/recruitment/applications/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries(['admin-applications']); toast.success('Status updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const jobs = (jobsData?.jobs || []).filter(j => !search || j.title.toLowerCase().includes(search.toLowerCase()))
  const apps = (appsData?.applications || []).filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.job?.title?.toLowerCase().includes(search.toLowerCase()))

  const openEditJob = (job) => {
    setEditJob(job)
    setShowModal(true)
    setValue('title', job.title || '')
    setValue('department', job.department || '')
    setValue('type', job.type || 'full-time')
    setValue('location', job.location || '')
    setValue('description', job.description || '')
    setValue('skills', (job.skills || []).join(', '))
    setValue('requirements', (job.requirements || []).join('\n'))
    setValue('salaryRange.min', job.salaryRange?.min || '')
    setValue('salaryRange.max', job.salaryRange?.max || '')
    setValue('status', job.status || 'open')
  }

  const onSubmitJob = (data) => {
    if (editJob) updateJobMut.mutate({ id: editJob._id, ...data })
    else createJobMut.mutate(data)
  }

  const statusColor = { new:'badge-blue', reviewing:'badge-yellow', shortlisted:'badge-green', interview:'badge-purple', offered:'badge-navy', hired:'badge-green', rejected:'badge-red' }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recruitment & ATS</h1>
          <p className="page-subtitle">{jobsData?.count || 0} jobs · {appsData?.count || 0} applications</p>
        </div>
        {tab === 'Jobs' && <button type="button" onClick={() => { setEditJob(null); reset(); setShowModal(true) }} className="btn-primary"><FiPlus size={15}/> Post Job</button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t} {t === 'Jobs' ? `(${jobsData?.count || 0})` : `(${appsData?.count || 0})`}
          </button>
        ))}
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab.toLowerCase()}...`} className="form-input pl-10"/>
      </div>

      {/* Jobs Tab */}
      {tab === 'Jobs' && (
        <div className="space-y-3">
          {jobsLoading ? <div className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
          : jobs.length === 0 ? <div className="text-center py-16 text-gray-400"><FiBriefcase size={40} className="mx-auto mb-2 opacity-30"/><p>No jobs found</p></div>
          : jobs.map(job => (
            <div key={job._id} className="card card-body flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-primary">{job.title}</h3>
                  <span className={`badge ${job.status === 'open' ? 'badge-green' : 'badge-gray'}`}>{job.status}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{job.department}</span>
                  <span>{job.type}</span>
                  <span>{job.location}</span>
                  <span className="text-accent font-medium">{job.applicantCount || 0} applicants</span>
                  {job.salaryRange?.min && <span className="text-secondary font-medium">LKR {job.salaryRange.min.toLocaleString()}–{job.salaryRange.max?.toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/careers/${job._id}`} target="_blank" className="btn-ghost btn-sm"><FiEye size={13}/> Preview</Link>
                <button type="button" onClick={() => openEditJob(job)} className="btn-outline btn-sm"><FiEdit2 size={13}/> Edit</button>
                <button type="button" onClick={() => updateJobMut.mutate({ id: job._id, status: job.status === 'open' ? 'closed' : 'open' })} className="btn-outline btn-sm">
                  {job.status === 'open' ? 'Close' : 'Reopen'}
                </button>
                <button type="button" onClick={() => { if(window.confirm('Delete this job?')) deleteJobMut.mutate(job._id) }} className="btn-danger btn-sm"><FiX size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Applications Tab */}
      {tab === 'Applications' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Candidate</th><th>Position</th><th>Match Score</th><th>Experience</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {appsLoading ? <tr><td colSpan={7} className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></td></tr>
              : apps.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-400"><FiUsers size={36} className="mx-auto mb-2 opacity-30"/>No applications</td></tr>
              : apps.map(app => (
                <tr key={app._id}>
                  <td>
                    <div>
                      <p className="font-medium text-gray-800">{app.name}</p>
                      <p className="text-xs text-gray-400">{app.email}</p>
                    </div>
                  </td>
                  <td className="text-sm">{app.job?.title}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 progress-bar">
                        <div className="progress-fill" style={{ width:`${app.matchScore}%`, backgroundColor: app.matchScore >= 70 ? '#22C55E' : app.matchScore >= 40 ? '#F59E0B' : '#EF4444' }}/>
                      </div>
                      <span className="text-xs font-semibold">{app.matchScore}%</span>
                    </div>
                  </td>
                  <td>{app.experienceYears} yr{app.experienceYears !== 1 ? 's' : ''}</td>
                  <td className="text-xs text-gray-500">{new Date(app.createdAt).toLocaleDateString('en-LK')}</td>
                  <td>
                    <select value={app.status} onChange={e => updateStatusMut.mutate({ id: app._id, status: e.target.value })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-secondary/20 focus:outline-none cursor-pointer">
                      {['new','reviewing','shortlisted','interview','offered','hired','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <Link to={`/admin/recruitment/candidates/${app._id}`} className="btn-ghost btn-sm text-xs"><FiEye size={13}/> View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Post Job Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-primary font-heading">{editJob ? 'Edit Job' : 'Post New Job'}</h3>
                <button type="button" onClick={() => { setShowModal(false); setEditJob(null); reset() }} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>
              <form onSubmit={handleSubmit(onSubmitJob)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Job Title *</label>
                    <input {...register('title', {required:true})} placeholder="e.g. Full Stack Developer" className="form-input"/></div>
                  <div><label className="form-label">Department *</label>
                    <input {...register('department', {required:true})} placeholder="e.g. Engineering" className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Type</label>
                    <select {...register('type')} className="form-select">
                      {['full-time','part-time','contract','internship'].map(t => <option key={t}>{t}</option>)}
                    </select></div>
                  <div><label className="form-label">Location</label>
                    <input {...register('location')} defaultValue="Colombo, Sri Lanka" className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Min Salary (LKR)</label>
                    <input {...register('salaryRange.min', {valueAsNumber:true})} type="number" placeholder="80000" className="form-input"/></div>
                  <div><label className="form-label">Max Salary (LKR)</label>
                    <input {...register('salaryRange.max', {valueAsNumber:true})} type="number" placeholder="150000" className="form-input"/></div>
                </div>
                <div><label className="form-label">Skills (comma-separated)</label>
                  <input {...register('skills')} placeholder="react, node, mongodb, javascript" className="form-input"/></div>
                <div><label className="form-label">Application Deadline</label>
                  <input {...register('deadline')} type="date" className="form-input"/></div>
                <div><label className="form-label">Requirements (one per line)</label>
                  <textarea {...register('requirements')} rows={3} placeholder="3+ years experience&#10;Strong React skills&#10;Bachelor's degree" className="form-input resize-none"/></div>
                <div><label className="form-label">Job Description *</label>
                  <textarea {...register('description', {required:true})} rows={5} placeholder="Describe the role, responsibilities, and what the candidate will work on..." className="form-input resize-none"/></div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowModal(false); setEditJob(null); reset() }} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button type="submit" disabled={createJobMut.isPending || updateJobMut.isPending} className="btn-primary flex-1 justify-center">
                    {(createJobMut.isPending || updateJobMut.isPending) ? <span className="spinner"/> : (editJob ? 'Save Changes' : 'Post Job')}
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
