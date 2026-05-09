import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  FiUser, FiX, FiCheck, FiCreditCard, FiFileText,
  FiClock, FiAlertTriangle, FiRefreshCw, FiTrash2,
} from 'react-icons/fi'

const TABS = ['Overview', 'Bank & Pay', 'Internship', 'Documents', 'History']

const Field = ({ label, value }) => (
  <div className="py-2 border-b border-gray-50 text-sm flex justify-between gap-2">
    <span className="text-slate-500 flex-shrink-0">{label}</span>
    <span className="font-medium text-slate-800 text-right">{value || '—'}</span>
  </div>
)

export default function EmployeeDetail({ employee, onClose, onEdit }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState('Overview')
  const [convertDate, setConvertDate] = useState(new Date().toISOString().split('T')[0])
  const [removeReason, setRemoveReason] = useState('')
  const [showConvert, setShowConvert] = useState(false)
  const [showRemove, setShowRemove] = useState(false)

  const isIntern = employee?.employmentType === 'intern'

  const convertMut = useMutation({
    mutationFn: () => api.put(`/employees/${employee._id}/convert-intern`, { newStartDate: convertDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Intern converted to permanent employee!')
      setShowConvert(false)
      onClose()
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const removeMut = useMutation({
    mutationFn: () => api.put(`/employees/${employee._id}/remove-intern`, { reason: removeReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Intern removed. All data retained.')
      setShowRemove(false)
      onClose()
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (!employee) return null
  const e = employee
  const u = e.userId || {}
  const internship = e.internship || {}
  const history = e.historyLog || []
  const docs = e.documents || []

  const daysLeft = e.internshipDaysRemaining != null ? e.internshipDaysRemaining : null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-end sm:justify-end z-[99999]">
      <motion.div
        initial={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 80 }}
        className="bg-white h-full sm:h-full w-full sm:w-[560px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b bg-gradient-to-r from-[#0B1F3A] to-[#1a3a6b] text-white flex-shrink-0">
          <div className="relative flex-shrink-0">
            {e.profilePhoto
              ? <img src={e.profilePhoto} alt={u.name}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-white/30 shadow-lg"/>
              : <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl border-2 border-white/20">
                  {u.name?.charAt(0) || '?'}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{u.name}</p>
            <p className="text-xs text-white/70 truncate">{e.designation} · {e.department}</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{e.employeeNo}</span>
              {isIntern && <span className="text-xs bg-amber-400/80 text-amber-900 px-2 py-0.5 rounded-full font-medium">INTERN</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${e.status === 'active' ? 'bg-emerald-400/80 text-emerald-900' : 'bg-white/20'}`}>{e.status}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white" title="Edit">
              <FiRefreshCw size={14} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white">
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-slate-50 flex-shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${tab === t ? 'border-b-2 border-secondary text-secondary bg-white' : 'text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">

          {/* ─── OVERVIEW ─────────────────────────────────────────────────── */}
          {tab === 'Overview' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Personal</p>
                <Field label="Full Name" value={u.name} />
                <Field label="Email" value={u.email} />
                <Field label="Primary Phone" value={e.primaryPhone} />
                <Field label="Secondary Phone" value={e.secondaryPhone} />
                <Field label="Gender" value={e.gender} />
                <Field label="Date of Birth" value={e.dob ? new Date(e.dob).toLocaleDateString('en-LK') : null} />
                <Field label="ID Type" value={e.idType?.toUpperCase()} />
                <Field label="ID Number" value={e.idNumber} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Employment</p>
                <Field label="Employee No" value={e.employeeNo} />
                <Field label="Department" value={e.department} />
                <Field label="Designation" value={e.designation} />
                <Field label="Employment Type" value={e.employmentType} />
                <Field label="Joined Date" value={e.joinedDate ? new Date(e.joinedDate).toLocaleDateString('en-LK') : null} />
                <Field label="EPF Number" value={e.epfNumber} />
                <Field label="Max Leaves/Year" value={e.maxLeavesPerYear} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Emergency Contact</p>
                <Field label="Name" value={e.emergencyContact?.name} />
                <Field label="Phone" value={e.emergencyContact?.phone} />
                <Field label="Relationship" value={e.emergencyContact?.relationship} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Address</p>
                <Field label="Current" value={e.currentAddress || e.address} />
                <Field label="Permanent" value={e.permanentAddress} />
              </div>
              {e.portfolioUrl && (
                <a href={e.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-secondary hover:underline">
                  <FiUser size={13} /> {e.portfolioUrl}
                </a>
              )}
            </div>
          )}

          {/* ─── BANK & PAY ───────────────────────────────────────────────── */}
          {tab === 'Bank & Pay' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Salary</p>
                <Field label="Basic Salary" value={e.basicSalary ? `LKR ${e.basicSalary.toLocaleString()}` : null} />
                <Field label="Allowances" value={e.allowances ? `LKR ${e.allowances.toLocaleString()}` : null} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bank Details</p>
                <Field label="Bank Name" value={e.bankName} />
                <Field label="Branch" value={e.bankBranch} />
                <Field label="Account No" value={e.accountNumber} />
                <Field label="Account Holder" value={e.accountHolder} />
                <Field label="Account Type" value={e.accountType} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Advance / Loan Balance</p>
                <Field label="Advance Balance" value={e.advanceBalance ? `LKR ${e.advanceBalance.toLocaleString()}` : 'None'} />
                <Field label="Loan Balance" value={e.loanBalance ? `LKR ${e.loanBalance.toLocaleString()}` : 'None'} />
              </div>
            </div>
          )}

          {/* ─── INTERNSHIP ───────────────────────────────────────────────── */}
          {tab === 'Internship' && (
            <div className="space-y-4">
              {!isIntern && e.employmentType !== 'permanent' ? (
                <div className="text-center py-10 text-slate-400">
                  <FiUser size={36} className="mx-auto mb-2 opacity-30" />
                  <p>This employee is not an intern.</p>
                </div>
              ) : (
                <>
                  {isIntern && daysLeft !== null && (
                    <div className={`rounded-xl p-4 flex items-center gap-3 ${daysLeft <= 7 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      <FiAlertTriangle size={18} />
                      <div>
                        <p className="font-semibold text-sm">{daysLeft <= 0 ? 'Internship Expired' : `${daysLeft} days remaining`}</p>
                        <p className="text-xs opacity-75">Ends: {internship.endDate ? new Date(internship.endDate).toLocaleDateString('en-LK') : '—'}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Internship Details</p>
                    <Field label="Start Date" value={internship.startDate ? new Date(internship.startDate).toLocaleDateString('en-LK') : null} />
                    <Field label="End Date" value={internship.endDate ? new Date(internship.endDate).toLocaleDateString('en-LK') : null} />
                    <Field label="Duration (weeks)" value={internship.durationWeeks} />
                    <Field label="University / Institute" value={internship.university} />
                    <Field label="Supervisor" value={internship.supervisorName} />
                    {internship.convertedAt && (
                      <Field label="Converted On" value={new Date(internship.convertedAt).toLocaleDateString('en-LK')} />
                    )}
                  </div>

                  {isIntern && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button onClick={() => setShowConvert(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
                        <FiCheck size={14} /> Convert to Permanent
                      </button>
                      <button onClick={() => setShowRemove(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-colors border border-red-200">
                        <FiTrash2 size={14} /> Remove Intern
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── DOCUMENTS ───────────────────────────────────────────────── */}
          {tab === 'Documents' && (
            <div className="space-y-3">
              {/* Profile Photo */}
              {e.profilePhoto && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <img src={e.profilePhoto} alt={u.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"/>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Profile Photo</p>
                      <p className="text-xs text-slate-400">Employee photo</p>
                    </div>
                  </div>
                  <a href={e.profilePhoto} target="_blank" rel="noreferrer"
                    className="text-xs text-secondary hover:underline font-medium">View ↗</a>
                </div>
              )}
              {[
                { label: 'CV / Resume', url: e.cvUrl, type: 'PDF' },
                { label: 'Employment Agreement', url: e.agreementUrl, type: 'PDF' },
                { label: 'NIC / Licence — Front', url: e.nicPhotoUrl, type: 'Image / PDF' },
                { label: 'NIC / Licence — Back', url: e.nicPhotoBackUrl, type: 'Image / PDF' },
              ].map(doc => (
                <div key={doc.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <FiFileText size={16} className={doc.url ? 'text-secondary' : 'text-slate-300'} />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{doc.label}</p>
                      <p className="text-xs text-slate-400">{doc.type}</p>
                    </div>
                  </div>
                  {doc.url
                    ? <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline font-medium">View ↗</a>
                    : <span className="text-xs text-slate-400">Not uploaded</span>
                  }
                </div>
              ))}
              {docs.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <FiFileText size={16} className="text-secondary" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 capitalize">{d.type?.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-400">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-LK') : ''}</p>
                    </div>
                  </div>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline font-medium">View ↗</a>
                </div>
              ))}
              {!e.cvUrl && !e.agreementUrl && !e.nicPhotoUrl && docs.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <FiFileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No documents uploaded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ─── HISTORY ─────────────────────────────────────────────────── */}
          {tab === 'History' && (
            <div className="space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FiClock size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No history entries yet.</p>
                </div>
              ) : [...history].reverse().map((h, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <FiClock size={13} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 capitalize">{h.action?.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-500">{h.note}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{h.date ? new Date(h.date).toLocaleString('en-LK') : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Convert Confirm */}
        {showConvert && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 z-10">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h4 className="font-bold text-primary font-heading">Convert to Permanent</h4>
              <p className="text-sm text-slate-500">This will change <strong>{u.name}</strong>'s type to <strong>permanent</strong> and log the action.</p>
              <div>
                <label className="form-label">New Start Date</label>
                <input type="date" className="form-input" value={convertDate} onChange={e => setConvertDate(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowConvert(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={() => convertMut.mutate()} disabled={convertMut.isPending}
                  className="flex-1 justify-center flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
                  {convertMut.isPending ? <span className="spinner" /> : <FiCheck size={14} />} Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Remove Intern Confirm */}
        {showRemove && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 z-10">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <h4 className="font-bold text-primary font-heading text-red-700">Remove Intern</h4>
              <p className="text-sm text-slate-500">All attendance, payroll and project data will be retained. This cannot be undone.</p>
              <div>
                <label className="form-label">Reason</label>
                <textarea className="form-input resize-none" rows={2} value={removeReason} onChange={e => setRemoveReason(e.target.value)} placeholder="e.g. Internship period completed" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowRemove(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={() => removeMut.mutate()} disabled={removeMut.isPending}
                  className="flex-1 justify-center flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">
                  {removeMut.isPending ? <span className="spinner" /> : <FiTrash2 size={14} />} Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  )
}
