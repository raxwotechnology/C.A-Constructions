import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiX, FiActivity } from 'react-icons/fi'

const DEPARTMENTS = ['Engineering','Design','Marketing','HR','Finance','Operations','Sales','Infrastructure']
const ROLES = [
  { value: 'developer', label: 'Developer' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
]

export default function AdminEmployees() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [activityEmp, setActivityEmp] = useState(null)
  const { register, handleSubmit, reset, setValue } = useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['employees', deptFilter],
    queryFn: () => api.get(`/employees${deptFilter ? `?department=${deptFilter}` : ''}`).then(r => r.data),
  })

  const employees = (data?.employees || []).filter(e =>
    !search || e.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeNo?.toLowerCase().includes(search.toLowerCase()) ||
    e.designation?.toLowerCase().includes(search.toLowerCase())
  )

  const createMut = useMutation({
    mutationFn: d => api.post('/employees', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Employee created'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/employees/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Updated'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/employees/${id}`),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Removed') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const openCreate = () => { reset(); setEditing(null); setShowModal(true) }
  const openEdit = emp => {
    setEditing(emp)
    ;['department','designation','basicSalary','allowances','status','epfNumber'].forEach(k => setValue(k, emp[k]))
    setValue('role', emp.userId?.role || 'developer')
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); reset() }
  const onSubmit = d => editing ? updateMut.mutate({ id: editing._id, data: d }) : createMut.mutate(d)

  const statusColor = { active:'badge-green', on_leave:'badge-yellow', resigned:'badge-gray', terminated:'badge-red' }

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['employee-activity', activityEmp?._id],
    queryFn: () => api.get(`/employees/${activityEmp._id}/activity`).then((r) => r.data),
    enabled: Boolean(activityEmp?._id),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{data?.count || 0} total employees</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={16}/> Add Employee</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employees..." className="form-input pl-10"/>
        </div>
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} className="form-select sm:w-48">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th>Employee</th><th>ID</th><th>Department</th><th>Designation</th>
            <th>Basic Salary</th><th>EPF No</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
              </td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                <FiUser size={36} className="mx-auto mb-2 opacity-30"/>No employees found
              </td></tr>
            ) : employees.map(emp=>(
              <tr key={emp._id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm flex-shrink-0">
                      {emp.userId?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{emp.userId?.name}</p>
                      <p className="text-xs text-gray-400">{emp.userId?.email}</p>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-navy">{emp.employeeNo}</span></td>
                <td>{emp.department}</td>
                <td>{emp.designation}</td>
                <td className="font-medium">LKR {emp.basicSalary?.toLocaleString()}</td>
                <td className="text-gray-500">{emp.epfNumber||'—'}</td>
                <td><span className={`badge ${statusColor[emp.status]||'badge-gray'} capitalize`}>{emp.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setActivityEmp(emp)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                      title="View activity"
                      type="button"
                    >
                      <FiActivity size={14}/>
                    </button>
                    <button onClick={()=>openEdit(emp)} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={14}/></button>
                    <button onClick={()=>{if(window.confirm('Remove?'))deleteMut.mutate(emp._id)}} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-primary font-heading">{editing?'Edit Employee':'Add Employee'}</h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                {!editing && (<>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="form-label">Full Name *</label>
                      <input {...register('name',{required:true})} placeholder="Full name" className="form-input"/></div>
                    <div><label className="form-label">Email *</label>
                      <input {...register('email',{required:true})} type="email" placeholder="email@raxwo.com" className="form-input"/></div>
                  </div>
                </>)}
                {!editing && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="form-label">Password (Optional)</label>
                      <input {...register('password')} type="password" placeholder="Default: Raxwo@2026" className="form-input"/></div>
                    <div>
                      <label className="form-label">Role *</label>
                      <select {...register('role', { required: true })} className="form-select">
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {editing && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Role</label>
                      <select {...register('role')} className="form-select">
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <p className="text-xs text-slate-400 mt-1">Changing role updates the employee login access.</p>
                    </div>
                    <div />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Department *</label>
                    <select {...register('department',{required:true})} className="form-select">
                      <option value="">Select...</option>
                      {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
                    </select></div>
                  <div><label className="form-label">Designation *</label>
                    <input {...register('designation',{required:true})} placeholder="e.g. Senior Developer" className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Basic Salary (LKR)</label>
                    <input {...register('basicSalary',{valueAsNumber:true})} type="number" placeholder="100000" className="form-input"/></div>
                  <div><label className="form-label">Allowances (LKR)</label>
                    <input {...register('allowances',{valueAsNumber:true})} type="number" placeholder="10000" className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">EPF Number</label>
                    <input {...register('epfNumber')} placeholder="EPF12345" className="form-input"/></div>
                  {!editing && <div><label className="form-label">Join Date *</label>
                    <input {...register('joinedDate',{required:!editing})} type="date" className="form-input"/></div>}
                  {editing && <div><label className="form-label">Status</label>
                    <select {...register('status')} className="form-select">
                      {['active','on_leave','resigned','terminated'].map(s=><option key={s} value={s}>{s}</option>)}
                    </select></div>}
                </div>
                <div className="flex gap-3 pt-2">
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

      <AnimatePresence>
        {activityEmp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{opacity:0, y: 10, scale: 0.98}}
              animate={{opacity:1, y: 0, scale: 1}}
              exit={{opacity:0, y: 10, scale: 0.98}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-lg font-bold text-primary font-heading">Employee Activity</h3>
                  <p className="text-sm text-slate-500">{activityEmp.userId?.name} • {activityEmp.userId?.email}</p>
                </div>
                <button onClick={() => setActivityEmp(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>

              <div className="p-6 space-y-5">
                {activityLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/>
                    <p className="text-sm text-slate-500 mt-3">Loading activity…</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="card card-body">
                        <p className="text-xs text-slate-500">Projects</p>
                        <p className="text-2xl font-extrabold text-primary">{activityData?.overview?.projectsCount || 0}</p>
                      </div>
                      <div className="card card-body">
                        <p className="text-xs text-slate-500">Tasks Completed</p>
                        <p className="text-2xl font-extrabold text-primary">{activityData?.overview?.tasksCompleted || 0}</p>
                      </div>
                      <div className="card card-body">
                        <p className="text-xs text-slate-500">Tasks Pending</p>
                        <p className="text-2xl font-extrabold text-primary">{activityData?.overview?.tasksPending || 0}</p>
                      </div>
                      <div className="card card-body">
                        <p className="text-xs text-slate-500">Attendance (30d)</p>
                        <p className="text-sm text-slate-600 mt-2">
                          Present: <span className="font-semibold text-slate-800">{activityData?.overview?.attendance30d?.present || 0}</span>{' '}
                          • Absent: <span className="font-semibold text-slate-800">{activityData?.overview?.attendance30d?.absent || 0}</span>{' '}
                          • Leave: <span className="font-semibold text-slate-800">{activityData?.overview?.attendance30d?.leave || 0}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-5">
                      <div className="card card-body">
                        <h4 className="font-bold text-primary font-heading mb-3">Recent Projects</h4>
                        <div className="space-y-2">
                          {(activityData?.projects || []).slice(0, 6).map((p) => (
                            <div key={p._id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-800">{p.title}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{p.status} • Progress {p.progress || 0}%</p>
                                </div>
                                <span className="badge badge-navy capitalize">{p.status}</span>
                              </div>
                            </div>
                          ))}
                          {(activityData?.projects || []).length === 0 ? <p className="text-sm text-slate-400">No assigned projects.</p> : null}
                        </div>
                      </div>

                      <div className="card card-body">
                        <h4 className="font-bold text-primary font-heading mb-3">Recent Leaves</h4>
                        <div className="space-y-2">
                          {(activityData?.leaves || []).slice(0, 6).map((l) => (
                            <div key={l._id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-slate-800 capitalize">{l.leaveType}</p>
                                <span className={`badge ${l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : 'badge-yellow'} capitalize`}>{l.status}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()} • {l.days} day(s)
                              </p>
                            </div>
                          ))}
                          {(activityData?.leaves || []).length === 0 ? <p className="text-sm text-slate-400">No leaves yet.</p> : null}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
