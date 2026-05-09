import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiCalendar, FiAlertTriangle, FiUpload, FiInfo, FiCheckCircle } from 'react-icons/fi'

const LEAVE_TYPES = [
  { value: 'annual',      label: 'Annual Leave',        balanceLabel: 'Annual',    icon: '🌴' },
  { value: 'medical',     label: 'Medical Leave',        balanceLabel: 'Medical',   icon: '🏥', requireDoc: true, requireReason: true },
  { value: 'casual',      label: 'Casual Leave',         balanceLabel: 'Casual',    icon: '☀️' },
  { value: 'half_day',    label: 'Half Day',             balanceLabel: 'Half Day',  icon: '🌗' },
  { value: 'short_leave', label: 'Short Leave (≤3h)',    balanceLabel: 'Short',     icon: '⏱️' },
  { value: 'no_pay',      label: 'No Pay Leave',         balanceLabel: null,        icon: '📋' },
  { value: 'maternity',   label: 'Maternity Leave',      balanceLabel: 'Maternity', icon: '👶' },
  { value: 'paternity',   label: 'Paternity Leave',      balanceLabel: 'Paternity', icon: '👨‍👧' },
]

const STATUS_BADGE = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' }
const TYPE_BADGE   = {
  annual:'badge-blue', medical:'badge-red', casual:'badge-yellow',
  half_day:'badge-blue', short_leave:'badge-purple', no_pay:'badge-gray',
  maternity:'badge-purple', paternity:'badge-navy'
}

const SHORT_DURATIONS = [
  { value: 1, label: '1 Hour' },
  { value: 2, label: '2 Hours' },
  { value: 3, label: '3 Hours' },
]

