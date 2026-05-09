import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiFolder, FiSearch, FiEdit2, FiTrash2, FiUsers, FiDollarSign, FiPercent, FiInfo } from 'react-icons/fi'

const SERVICE_TYPES = ['ERP', 'POS', 'Hosting', 'Website', 'Maintenance', 'Custom', 'Other']
const statusColor = { planning:'badge-gray', active:'badge-green', on_hold:'badge-yellow', completed:'badge-blue', cancelled:'badge-red', overdue:'badge-red' }
const priorityColor = { low:'badge-gray', medium:'badge-yellow', high:'badge-red', critical:'badge-purple' }

export default function AdminProjects() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  // Salary allocations state
  const [salaryAllocations, setSalaryAllocations] = useState([]) // [{employeeId, employeeName, salary, commission}]
  const [selectedTeam, setSelectedTeam] = useState([]) // array of employee._id

  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues: { progress: 0, budget: 0 } })
  const budget = Number(watch('budget') || 0)
  const totalAllocated = salaryAllocations.reduce((s, a) => s + Number(a.salary || 0), 0)
  const totalCommission = salaryAllocations.reduce((s, a) => s + Number(a.commission || 0), 0)
  const remaining = budget - totalAllocated - totalCommission
  const watchedEmployees = watch('assignedEmployees') || []

  const { data: projData, isLoading } = useQuery({
    queryKey: ['admin-projects', branchFilter],
    queryFn: () => api.get(`/projects${branchFilter ? `?branch=${branchFilter}` : ''}`).then(r => r.data),
  })
  const { data: empData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/employees').then(r => r.data),
  })
  const { data: clientData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/auth/users').then(r => r.data),
  })
  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(r => r.data),
  })

  const projects = (projData?.projects || []).filter(p =>
    (!search || p.title?.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || p.status === statusFilter)
  )
  const clients = (clientData?.users || []).filter(u => u.role === 'client')
  const employees = empData?.employees || []
  const branches = branchData?.branches || []

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
    setValue('serviceType', p.serviceType || 'Other')
    setValue('budget', p.budget ?? 0)
    setValue('startDate', p.startDate ? new Date(p.startDate).toISOString().slice(0,10) : '')
    setValue('deadline', p.deadline ? new Date(p.deadline).toISOString().slice(0,10) : '')
    setValue('progress', p.progress ?? 0)
    setValue('projectManager', p.projectManager?._id || '')
    setValue('branch', p.branch?._id || '')
    const team = (p.assignedEmployees || []).map(u => u._id || u)
    setSelectedTeam(team)
    const allocs = (p.salaryAllocations || []).map(a => ({
      employeeId: a.employee?._id || a.employee,
      employeeName: a.employeeName || '',
      salary: a.amount || 0,
      commission: a.commission || 0,
    }))
    setSalaryAllocations(allocs)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false); setEditing(null)
    reset({ progress: 0, budget: 0 })
    setSalaryAllocations([]); setSelectedTeam([])
  }

  // When team member toggled, add/remove from allocations
  const toggleTeamMember = emp => {
    const empUserId = emp.userId?._id
    const empEmpId = emp._id
    const isSelected = selectedTeam.includes(empUserId)
    if (isSelected) {
      setSelectedTeam(s => s.filter(id => id !== empUserId))
      setSalaryAllocations(s => s.filter(a => a.employeeId !== empEmpId))
    } else {
      setSelectedTeam(s => [...s, empUserId])
      setSalaryAllocations(s => [...s, { employeeId: empEmpId, employeeName: emp.userId?.name || '', salary: 0, commission: 0 }])
    }
  }

  const updateAllocation = (empId, field, value) => {
    setSalaryAllocations(s => s.map(a => a.employeeId === empId ? { ...a, [field]: Number(value || 0) } : a))
  }

  const onSubmit = d => {
    const payload = {
      ...d,
      assignedEmployees: selectedTeam,
      salaryAllocations: salaryAllocations.map(a => ({
        employee: a.employeeId,
        employeeName: a.employeeName,
        amount: Number(a.salary || 0),
        commission: Number(a.commission || 0),
      })),
    }
    if (!payload.client) delete payload.client
    if (!payload.projectManager) delete payload.projectManager
    if (!payload.branch) delete payload.branch
    editing ? updateMut.mutate({ id: editing._id, data: payload }) : createMut.mutate(payload)
  }

  const progressValue = Number(watch('progress') || 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projData?.count || 0} total projects</p>
        </div>
        <button onClick={() => { reset({ progress: 0, budget: 0 }); setEditing(null); setSalaryAllocations([]); setSelectedTeam([]); setShowModal(true) }} className="btn-primary">
          <FiPlus size={15}/> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="form-input pl-9"/>
        </div>
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['planning','active','on_hold','completed','cancelled'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select className="form-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {/* Project Cards */}
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
              <div className="flex gap-1.5 flex-wrap">
                <span className={`badge capitalize ${statusColor[p.status]||'badge-gray'}`}>{p.status?.replace('_',' ')}</span>
                <span className={`badge capitalize ${priorityColor[p.priority]||'badge-gray'}`}>{p.priority}</span>
                {p.serviceType && <span className="badge badge-navy">{p.serviceType}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={13}/></button>
                <button onClick={() => { if(window.confirm('Delete project?')) deleteMut.mutate(p._id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={13}/></button>
              </div>
            </div>
            <div className="cursor-pointer" onClick={() => navigate(`/admin/projects/${p._id}`)}>
              <h3 className="font-bold text-primary font-heading mb-1 hover:text-secondary transition-colors">{p.title}</h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-3">{p.description}</p>
            </div>

            {/* Budget & Allocation */}
            {p.budget > 0 && (
              <div className="mb-3 p-2.5 bg-gray-50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Budget</span><span className="font-semibold">LKR {p.budget.toLocaleString()}</span>
                </div>
                {p.salaryAllocations?.length > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Allocated</span>
                    <span className="text-orange-600 font-medium">LKR {p.salaryAllocations.reduce((s,a) => s + (a.amount||0) + (a.commission||0), 0).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progress</span><span>{p.progress}%</span></div>
              <div className="progress-bar">
                <div className="progress-fill bg-secondary" style={{width:`${p.progress}%`}}/>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
              <span>Client: <span className="text-gray-700 font-medium">{p.client?.name || 'Internal'}</span></span>
              {p.assignedEmployees?.length > 0 && (
                <span className="flex items-center gap-1"><FiUsers size={11}/> {p.assignedEmployees.length} members</span>
              )}
            </div>
            {p.deadline && <p className="text-xs text-gray-400 mt-1">Due: {new Date(p.deadline).toLocaleDateString('en-LK')}</p>}
          </motion.div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-primary font-heading">{editing ? 'Edit Project' : 'New Project'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiFolder size={14}/> Basic Information</h4>
                <div className="space-y-3">
                  <div><label className="form-label">Project Title *</label>
                    <input {...register('title', {required: true})} className="form-input" placeholder="e.g. ERP System for XYZ Company"/></div>
                  <div><label className="form-label">Description *</label>
                    <textarea {...register('description', {required: !editing})} rows={2} className="form-input resize-none" placeholder="Project scope and objectives"/></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div><label className="form-label">Client</label>
                      <select {...register('client')} className="form-select">
                        <option value="">Internal / No client</option>
                        {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select></div>
                    <div><label className="form-label">Service Type</label>
                      <select {...register('serviceType')} className="form-select">
                        {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                    <div><label className="form-label">Branch</label>
                      <select {...register('branch')} className="form-select">
                        <option value="">No branch</option>
                        {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                      </select></div>
                    <div><label className="form-label">Status</label>
                      <select {...register('status')} className="form-select">
                        {['planning','active','on_hold','completed','cancelled'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                      </select></div>
                    <div><label className="form-label">Priority</label>
                      <select {...register('priority')} className="form-select">
                        {['low','medium','high','critical'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                      </select></div>
                    <div><label className="form-label">Project Manager</label>
                      <select {...register('projectManager')} className="form-select">
                        <option value="">Select manager</option>
                        {employees.filter(e => ['manager','admin'].includes(e.userId?.role)).map(e => (
                          <option key={e._id} value={e.userId?._id}>{e.userId?.name}</option>
                        ))}
                      </select></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="form-label">Start Date</label>
                      <input {...register('startDate')} type="date" className="form-input"/></div>
                    <div><label className="form-label">Deadline</label>
                      <input {...register('deadline')} type="date" className="form-input"/></div>
                    <div><label className="form-label">Budget (LKR) *</label>
                      <input {...register('budget', {valueAsNumber: true})} type="number" placeholder="0" className="form-input"/></div>
                  </div>
                  <div><label className="form-label">Progress ({progressValue}%)</label>
                    <input {...register('progress', {valueAsNumber: true})} type="range" min={0} max={100} className="w-full accent-secondary"/></div>
                </div>
              </div>

              <hr className="border-gray-100"/>

              {/* Team Selection with Salary Allocations */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><FiUsers size={14}/> Team & Salary Allocation</h4>
                <p className="text-xs text-gray-400 mb-3">Select team members, then assign salary and commission per employee from the project budget.</p>

                {/* Budget Summary Bar */}
                {budget > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex justify-between text-xs font-semibold text-blue-800 mb-2">
                      <span>Budget: LKR {budget.toLocaleString()}</span>
                      <span className={remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                        Remaining: LKR {remaining.toLocaleString()}
                      </span>
                    </div>
                    <div className="progress-bar h-1.5">
                      <div className="progress-fill" style={{
                        width: `${Math.min(100, ((totalAllocated + totalCommission) / budget) * 100)}%`,
                        backgroundColor: remaining < 0 ? '#ef4444' : '#2563eb'
                      }}/>
                    </div>
                    <div className="flex justify-between text-xs text-blue-600 mt-1">
                      <span>Salary: LKR {totalAllocated.toLocaleString()}</span>
                      <span>Commission: LKR {totalCommission.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Employee Checkboxes + Allocation Rows */}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">✓</div>
                    <div className="col-span-4">Employee</div>
                    <div className="col-span-2 text-right">Basic Sal.</div>
                    <div className="col-span-2.5">Salary Alloc. (LKR)</div>
                    <div className="col-span-2.5">Commission (LKR)</div>
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                    {employees.map(emp => {
                      const isSelected = selectedTeam.includes(emp.userId?._id)
                      const alloc = salaryAllocations.find(a => a.employeeId === emp._id)
                      return (
                        <div key={emp._id} className={`grid grid-cols-12 items-center px-4 py-2.5 transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}>
                          <div className="col-span-1">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleTeamMember(emp)}
                              className="w-4 h-4 accent-secondary cursor-pointer"/>
                          </div>
                          <div className="col-span-4">
                            <p className="text-sm font-medium text-gray-800">{emp.userId?.name}</p>
                            <p className="text-xs text-gray-400">{emp.designation} · {emp.employeeNo}</p>
                          </div>
                          <div className="col-span-2 text-right text-xs text-gray-500 pr-2">
                            LKR {(emp.basicSalary || 0).toLocaleString()}
                          </div>
                          <div className="col-span-2 pr-1">
                            {isSelected ? (
                              <input type="number" min={0} placeholder="0"
                                value={alloc?.salary || ''}
                                onChange={e => updateAllocation(emp._id, 'salary', e.target.value)}
                                className="form-input py-1.5 text-xs w-full"/>
                            ) : <span className="text-gray-300 text-xs px-2">—</span>}
                          </div>
                          <div className="col-span-2 pl-1">
                            {isSelected ? (
                              <input type="number" min={0} placeholder="0"
                                value={alloc?.commission || ''}
                                onChange={e => updateAllocation(emp._id, 'commission', e.target.value)}
                                className="form-input py-1.5 text-xs w-full"/>
                            ) : <span className="text-gray-300 text-xs px-2">—</span>}
                          </div>
                        </div>
                      )
                    })}
                    {employees.length === 0 && (
                      <div className="text-center py-6 text-gray-400 text-sm">No employees found</div>
                    )}
                  </div>
                  {selectedTeam.length > 0 && (
                    <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs font-semibold text-gray-700">
                      <div className="col-span-7 text-right pr-2">{selectedTeam.length} selected</div>
                      <div className="col-span-2 pr-1 text-blue-700">LKR {totalAllocated.toLocaleString()}</div>
                      <div className="col-span-2 pl-1 text-purple-700">LKR {totalCommission.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                  {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : editing ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}
