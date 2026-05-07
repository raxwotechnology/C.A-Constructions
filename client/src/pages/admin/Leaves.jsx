import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiCheck, FiX, FiCalendar, FiPlus } from 'react-icons/fi'

export default function AdminLeaves() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [remarks, setRemarks] = useState({})
  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    remarks: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter],
    queryFn: () => api.get(`/leaves${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, status, remarks }) => api.put(`/leaves/${id}/status`, { status, remarks }),
    onSuccess: () => { qc.invalidateQueries(['leaves']); toast.success('Leave status updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees-mini'],
    queryFn: () => api.get('/employees').then((r) => r.data),
    enabled: showAssign,
  })
  const employees = employeesData?.employees || []
  const employeeOptions = useMemo(() => employees.map((e) => ({
    id: e._id,
    name: e.userId?.name,
    email: e.userId?.email,
    dept: e.department,
    desig: e.designation,
  })), [employees])

  const assignMut = useMutation({
    mutationFn: (payload) => api.post('/leaves/assign', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['leaves'])
      toast.success('Leave assigned')
      setShowAssign(false)
      setAssignForm({ employeeId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '', remarks: '' })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const handleAction = (id, status) => {
    updateMut.mutate({ id, status, remarks: remarks[id] || '' })
  }

  const typeColor = { annual:'badge-blue', sick:'badge-red', casual:'badge-yellow', maternity:'badge-purple', paternity:'badge-navy', unpaid:'badge-gray' }
  const statusColor = { pending:'badge-yellow', approved:'badge-green', rejected:'badge-red' }

  const leaves = data?.leaves || []
  const pendingCount = leaves.filter(l => l.status === 'pending').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">{pendingCount} pending approvals</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-end">
          <button onClick={() => setShowAssign(true)} className="btn-primary">
            <FiPlus size={16}/> Assign Leave
          </button>
          {['','pending','approved','rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`btn-sm rounded-lg px-3 py-1.5 text-sm font-medium transition-all capitalize ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Pending', count: leaves.filter(l=>l.status==='pending').length, color:'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label:'Approved', count: leaves.filter(l=>l.status==='approved').length, color:'bg-green-50 border-green-200 text-green-700' },
          { label:'Rejected', count: leaves.filter(l=>l.status==='rejected').length, color:'bg-red-50 border-red-200 text-red-700' },
        ].map(c => (
          <div key={c.label} className={`card border ${c.color} p-4 text-center`}>
            <p className="text-2xl font-bold font-heading">{c.count}</p>
            <p className="text-sm mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/>
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiCalendar size={40} className="mx-auto mb-2 opacity-30"/>
            <p>No leave requests found</p>
          </div>
        ) : leaves.map(leave => (
          <motion.div key={leave._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="card card-body">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold flex-shrink-0">
                  {leave.employee?.userId?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{leave.employee?.userId?.name}</p>
                  <p className="text-xs text-gray-400">{leave.employee?.employeeNo} · {leave.employee?.department} · {leave.employee?.designation}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 flex-1">
                <span className={`badge ${typeColor[leave.leaveType]||'badge-gray'} capitalize`}>{leave.leaveType}</span>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <FiCalendar size={13}/>
                  {new Date(leave.startDate).toLocaleDateString('en-LK')} → {new Date(leave.endDate).toLocaleDateString('en-LK')}
                </span>
                <span className="badge badge-navy">{leave.days} day{leave.days>1?'s':''}</span>
                <span className={`badge ${statusColor[leave.status]} capitalize`}>{leave.status}</span>
              </div>

              {leave.status === 'pending' && (
                <div className="flex flex-col gap-2 min-w-48">
                  <input
                    placeholder="Remarks (optional)"
                    value={remarks[leave._id] || ''}
                    onChange={e => setRemarks(r => ({...r, [leave._id]: e.target.value}))}
                    className="form-input text-xs py-1.5"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(leave._id, 'approved')}
                      className="btn-success btn-sm flex-1 justify-center">
                      <FiCheck size={13}/> Approve
                    </button>
                    <button onClick={() => handleAction(leave._id, 'rejected')}
                      className="btn-danger btn-sm flex-1 justify-center">
                      <FiX size={13}/> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-500"><span className="font-medium">Reason:</span> {leave.reason}</p>
              <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Leaves:</span> {leave.totalLeavesTaken || 0} taken / {leave.maxLeaves || 24} max · {leave.remainingLeaves || 0} remaining</p>
              {leave.remarks && <p className="text-xs text-gray-400 mt-0.5"><span className="font-medium">Remarks:</span> {leave.remarks}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAssign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{opacity:0,scale:0.95}}
              animate={{opacity:1,scale:1}}
              exit={{opacity:0,scale:0.95}}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-bold text-primary font-heading">Assign Leave</h3>
                <button onClick={() => setShowAssign(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX/></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="form-label">Employee *</label>
                  <select
                    value={assignForm.employeeId}
                    onChange={(e) => setAssignForm((s) => ({ ...s, employeeId: e.target.value }))}
                    className="form-select"
                  >
                    <option value="">Select employee…</option>
                    {employeeOptions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.email}) — {e.dept} / {e.desig}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Leave Type *</label>
                    <select
                      value={assignForm.leaveType}
                      onChange={(e) => setAssignForm((s) => ({ ...s, leaveType: e.target.value }))}
                      className="form-select capitalize"
                    >
                      {['annual','sick','casual','maternity','paternity','unpaid'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Reason</label>
                    <input
                      value={assignForm.reason}
                      onChange={(e) => setAssignForm((s) => ({ ...s, reason: e.target.value }))}
                      className="form-input"
                      placeholder="Optional (default: Assigned by admin)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      value={assignForm.startDate}
                      onChange={(e) => setAssignForm((s) => ({ ...s, startDate: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      value={assignForm.endDate}
                      onChange={(e) => setAssignForm((s) => ({ ...s, endDate: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Remarks</label>
                  <textarea
                    rows={3}
                    value={assignForm.remarks}
                    onChange={(e) => setAssignForm((s) => ({ ...s, remarks: e.target.value }))}
                    className="form-input"
                    placeholder="Optional remarks (visible to employee)"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAssign(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                  <button
                    type="button"
                    className="btn-primary flex-1 justify-center"
                    disabled={
                      assignMut.isPending ||
                      !assignForm.employeeId ||
                      !assignForm.startDate ||
                      !assignForm.endDate
                    }
                    onClick={() => assignMut.mutate(assignForm)}
                  >
                    {assignMut.isPending ? <span className="spinner"/> : 'Assign Leave'}
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
