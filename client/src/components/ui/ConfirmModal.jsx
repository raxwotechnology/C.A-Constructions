import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FiAlertCircle, FiX } from 'react-icons/fi'

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmClass = variant === 'danger' ? 'btn-danger' : 'btn-primary'

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 100000 }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div className="flex items-start justify-between gap-3 mb-4">
          <motion.div className="flex items-start gap-3">
            <motion.div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <FiAlertCircle className="text-secondary" size={20} />
            </motion.div>
            <motion.div>
              <h3 className="text-lg font-bold text-primary font-heading">{title}</h3>
              {message && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{message}</p>}
            </motion.div>
          </motion.div>
          <button type="button" onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
            <FiX size={18} />
          </button>
        </motion.div>
        <motion.div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-ghost flex-1 justify-center">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`${confirmClass} flex-1 justify-center`}>
            {loading ? <span className="spinner" /> : confirmLabel}
          </button>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