export default function EmployeeLeaves() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [docFile, setDocFile] = useState(null)

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { leaveType: 'annual', halfDayPeriod: 'AM', shortLeaveDuration: 1 }
  })

  const leaveType = watch('leaveType')
  const startDate = watch('startDate')
  const endDate   = watch('endDate')
  const shortDuration = Number(watch('shortLeaveDuration') || 1)

  const isHalfDay = leaveType === 'half_day'
  const isShort   = leaveType === 'short_leave'
  const isMedical = leaveType === 'medical'

  // Working days requested
  const daysRequested = isHalfDay ? 0.5
    : isShort ? shortDuration / 8
    : (startDate && endDate ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1) : 0)

  // Set endDate = startDate for half_day/short_leave
  useEffect(() => {
    if ((isHalfDay || isShort) && startDate) setValue('endDate', startDate)
  }, [isHalfDay, isShort, startDate, setValue])

  const { data, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => api.get('/leaves/my').then(r => r.data)
  })

  const { data: balanceData } = useQuery({
    queryKey: ['my-leave-balances'],
    queryFn: () => api.get('/leaves/my/balances').then(r => r.data),
    enabled: showModal
  })

  const balances = balanceData?.balances || {}
  const currentTypeBalance = balances[leaveType]

  const leaves = data?.leaves || []
  const allBalances = data?.balances || {}

  const requestMut = useMutation({
    mutationFn: (formData) => api.post('/leaves', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leaves'] })
      qc.invalidateQueries({ queryKey: ['my-leave-balances'] })
      toast.success('Leave request submitted!')
      close()
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to submit'),
  })

  const close = () => {
    setShowModal(false)
    setDocFile(null)
    reset({ leaveType: 'annual', halfDayPeriod: 'AM', shortLeaveDuration: 1 })
  }

  const onSubmit = (data) => {
    if (isMedical && !docFile) {
      toast.error('Medical leave requires a document (MC / medical certificate)')
      return
    }
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== '') fd.append(k, v) })
    if (docFile) fd.append('document', docFile)
    requestMut.mutate(fd)
  }

  // Balance bars
  const balanceTypes = LEAVE_TYPES.filter(t => t.balanceLabel && allBalances[t.value])

  const isSufficient = !currentTypeBalance || currentTypeBalance.remaining >= daysRequested

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leave Requests</h1>
          <p className="page-subtitle">
            {leaves.filter(l => l.status === 'approved').length} approved &middot; {leaves.filter(l => l.status === 'pending').length} pending
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
          <FiPlus size={15}/> Request Leave
        </button>
      </div>

      {/* Balance Cards */}
      {balanceTypes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {balanceTypes.map(t => {
            const b = allBalances[t.value]
            if (!b) return null
            const pct = b.quota > 0 ? Math.min(100, (b.remaining / b.quota) * 100) : 0
            return (
              <div key={t.value} className="card p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{t.icon}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.remaining === 0 ? 'bg-red-100 text-red-700' : b.remaining < b.quota * 0.3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {b.remaining} / {b.quota}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mb-2">{t.label}</p>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${b.remaining === 0 ? 'bg-red-500' : b.remaining < b.quota * 0.3 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{b.used} used</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Leave History */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-slate-200">
            <FiCalendar size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No leave requests yet</p>
          </div>
        ) : leaves.map(l => (
          <motion.div key={l._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="card card-body card-hover">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  <span className={`badge capitalize ${TYPE_BADGE[l.leaveType]||'badge-gray'}`}>
                    {l.leaveType?.replace('_',' ')}
                  </span>
                  <span className={`badge ${STATUS_BADGE[l.status]}`}>{l.status}</span>
                  {l.days > 0 && <span className="badge badge-navy">{l.days === 0.5 ? 'Half Day' : `${l.days} day${l.days > 1 ? 's' : ''}`}</span>}
                  {l.halfDayPeriod && <span className="badge badge-blue">{l.halfDayPeriod}</span>}
                  {l.shortLeaveDuration && <span className="badge badge-purple">{l.shortLeaveDuration}h</span>}
                  {l.insufficientBalance && <span className="badge badge-red gap-1"><FiAlertTriangle size={11}/> Insufficient Balance</span>}
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <FiCalendar size={13}/>
                  {new Date(l.startDate).toLocaleDateString('en-LK')}
                  {!isHalfDay && !isShort && new Date(l.startDate).toDateString() !== new Date(l.endDate).toDateString() && (
                    <> &rarr; {new Date(l.endDate).toLocaleDateString('en-LK')}</>
                  )}
                  {l.shortLeaveStart && <span className="text-slate-400 text-xs ml-1">({l.shortLeaveStart} – {l.shortLeaveEnd})</span>}
                </p>
                {l.reason && <p className="text-xs text-gray-500"><span className="font-medium">Reason:</span> {l.reason}</p>}
                {l.remarks && <p className="text-xs text-blue-600"><span className="font-medium">Remarks:</span> {l.remarks}</p>}
                {l.rejectedReason && <p className="text-xs text-red-500"><span className="font-medium">Rejection reason:</span> {l.rejectedReason}</p>}
              </div>
              <p className="text-xs text-gray-400 shrink-0">{new Date(l.createdAt).toLocaleDateString('en-LK')}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Request Leave Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <motion.div
            initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b shrink-0">
              <h3 className="text-lg font-bold text-primary font-heading">Request Leave</h3>
              <button onClick={close} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>

            <div className="overflow-y-auto flex-1">
              <form id="leave-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                {/* Leave Type */}
                <div>
                  <label className="form-label">Leave Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAVE_TYPES.map(t => (
                      <label key={t.value}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-sm font-medium ${leaveType === t.value ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        <input type="radio" {...register('leaveType')} value={t.value} className="hidden"/>
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Current type balance info */}
                {currentTypeBalance && (
                  <div className={`rounded-xl p-3 flex items-start gap-2.5 text-sm ${currentTypeBalance.remaining === 0 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                    {currentTypeBalance.remaining === 0 ? <FiAlertTriangle className="shrink-0 mt-0.5"/> : <FiInfo className="shrink-0 mt-0.5"/>}
                    <div>
                      <p className="font-medium">
                        {currentTypeBalance.remaining > 0
                          ? `${currentTypeBalance.remaining} day${currentTypeBalance.remaining !== 1 ? 's' : ''} remaining`
                          : 'No balance remaining'}
                      </p>
                      <p className="text-xs opacity-75 mt-0.5">{currentTypeBalance.used} used of {currentTypeBalance.quota} total days</p>
                    </div>
                  </div>
                )}

                {/* Date Fields */}
                {isHalfDay ? (
                  <div className="space-y-3">
                    <div>
                      <label className="form-label">Date *</label>
                      <input {...register('startDate', {required:true})} type="date" className="form-input"/>
                    </div>
                    <div>
                      <label className="form-label">Period</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{v:'AM', label:'Morning (AM)'}, {v:'PM', label:'Afternoon (PM)'}].map(p => (
                          <label key={p.v} className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all ${watch('halfDayPeriod') === p.v ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                            <input type="radio" {...register('halfDayPeriod')} value={p.v} className="hidden"/>
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : isShort ? (
                  <div className="space-y-3">
                    <div>
                      <label className="form-label">Date *</label>
                      <input {...register('startDate', {required:true})} type="date" className="form-input"/>
                    </div>
                    <div>
                      <label className="form-label">Duration</label>
                      <div className="grid grid-cols-3 gap-2">
                        {SHORT_DURATIONS.map(d => (
                          <label key={d.value} className={`flex items-center justify-center p-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-all ${watch('shortLeaveDuration') == d.value ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-200 text-slate-500'}`}>
                            <input type="radio" {...register('shortLeaveDuration')} value={d.value} className="hidden"/>
                            {d.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">From</label>
                        <input {...register('shortLeaveStart')} type="time" className="form-input"/>
                      </div>
                      <div>
                        <label className="form-label">To</label>
                        <input {...register('shortLeaveEnd')} type="time" className="form-input"/>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Start Date *</label>
                      <input {...register('startDate', {required:true})} type="date" className="form-input"/>
                    </div>
                    <div>
                      <label className="form-label">End Date *</label>
                      <input {...register('endDate', {required:true})} type="date" min={startDate} className="form-input"/>
                    </div>
                  </div>
                )}

                {/* Days summary / warning */}
                {daysRequested > 0 && (
                  <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${!isSufficient ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                    {!isSufficient ? <FiAlertTriangle size={15}/> : <FiCheckCircle size={15}/>}
                    <span>
                      <strong>{daysRequested === 0.5 ? 'Half day' : `${daysRequested} working day${daysRequested !== 1 ? 's' : ''}`}</strong> will be consumed
                      {!isSufficient && ' — insufficient balance. Request will be flagged for manager review.'}
                    </span>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="form-label">
                    Reason {isMedical ? '*' : '(Optional)'}
                  </label>
                  <textarea
                    {...register('reason', { required: isMedical })}
                    rows={2}
                    className="form-input resize-none"
                    placeholder={isMedical ? 'Describe your medical condition...' : 'Optional reason for leave...'}
                  />
                </div>

                {/* Document Upload (required for medical) */}
                {isMedical && (
                  <div>
                    <label className="form-label">Medical Certificate / Document *</label>
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${docFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-secondary hover:bg-secondary/5'}`}
                      onClick={() => document.getElementById('leave-doc-input').click()}>
                      <input id="leave-doc-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={e => setDocFile(e.target.files[0])}/>
                      {docFile ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-700 text-sm font-medium">
                          <FiCheckCircle size={16}/>
                          <span>{docFile.name}</span>
                          <button type="button" onClick={e => { e.stopPropagation(); setDocFile(null) }} className="text-red-500 hover:text-red-700 ml-1"><FiX size={14}/></button>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm">
                          <FiUpload size={20} className="mx-auto mb-1"/>
                          <p>Click to upload MC / medical document</p>
                          <p className="text-xs mt-1">PDF, JPG, PNG — max 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-2xl shrink-0 flex gap-3">
              <button type="button" onClick={close} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button
                type="submit" form="leave-form"
                disabled={requestMut.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {requestMut.isPending ? <span className="spinner"/> : 'Submit Request'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}
