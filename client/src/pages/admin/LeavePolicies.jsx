import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { assignableEmployeesUrl } from '../../lib/employeeApi'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiEdit2, FiShield, FiStar, FiTrash2 } from 'react-icons/fi'

const LEAVE_TYPE_OPTIONS = [
  { value: 'annual',      label: 'Annual Leave',       icon: '🌴' },
  { value: 'medical',     label: 'Medical Leave',      icon: '🏥' },
  { value: 'casual',      label: 'Casual Leave',       icon: '☀️' },
  { value: 'half_day',    label: 'Half Day',           icon: '🌗' },
  { value: 'short_leave', label: 'Short Leave (hrs)',  icon: '⏱️' },
  { value: 'maternity',   label: 'Maternity Leave',    icon: '👶' },
  { value: 'paternity',   label: 'Paternity Leave',    icon: '👨‍👧' },
]

export default function LeavePolicies({ triggerNew }) {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (triggerNew) openCreate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerNew])

  const { data, isLoading } = useQuery({
    queryKey: ['leave-policies'],
    queryFn: () => api.get('/leaves/policies').then(r => r.data)
  })

  const { data: branchData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => api.get('/branches').then(r => r.data)
  })
  const branches = branchData?.branches || []

  const { data: empData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get(assignableEmployeesUrl()).then(r => r.data)
  })
  const employees = empData?.employees || []

  const { register, handleSubmit, reset, control } = useForm({
    defaultValues: {
      name: '',
      employmentType: 'all',
      department: '',
      branch: '',
      employee: '',
      duration: 'yearly',
      isDefault: false,
      salaryDeductionEnabled: false,
      deductionPerExtraLeaveDay: 0,
      encashmentEnabled: false,
      encashmentAllowancePerDay: 0,
      quotas: LEAVE_TYPE_OPTIONS.map(t => ({
        leaveType: t.value,
        quota: t.value === 'annual' ? 14 : t.value === 'medical' ? 7 : t.value === 'casual' ? 7 : t.value === 'half_day' ? 6 : t.value === 'short_leave' ? 12 : t.value === 'maternity' ? 84 : 3,
        carryForward: false,
        carryForwardCap: 0,
        requireDocument: t.value === 'medical',
        requireReason: t.value === 'medical',
        deductSalaryOnExcess: false,
        deductionPerExtraDay: 0,
      }))
    }
  })

  const { fields, replace } = useFieldArray({ control, name: 'quotas' })
  const watchedDuration = control._formValues.duration || 'yearly'

  // This function calculates base quota for a given leave type and duration
  const getBaseQuota = (type, dur) => {
    let base = type === 'annual' ? 14 : type === 'medical' ? 7 : type === 'casual' ? 7 : type === 'half_day' ? 6 : type === 'short_leave' ? 12 : type === 'maternity' ? 84 : 3;
    if (dur === '3_months') return Math.ceil(base / 4);
    if (dur === '6_months') return Math.ceil(base / 2);
    return base;
  }

  const createMut = useMutation({
    mutationFn: d => api.post('/leaves/policies', d),
    onSuccess: () => { qc.invalidateQueries(['leave-policies']); toast.success('Policy created'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/leaves/policies/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['leave-policies']); toast.success('Policy updated'); closeModal() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/leaves/policies/${id}`),
    onSuccess: () => { qc.invalidateQueries(['leave-policies']); toast.success('Policy deleted'); setDeleteId(null) },
    onError: e => toast.error(e.response?.data?.message || 'Delete failed'),
  })

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    reset()
  }

  const openCreate = () => {
    reset({
      name: '',
      employmentType: 'all',
      department: '',
      branch: '',
      employee: '',
      duration: 'yearly',
      isDefault: false,
      salaryDeductionEnabled: false,
      deductionPerExtraLeaveDay: 0,
      encashmentEnabled: false,
      encashmentAllowancePerDay: 0,
      quotas: LEAVE_TYPE_OPTIONS.map(t => ({
        leaveType: t.value,
        quota: t.value === 'annual' ? 14 : t.value === 'medical' ? 7 : t.value === 'casual' ? 7 : t.value === 'half_day' ? 6 : t.value === 'short_leave' ? 12 : t.value === 'maternity' ? 84 : 3,
        carryForward: false, carryForwardCap: 0,
        requireDocument: t.value === 'medical',
        requireReason: t.value === 'medical',
        deductSalaryOnExcess: false,
        deductionPerExtraDay: 0,
      }))
    })
    setEditing(null)
    setShowModal(true)
  }

  const openEdit = (policy) => {
    const quotaMap = {}
    policy.quotas.forEach(q => { quotaMap[q.leaveType] = q })
    reset({
      name: policy.name,
      employmentType: policy.employmentType || 'all',
      department: policy.department || '',
      branch: policy.branch?._id || policy.branch || '',
      employee: policy.employee?._id || policy.employee || '',
      duration: policy.duration || 'yearly',
      isDefault: policy.isDefault,
      salaryDeductionEnabled: policy.salaryDeductionEnabled || false,
      deductionPerExtraLeaveDay: policy.deductionPerExtraLeaveDay || 0,
      encashmentEnabled: policy.encashmentEnabled || false,
      encashmentAllowancePerDay: policy.encashmentAllowancePerDay || 0,
      quotas: LEAVE_TYPE_OPTIONS.map(t => ({
        leaveType: t.value,
        quota: quotaMap[t.value]?.quota ?? 0,
        carryForward: quotaMap[t.value]?.carryForward ?? false,
        carryForwardCap: quotaMap[t.value]?.carryForwardCap ?? 0,
        requireDocument: quotaMap[t.value]?.requireDocument ?? (t.value === 'medical'),
        requireReason: quotaMap[t.value]?.requireReason ?? (t.value === 'medical'),
        deductSalaryOnExcess: quotaMap[t.value]?.deductSalaryOnExcess ?? false,
        deductionPerExtraDay: quotaMap[t.value]?.deductionPerExtraDay ?? 0,
      }))
    })
    setEditing(policy)
    setShowModal(true)
  }

  const onSubmit = (data) => {
    editing ? updateMut.mutate({ id: editing._id, data }) : createMut.mutate(data)
  }

  const policies = data?.policies || []

  return (
    <div className="space-y-4 animate-fade-in">

      {isLoading ? (
        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
      ) : policies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400">
          <FiShield size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No leave policies configured yet.</p>
          <p className="text-sm mt-1">The system will use default quotas until a policy is set.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {policies.map(p => (
            <motion.div key={p._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className="card card-body relative">
              {p.isDefault && (
                <div className="absolute top-3 right-3">
                  <span className="badge badge-green gap-1"><FiStar size={10}/> Default</span>
                </div>
              )}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <FiShield className="text-secondary" size={18}/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-500">
                    {p.employee ? `Employee: ${p.employee.userId?.name}` : [p.department, p.employmentType !== 'all' ? p.employmentType : null, p.branch?.name || 'All branches'].filter(Boolean).join(' · ')}
                  </p>
                  <span className="badge badge-gray text-[10px] mt-1 uppercase tracking-wider">{p.duration?.replace('_', ' ') || 'yearly'}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {p.quotas.map(q => {
                  const t = LEAVE_TYPE_OPTIONS.find(x => x.value === q.leaveType)
                  return (
                    <div key={q.leaveType} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{t?.icon} {t?.label || q.leaveType}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{q.quota} {q.leaveType === 'short_leave' ? 'sessions' : 'days'}</span>
                        {q.carryForward && <span className="badge badge-blue text-xs py-0">CF</span>}
                        {q.requireDocument && <span className="badge badge-yellow text-xs py-0">Doc</span>}
                        {q.deductSalaryOnExcess && <span className="badge badge-red text-xs py-0">Deduct</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
              {p.salaryDeductionEnabled && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-orange-600 flex items-center gap-1">
                  ⚠️ Global deduction: LKR {p.deductionPerExtraLeaveDay}/extra day
                </div>
              )}
              {p.encashmentEnabled && (
                <div className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                  💰 Encashment: LKR {p.encashmentAllowancePerDay}/unused day
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(p)} className="btn-ghost btn-sm flex-1 justify-center">
                  <FiEdit2 size={12}/> Edit
                </button>
                <button onClick={() => setDeleteId(p._id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg" title="Delete Policy">
                  <FiTrash2 size={14}/>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <motion.div
            initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b shrink-0">
              <h3 className="text-lg font-bold text-primary font-heading">{editing ? 'Edit Policy' : 'New Leave Policy'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form id="policy-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Policy Name *</label>
                    <input {...register('name', {required:true})} className="form-input" placeholder="e.g. Permanent Staff"/>
                  </div>
                  <div>
                    <label className="form-label">Employment Type</label>
                    <select {...register('employmentType')} className="form-select">
                      <option value="all">All Employment Types</option>
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="part_time">Part Time</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Department (optional)</label>
                    <input {...register('department')} className="form-input" placeholder="e.g. Engineering" />
                  </div>
                  <div>
                    <label className="form-label">Branch (Optional)</label>
                    <select {...register('branch')} className="form-select">
                      <option value="">All Branches</option>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Duration</label>
                    <select 
                      {...register('duration')} 
                      className="form-select"
                      onChange={(e) => {
                        const dur = e.target.value;
                        if (!editing) {
                          // Only auto-adjust when creating new policy
                          replace(LEAVE_TYPE_OPTIONS.map(t => ({
                            leaveType: t.value,
                            quota: getBaseQuota(t.value, dur),
                            carryForward: false, carryForwardCap: 0,
                            requireDocument: t.value === 'medical',
                            requireReason: t.value === 'medical',
                            deductSalaryOnExcess: false, deductionPerExtraDay: 0,
                          })))
                        }
                      }}
                    >
                      <option value="3_months">3 Months</option>
                      <option value="6_months">6 Months</option>
                      <option value="yearly">Yearly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Employee (Optional override)</label>
                    <select {...register('employee')} className="form-select">
                      <option value="">No specific employee</option>
                      {employees.map(e => <option key={e._id} value={e._id}>{e.userId?.name || 'Unknown'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="isDefault" {...register('isDefault')} className="w-4 h-4 accent-secondary"/>
                  <label htmlFor="isDefault" className="text-sm font-medium text-slate-700">Set as default policy (will not override employee-specific policies)</label>
                </div>

                <div>
                  <p className="form-label mb-3">Leave Type Quotas</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-9 gap-0 bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-2">
                      <span className="col-span-2">Type</span>
                      <span>Days/Qty</span>
                      <span>Carry Fwd</span>
                      <span>CF Cap</span>
                      <span>Needs Doc</span>
                      <span>Needs Reason</span>
                      <span>Deduct Excess</span>
                      <span>LKR/Day</span>
                    </div>
                    {fields.map((field, idx) => {
                      const type = LEAVE_TYPE_OPTIONS[idx]
                      return (
                        <div key={field.id} className={`grid grid-cols-9 gap-0 px-4 py-3 items-center text-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <input type="hidden" {...register(`quotas.${idx}.leaveType`)}/>
                          <span className="col-span-2 font-medium text-slate-700">{type?.icon} {type?.label}</span>
                          <input {...register(`quotas.${idx}.quota`, { valueAsNumber: true })} type="number" min="0" className="form-input py-1 text-sm w-16"/>
                          <label className="flex items-center justify-center">
                            <input type="checkbox" {...register(`quotas.${idx}.carryForward`)} className="w-4 h-4 accent-secondary"/>
                          </label>
                          <input {...register(`quotas.${idx}.carryForwardCap`, { valueAsNumber: true })} type="number" min="0" className="form-input py-1 text-sm w-16"/>
                          <label className="flex items-center justify-center">
                            <input type="checkbox" {...register(`quotas.${idx}.requireDocument`)} className="w-4 h-4 accent-amber-500"/>
                          </label>
                          <label className="flex items-center justify-center">
                            <input type="checkbox" {...register(`quotas.${idx}.requireReason`)} className="w-4 h-4 accent-secondary"/>
                          </label>
                          <label className="flex items-center justify-center" title="Deduct salary when this leave type is overused">
                            <input type="checkbox" {...register(`quotas.${idx}.deductSalaryOnExcess`)} className="w-4 h-4 accent-red-500"/>
                          </label>
                          <input {...register(`quotas.${idx}.deductionPerExtraDay`, { valueAsNumber: true })} type="number" min="0" className="form-input py-1 text-sm w-16" placeholder="0"/>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Global salary deduction */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-orange-800">⚠️ Global Salary Deduction</p>
                      <p className="text-xs text-orange-600 mt-0.5">Deduct from salary for ANY leave taken beyond quota (overridden by per-type settings above)</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register('salaryDeductionEnabled')} className="w-4 h-4 accent-orange-500" />
                      <span className="text-sm font-medium text-orange-700">Enable</span>
                    </label>
                  </div>
                  <div>
                    <label className="form-label text-xs">Deduction Amount per Extra Day (LKR)</label>
                    <input {...register('deductionPerExtraLeaveDay', { valueAsNumber: true })} type="number" min="0" className="form-input w-40" placeholder="e.g. 1500" />
                  </div>
                </div>

                {/* Leave Encashment / Allowance */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-800">💰 Unused Leave Encashment (Allowance)</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Provide extra income (allowance) for unused leaves at the end of cycle</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register('encashmentEnabled')} className="w-4 h-4 accent-emerald-500" />
                      <span className="text-sm font-medium text-emerald-700">Enable</span>
                    </label>
                  </div>
                  <div>
                    <label className="form-label text-xs">Allowance Amount per Unused Day (LKR)</label>
                    <input {...register('encashmentAllowancePerDay', { valueAsNumber: true })} type="number" min="0" className="form-input w-40" placeholder="e.g. 2000" />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t bg-slate-50 rounded-b-2xl shrink-0 flex gap-3">
              <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button type="submit" form="policy-form" disabled={createMut.isPending || updateMut.isPending} className="btn-primary flex-1 justify-center">
                {createMut.isPending || updateMut.isPending ? <span className="spinner"/> : editing ? 'Save Changes' : 'Create Policy'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
      {/* Delete Confirm */}
      {deleteId && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{zIndex:999999}}>
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto"><FiTrash2 size={22}/></div>
            <h3 className="font-bold text-lg text-slate-800">Delete Policy?</h3>
            <p className="text-sm text-slate-500">This will permanently remove the leave policy. Employees assigned this policy will fall back to the default.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={() => deleteMut.mutate(deleteId)} disabled={deleteMut.isPending} className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 border-red-600">
                {deleteMut.isPending ? <span className="spinner"/> : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
