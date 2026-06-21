import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { assignableEmployeesUrl } from '../../lib/employeeApi'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiEdit2, FiTrash2, FiClock, FiStar } from 'react-icons/fi'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const EMPTY = {
  name:'', employee:'', branch:'', isDefault:false,
  workStartTime:'09:00', workEndTime:'18:00',
  workHoursPerDay:8, workDaysPerWeek:5,
  workDays:['Mon','Tue','Wed','Thu','Fri'],
  lateGraceMinutes:15, halfDayThresholdHours:4,
  overtimeEligible:false, overtimeRateMultiplier:1.5,
  latePenaltyEnabled:false, latePenaltyDeductionPerDay:0,
  absentDeductionPerDay:0, shortLeaveMaxPerMonth:2,
  shortLeaveDurationHours:2, notes:'',
}

export default function AttendancePolicies({ triggerNew }) {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (triggerNew) openCreate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerNew])

  const { data, isLoading } = useQuery({ queryKey:['attendance-policies'], queryFn:()=>api.get('/attendance-policies').then(r=>r.data) })
  const { data: branchData } = useQuery({ queryKey:['branches-list'], queryFn:()=>api.get('/branches').then(r=>r.data) })
  const { data: empData } = useQuery({ queryKey:['employees-list-mini'], queryFn:()=>api.get(assignableEmployeesUrl()).then(r=>r.data) })
  const branches = branchData?.branches || []
  const employees = empData?.employees || []
  const policies = data?.policies || []

  const inv = () => qc.invalidateQueries(['attendance-policies'])
  const f = (k,v) => setForm(s=>({...s,[k]:v}))

  const saveMut = useMutation({
    mutationFn: d => editing ? api.put(`/attendance-policies/${editing._id}`,d) : api.post('/attendance-policies',d),
    onSuccess: ()=>{ inv(); toast.success(editing?'Updated':'Created'); setShowModal(false); setEditing(null); setForm(EMPTY) },
    onError: e=>toast.error(e.response?.data?.message||'Failed'),
  })
  const delMut = useMutation({
    mutationFn: id=>api.delete(`/attendance-policies/${id}`),
    onSettled: ()=>{ inv(); setDeleteId(null) },
    onSuccess: ()=>toast.success('Deleted'),
  })

  const openEdit = p => { setEditing(p); setForm({...EMPTY,...p,employee:p.employee?._id||p.employee||'',branch:p.branch?._id||p.branch||''}); setShowModal(true) }
  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const toggleDay = d => f('workDays', form.workDays.includes(d) ? form.workDays.filter(x=>x!==d) : [...form.workDays,d])

  return (
    <div className="space-y-4">

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/></div>
      ) : policies.length===0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          <FiClock size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No attendance policies yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {policies.map(p=>(
            <motion.div key={p._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="card card-body relative">
              {p.isDefault && <div className="absolute top-3 right-3"><span className="badge badge-green gap-1"><FiStar size={10}/>Default</span></div>}
                <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><FiClock className="text-blue-600" size={18}/></div>
                <div>
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-500">
                    {p.employee ? `👤 ${p.employee.userId?.name}` : p.branch?.name || 'All Branches'}
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex justify-between"><span className="text-slate-400">Hours</span><span className="font-medium">{p.workStartTime} – {p.workEndTime} ({p.workHoursPerDay}h)</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Late Grace</span><span className="font-medium">{p.lateGraceMinutes} min</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Half Day</span><span className="font-medium">&lt; {p.halfDayThresholdHours}h</span></div>
                {p.latePenaltyEnabled && <div className="flex justify-between"><span className="text-slate-400">Late Penalty</span><span className="font-medium text-orange-600">LKR {p.latePenaltyDeductionPerDay}/day</span></div>}
                {p.absentDeductionPerDay>0 && <div className="flex justify-between"><span className="text-slate-400">Absent Deduct</span><span className="font-medium text-red-600">LKR {p.absentDeductionPerDay}/day</span></div>}
                <div className="flex gap-1 mt-2 flex-wrap">{(p.workDays||[]).map(d=><span key={d} className="badge badge-blue text-xs py-0">{d}</span>)}</div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={()=>openEdit(p)} className="btn-ghost btn-sm flex-1 justify-center"><FiEdit2 size={12}/> Edit</button>
                <button onClick={()=>setDeleteId(p._id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"><FiTrash2 size={14}/></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <h3 className="font-bold text-primary">{editing?'Edit':'New'} Attendance Policy</h3>
              <button onClick={()=>setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="form-label">Policy Name *</label><input className="form-input" value={form.name} onChange={e=>f('name',e.target.value)} placeholder="e.g. Standard Office Policy"/></div>
                <div>
                  <label className="form-label">Specific Employee <span className="text-slate-400 text-xs">(optional)</span></label>
                  <select className="form-select" value={form.employee} onChange={e=>f('employee',e.target.value)}>
                    <option value="">— All Employees (Global/Branch) —</option>
                    {employees.map(e=><option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeNo})</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Branch <span className="text-slate-400 text-xs">(optional)</span></label>
                  <select className="form-select" value={form.branch} onChange={e=>f('branch',e.target.value)}>
                    <option value="">All Branches</option>
                    {branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="defAtt" checked={!!form.isDefault} onChange={e=>f('isDefault',e.target.checked)} className="w-4 h-4 accent-secondary"/>
                  <label htmlFor="defAtt" className="text-sm font-medium">Set as Default Policy</label>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Working Hours</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="form-label">Start Time</label><input type="time" className="form-input" value={form.workStartTime} onChange={e=>f('workStartTime',e.target.value)}/></div>
                <div><label className="form-label">End Time</label><input type="time" className="form-input" value={form.workEndTime} onChange={e=>f('workEndTime',e.target.value)}/></div>
                <div><label className="form-label">Hours/Day</label><input type="number" className="form-input" value={form.workHoursPerDay} onChange={e=>f('workHoursPerDay',Number(e.target.value))}/></div>
                <div><label className="form-label">Days/Week</label><input type="number" className="form-input" value={form.workDaysPerWeek} onChange={e=>f('workDaysPerWeek',Number(e.target.value))}/></div>
              </div>
              <div>
                <label className="form-label">Work Days</label>
                <div className="flex gap-2 flex-wrap">{DAYS.map(d=>(
                  <button key={d} type="button" onClick={()=>toggleDay(d)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all ${form.workDays.includes(d)?'bg-secondary text-white border-secondary':'border-slate-200 text-slate-500 hover:border-secondary'}`}>{d}</button>
                ))}</div>
              </div>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Rules & Thresholds</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="form-label">Late Grace (min)</label><input type="number" className="form-input" value={form.lateGraceMinutes} onChange={e=>f('lateGraceMinutes',Number(e.target.value))}/></div>
                <div><label className="form-label">Half-Day Below (hrs)</label><input type="number" className="form-input" value={form.halfDayThresholdHours} onChange={e=>f('halfDayThresholdHours',Number(e.target.value))}/></div>
                <div><label className="form-label">Short Leave/Month</label><input type="number" className="form-input" value={form.shortLeaveMaxPerMonth} onChange={e=>f('shortLeaveMaxPerMonth',Number(e.target.value))}/></div>
                <div><label className="form-label">Short Leave Duration (hrs)</label><input type="number" className="form-input" value={form.shortLeaveDurationHours} onChange={e=>f('shortLeaveDurationHours',Number(e.target.value))}/></div>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="latePen" checked={!!form.latePenaltyEnabled} onChange={e=>f('latePenaltyEnabled',e.target.checked)} className="w-4 h-4 accent-orange-500"/>
                  <label htmlFor="latePen" className="text-sm font-bold text-orange-800">Enable Late Penalty Deductions</label>
                </div>
                {form.latePenaltyEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label text-xs">Late Deduction (LKR/day)</label><input type="number" className="form-input" value={form.latePenaltyDeductionPerDay} onChange={e=>f('latePenaltyDeductionPerDay',Number(e.target.value))}/></div>
                    <div><label className="form-label text-xs">Absent Deduction (LKR/day)</label><input type="number" className="form-input" value={form.absentDeductionPerDay} onChange={e=>f('absentDeductionPerDay',Number(e.target.value))}/></div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="otElig" checked={!!form.overtimeEligible} onChange={e=>f('overtimeEligible',e.target.checked)} className="w-4 h-4 accent-secondary"/>
                <label htmlFor="otElig" className="text-sm font-medium">Overtime Eligible</label>
                {form.overtimeEligible && <span className="ml-2 text-sm text-slate-500">Rate: <input type="number" step="0.1" className="form-input inline-block w-20 py-1" value={form.overtimeRateMultiplier} onChange={e=>f('overtimeRateMultiplier',Number(e.target.value))}/>x</span>}
              </div>
              <div><label className="form-label">Notes</label><textarea rows={2} className="form-input resize-none" value={form.notes} onChange={e=>f('notes',e.target.value)}/></div>
            </div>
            <div className="flex gap-3 p-5 border-t shrink-0">
              <button onClick={()=>setShowModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button disabled={saveMut.isPending||!form.name} onClick={()=>saveMut.mutate(form)} className="btn-primary flex-1 justify-center">
                {saveMut.isPending?<span className="spinner"/>:editing?'Save Changes':'Create Policy'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {/* Delete confirm */}
      {deleteId && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto"><FiTrash2 size={20}/></div>
            <h3 className="font-bold text-lg">Delete Policy?</h3>
            <p className="text-sm text-slate-500">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteId(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={()=>delMut.mutate(deleteId)} disabled={delMut.isPending} className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700">
                {delMut.isPending?<span className="spinner"/>:'Delete'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}
    </div>
  )
}
