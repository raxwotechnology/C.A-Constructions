import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiLock } from 'react-icons/fi'

/**
 * Confirm a destructive action by re-entering the signed-in user's password.
 * Server routes must verify the same password in the request body.
 */
export default function PasswordConfirmModal({
  open,
  onClose,
  title = 'Confirm with password',
  message = 'Enter your account password to continue.',
  confirmLabel = 'Confirm delete',
  isSubmitting = false,
  onConfirm,
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setPassword('')
      setError('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onConfirm(password)
      setPassword('')
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed')
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-primary font-bold font-heading">
            <FiLock size={18} />
            {title}
          </div>
          <button
            type="button"
            onClick={() => {
              setPassword('')
              setError('')
              onClose()
            }}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          <div>
            <label className="form-label text-xs">Password</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              name="action-confirm-password"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password manually"
              disabled={isSubmitting}
            />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="btn-ghost flex-1 justify-center"
              onClick={() => {
                setPassword('')
                setError('')
                onClose()
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 border-red-600" disabled={isSubmitting || !password.trim()}>
              {isSubmitting ? <span className="spinner" /> : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
