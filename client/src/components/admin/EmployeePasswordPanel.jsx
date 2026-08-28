import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiKey, FiRefreshCw, FiMail, FiCopy } from 'react-icons/fi'

export default function EmployeePasswordPanel({ employeeId, email }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [lastReset, setLastReset] = useState(null)
  const [resetLink, setResetLink] = useState('')

  const changeMut = useMutation({
    mutationFn: (body) => api.put(`/employees/${employeeId}/password`, body).then((r) => r.data),
    onSuccess: () => {
      toast.success('Password updated')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to change password'),
  })

  const resetMut = useMutation({
    mutationFn: () => api.post(`/employees/${employeeId}/reset-password`).then((r) => r.data),
    onSuccess: (data) => {
      setLastReset({ temp: data.tempPassword, email: data.email })
      toast.success('Password reset — copy the temporary password below')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Reset failed'),
  })

  const emailMut = useMutation({
    mutationFn: () => api.post(`/employees/${employeeId}/send-password-reset`).then((r) => r.data),
    onSuccess: (data) => {
      if (data.resetUrl) setResetLink(data.resetUrl)
      toast.success(data.message || 'Reset email sent')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not send email'),
  })

  const submitChange = () => {
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match')
    changeMut.mutate({ newPassword })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
        <FiKey className="text-secondary" /> Account password
      </div>
      <p className="text-xs text-slate-500">Login: <span className="font-medium text-slate-700">{email}</span></p>

      <div className="space-y-2">
        <label className="form-label text-xs">Set new password</label>
        <input type="password" className="form-input" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
        <input type="password" className="form-input" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        <button type="button" className="btn-primary btn-sm w-full" disabled={changeMut.isPending} onClick={submitChange}>
          Change password
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
        <button type="button" className="btn-secondary btn-sm flex items-center gap-1.5" disabled={resetMut.isPending} onClick={() => resetMut.mutate()}>
          <FiRefreshCw size={14} /> Reset password
        </button>
        <button type="button" className="btn-ghost btn-sm border border-slate-200 flex items-center gap-1.5" disabled={emailMut.isPending} onClick={() => emailMut.mutate()}>
          <FiMail size={14} /> Send reset email
        </button>
      </div>

      {lastReset && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs space-y-2">
          <p className="font-semibold text-amber-900">Temporary password (shown once)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white px-2 py-1 rounded border font-mono text-amber-950">{lastReset.temp}</code>
            <button type="button" className="p-1.5 hover:bg-amber-100 rounded" title="Copy" onClick={() => { navigator.clipboard.writeText(lastReset.temp); toast.success('Copied') }}>
              <FiCopy size={14} />
            </button>
          </div>
        </div>
      )}

      {resetLink && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs">
          <p className="font-semibold text-blue-900 mb-1">Reset link (SMTP not configured)</p>
          <a href={resetLink} className="text-blue-600 break-all hover:underline" target="_blank" rel="noreferrer">{resetLink}</a>
        </div>
      )}
    </div>
  )
}
