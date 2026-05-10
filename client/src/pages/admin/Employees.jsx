import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiX, FiActivity, FiUpload, FiFile, FiLink, FiCheck, FiEye, FiAlertCircle } from 'react-icons/fi'
import EmployeeDetail from './EmployeeDetail'

const DEPARTMENTS = ['Engineering','Design','Marketing','HR','Finance','Operations','Sales','Infrastructure']
const ROLES = [
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
]

const MAX_FILE_MB = 5
const FileUploadField = ({ label, accept, hint, file, setFile, existingUrl, icon: Icon = FiFile }) => {
  const ref = useRef()
  const handleChange = e => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`Max file size is ${MAX_FILE_MB}MB`); return }
    setFile(f)
  }
  return (
    <div>
      <label className="form-label">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-secondary hover:bg-blue-50/30'
        }`}
      >
        {file ? <FiCheck size={16} className="text-green-600 flex-shrink-0"/> : <Icon size={16} className="text-gray-400 flex-shrink-0"/>}
        <div className="min-w-0 flex-1">
          {file
            ? <p className="text-sm font-medium text-green-700 truncate">{file.name}</p>
            : existingUrl
              ? <p className="text-xs text-blue-600 truncate">Uploaded ✓ — click to replace</p>
              : <p className="text-sm text-gray-400">Click to upload {hint}</p>
          }
          {!file && <p className="text-xs text-gray-300 mt-0.5">Max {MAX_FILE_MB}MB · {accept}</p>}
        </div>
        {existingUrl && !file && (
          <a href={existingUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            className="text-xs text-blue-500 hover:underline flex-shrink-0">View</a>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange}/>
    </div>
  )
}

export default function AdminEmployees() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [activityEmp, setActivityEmp] = useState(null)
  const [cvFile, setCvFile] = useState(null)
  const [agreementFile, setAgreementFile] = useState(null)
  const [nicFile, setNicFile] = useState(null)
  const [nicBackFile, setNicBackFile] = useState(null)
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)
  const [viewEmp, setViewEmp] = useState(null)
  const { register, handleSubmit, reset, setValue, control } = useForm()
  const watchedType = useWatch({ control, name: 'employmentType', defaultValue: 'permanent' })

  const [empTypeFilter, setEmpTypeFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []

  const { data, isLoading } = useQuery({
    queryKey: ['employees', deptFilter, empTypeFilter, branchFilter],
    queryFn: () => api.get(`/employees?${deptFilter?`department=${deptFilter}&`:''}${empTypeFilter?`employmentType=${empTypeFilter}&`:''}${branchFilter?`branch=${branchFilter}`:''}`).then(r => r.data),
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

  const openCreate = () => { reset(); setEditing(null); setCvFile(null); setAgreementFile(null); setNicFile(null); setShowModal(true) }
  const openEdit = emp => {
    setEditing(emp)
    ;[
      'department', 'designation', 'basicSalary', 'allowances', 'status', 'epfNumber',
      'idType', 'idNumber', 'dob', 'primaryPhone', 'secondaryPhone', 'address',
      'maxLeavesPerYear', 'portfolioUrl', 'gender', 'employmentType', 'branch'
    ].forEach(k => setValue(k, emp[k]))
    setValue('emergencyContactName', emp?.emergencyContact?.name || '')
    setValue('emergencyContactPhone', emp?.emergencyContact?.phone || '')
    setValue('emergencyContactRelationship', emp?.emergencyContact?.relationship || '')
    setValue('role', emp.userId?.role || 'developer')
    // Internship fields
    if (emp.internship) {
      setValue('internship.startDate', emp.internship.startDate?.split('T')[0] || '')
      setValue('internship.endDate', emp.internship.endDate?.split('T')[0] || '')
      setValue('internship.durationWeeks', emp.internship.durationWeeks || '')
      setValue('internship.university', emp.internship.university || '')
      setValue('internship.supervisorName', emp.internship.supervisorName || '')
    }
    setCvFile(null); setAgreementFile(null); setNicFile(null); setNicBackFile(null)
    setProfilePhotoFile(null); setProfilePhotoPreview(editing?.profilePhoto || null)
    setShowModal(true)
  }
  const closeModal = () => {
    setShowModal(false); setEditing(null); reset()
    setCvFile(null); setAgreementFile(null); setNicFile(null); setNicBackFile(null)
    setProfilePhotoFile(null); setProfilePhotoPreview(null)
  }
  const uploadFile = async (file, field) => {
    if (!file) return null
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/uploads/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data?.fileUrl || data?.url || null
  }

  const onSubmit = async (d) => {
    try {
      const [cvUrl, agreementUrl, nicPhotoUrl, nicPhotoBackUrl, profilePhoto] = await Promise.all([
        uploadFile(cvFile),
        uploadFile(agreementFile),
        uploadFile(nicFile),
        uploadFile(nicBackFile),
        uploadFile(profilePhotoFile),
      ])
      const payload = {
        ...d,
        emergencyContact: {
          name: d.emergencyContactName || '',
          phone: d.emergencyContactPhone || '',
          relationship: d.emergencyContactRelationship || '',
        },
        ...(cvUrl && { cvUrl }),
        ...(agreementUrl && { agreementUrl }),
        ...(nicPhotoUrl && { nicPhotoUrl }),
        ...(nicPhotoBackUrl && { nicPhotoBackUrl }),
        ...(profilePhoto && { profilePhoto }),
      }
      if (!payload.emergencyContact.name && !payload.emergencyContact.phone) delete payload.emergencyContact
      delete payload.emergencyContactName
      delete payload.emergencyContactPhone
      delete payload.emergencyContactRelationship
      return editing ? updateMut.mutate({ id: editing._id, data: payload }) : createMut.mutate(payload)
    } catch(err) {
      toast.error('File upload failed. Please try again.')
    }
  }

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

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employees..." className="form-input pl-10"/>
        </div>
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} className="form-select sm:w-48">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
        </select>
        <select value={empTypeFilter} onChange={e=>setEmpTypeFilter(e.target.value)} className="form-select sm:w-44">
          <option value="">All Types</option>
          <option value="permanent">Permanent</option>
          <option value="intern">Intern</option>
          <option value="contract">Contract</option>
          <option value="part_time">Part Time</option>
        </select>
        <select value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} className="form-select sm:w-44">
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
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
                    {emp.profilePhoto
                      ? <img src={emp.profilePhoto} alt={emp.userId?.name}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-white shadow"/>
                      : <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm flex-shrink-0">
                          {emp.userId?.name?.charAt(0).toUpperCase()}
                        </div>
                    }
                    <div>
                      <p className="font-medium text-gray-800">{emp.userId?.name}</p>
                      <p className="text-xs text-gray-400">{emp.userId?.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-navy">{emp.employeeNo}</span>
                  {emp.employmentType === 'intern' && (
                    <span className="badge badge-yellow ml-1">Intern</span>
                  )}
                  {emp.employmentType === 'contract' && (
                    <span className="badge badge-purple ml-1">Contract</span>
                  )}
                  {emp.employmentType === 'part_time' && (
                    <span className="badge badge-gray ml-1">Part-time</span>
                  )}
                  {/* Internship days remaining warning */}
                  {emp.employmentType === 'intern' && emp.internshipDaysRemaining !== null && (
                    <div className={`text-xs mt-1 font-medium flex items-center gap-1 ${emp.internshipDaysRemaining <= 14 ? 'text-red-500' : 'text-slate-400'}`}>
                      {emp.internshipDaysRemaining <= 14 && <FiAlertCircle size={11} />}
                      {emp.internshipDaysRemaining} days left
                    </div>
                  )}
                </td>
                <td>{emp.department}</td>
                <td>{emp.designation}</td>
                <td className="font-medium">LKR {emp.basicSalary?.toLocaleString()}</td>
                <td className="text-gray-500">{emp.epfNumber||'—'}</td>
                <td><span className={`badge ${statusColor[emp.status]||'badge-gray'} capitalize`}>{emp.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => setViewEmp(emp)}
                      className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                      <FiEye size={14}/>
                    </button>
                    <button
                      onClick={() => setActivityEmp(emp)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                      title="View activity" type="button">
                      <FiActivity size={14}/>
                    </button>
                    <button onClick={()=>openEdit(emp)} className="p-1.5 text-gray-400 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={14}/></button>
                    <button onClick={()=>{if(window.confirm('Remove this employee? All data is retained.'))deleteMut.mutate(emp._id)}} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
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
                  <div><label className="form-label">Identity Type</label>
                    <select {...register('idType')} className="form-select">
                      <option value="nic">NIC</option>
                      <option value="driving_license">Driving License</option>
                      <option value="passport">Passport</option>
                    </select></div>
                  <div><label className="form-label">ID Number</label>
                    <input {...register('idNumber')} placeholder="Enter ID number" className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Birth Date</label>
                    <input {...register('dob')} type="date" className="form-input"/></div>
                  <div><label className="form-label">Primary Phone</label>
                    <input {...register('primaryPhone')} placeholder="+94..." className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="form-label">Secondary Phone</label>
                    <input {...register('secondaryPhone')} placeholder="Optional" className="form-input"/></div>
                  <div><label className="form-label">Gender</label>
                    <select {...register('gender')} className="form-select">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select></div>
                </div>
                <div><label className="form-label">Portfolio / LinkedIn URL</label>
                  <div className="relative">
                    <FiLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input {...register('portfolioUrl')} placeholder="https://linkedin.com/in/... or portfolio link" className="form-input pl-9"/>
                  </div>
                </div>
                {/* Profile Photo Upload */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="relative flex-shrink-0">
                    {profilePhotoPreview
                      ? <img src={profilePhotoPreview} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"/>
                      : <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-2xl font-bold border-4 border-white shadow-md">
                          <FiUser size={28}/>
                        </div>
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Profile Photo</p>
                    <p className="text-xs text-slate-400 mb-2">JPG, PNG or WEBP · Max 5MB</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg text-xs font-medium transition-colors">
                      <FiUpload size={12}/> {profilePhotoPreview ? 'Change Photo' : 'Upload Photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        if (f.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
                        setProfilePhotoFile(f)
                        setProfilePhotoPreview(URL.createObjectURL(f))
                      }}/>
                    </label>
                    {profilePhotoPreview && (
                      <button type="button" onClick={() => { setProfilePhotoFile(null); setProfilePhotoPreview(null) }}
                        className="ml-2 text-xs text-red-400 hover:text-red-600">Remove</button>
                    )}
                  </div>
                </div>
                {/* Document Uploads */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Document Uploads</p>
                  <FileUploadField
                    label="CV / Resume (PDF, max 5MB)"
                    accept=".pdf"
                    hint="PDF only"
                    file={cvFile}
                    setFile={setCvFile}
                    existingUrl={editing?.cvUrl}
                    icon={FiFile}
                  />
                  <FileUploadField
                    label="Employment Agreement (PDF)"
                    accept=".pdf"
                    hint="PDF only"
                    file={agreementFile}
                    setFile={setAgreementFile}
                    existingUrl={editing?.agreementUrl}
                    icon={FiFile}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FileUploadField
                      label="NIC / Licence — Front"
                      accept=".pdf,image/*"
                      hint="PDF or image"
                      file={nicFile}
                      setFile={setNicFile}
                      existingUrl={editing?.nicPhotoUrl}
                      icon={FiUpload}
                    />
                    <FileUploadField
                      label="NIC / Licence — Back"
                      accept=".pdf,image/*"
                      hint="PDF or image"
                      file={nicBackFile}
                      setFile={setNicBackFile}
                      existingUrl={editing?.nicPhotoBackUrl}
                      icon={FiUpload}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Address</label>
                  <textarea {...register('address')} rows={2} placeholder="Employee address" className="form-input" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="form-label">Emergency Contact Name</label>
                    <input {...register('emergencyContactName')} placeholder="Contact person" className="form-input"/></div>
                  <div><label className="form-label">Emergency Contact Phone</label>
                    <input {...register('emergencyContactPhone')} placeholder="+94..." className="form-input"/></div>
                  <div><label className="form-label">Relationship</label>
                    <input {...register('emergencyContactRelationship')} placeholder="e.g. Sister" className="form-input"/></div>
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
                  <div><label className="form-label">Max Leaves / Year</label>
                    <input {...register('maxLeavesPerYear',{valueAsNumber:true})} type="number" placeholder="24" className="form-input"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Employment Type</label>
                    <select {...register('employmentType')} className="form-select">
                      <option value="permanent">Permanent</option>
                      <option value="intern">Intern</option>
                      <option value="contract">Contract</option>
                      <option value="part_time">Part Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Branch</label>
                    <select {...register('branch')} className="form-select">
                      <option value="">Select Branch</option>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                {/* Internship Details — Only when type = intern */}
                {watchedType === 'intern' && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">🎓 Internship Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="form-label text-xs">Start Date</label>
                        <input {...register('internship.startDate')} type="date" className="form-input" /></div>
                      <div><label className="form-label text-xs">End Date</label>
                        <input {...register('internship.endDate')} type="date" className="form-input" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="form-label text-xs">Duration (weeks)</label>
                        <input {...register('internship.durationWeeks', { valueAsNumber: true })} type="number" className="form-input" placeholder="12" /></div>
                      <div><label className="form-label text-xs">University / Institute</label>
                        <input {...register('internship.university')} className="form-input" placeholder="e.g. SLIIT" /></div>
                    </div>
                    <div><label className="form-label text-xs">Supervisor Name</label>
                      <input {...register('internship.supervisorName')} className="form-input" placeholder="Internal supervisor" /></div>
                  </div>
                )}

                {/* Contract Details — Only when type = contract */}
                {watchedType === 'contract' && (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">📄 Contract Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="form-label text-xs">Contract Start</label>
                        <input {...register('contract.startDate')} type="date" className="form-input" /></div>
                      <div><label className="form-label text-xs">Contract End</label>
                        <input {...register('contract.endDate')} type="date" className="form-input" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="form-label text-xs">Contract Type</label>
                        <input {...register('contract.contractType')} className="form-input" placeholder="e.g. Fixed Term, Project Based" /></div>
                      <div><label className="form-label text-xs">Renewal Date</label>
                        <input {...register('contract.renewalDate')} type="date" className="form-input" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="form-label text-xs">Notice Period (days)</label>
                        <input {...register('contract.noticePeriodDays', { valueAsNumber: true })} type="number" className="form-input" defaultValue={30} /></div>
                      <div><label className="form-label text-xs">Probation Period (days)</label>
                        <input {...register('contract.probationPeriodDays', { valueAsNumber: true })} type="number" className="form-input" defaultValue={90} /></div>
                    </div>
                    <div><label className="form-label text-xs">Contract Notes</label>
                      <textarea {...register('contract.notes')} rows={2} className="form-input" placeholder="Additional notes..." /></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
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
        </div>,
        document.body
      )}

      {activityEmp && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
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
        </div>,
        document.body
      )}

      {viewEmp && (
        <EmployeeDetail
          employee={viewEmp}
          onClose={() => setViewEmp(null)}
          onEdit={() => { openEdit(viewEmp); setViewEmp(null) }}
        />
      )}
    </div>
  )
}
