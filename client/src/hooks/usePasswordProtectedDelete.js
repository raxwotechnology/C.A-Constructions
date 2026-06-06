import { useState, useCallback } from 'react'
import api from '../lib/api'

/**
 * Gate destructive deletes behind admin password verification.
 * Calls POST /auth/verify-password then mutateFn(id, password, extra).
 */
export function usePasswordProtectedDelete({ mutateFn, onSuccess, onError } = {}) {
  const [pendingId, setPendingId] = useState(null)
  const [pendingExtra, setPendingExtra] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requestDelete = useCallback((id, extra = null) => {
    setPendingId(id)
    setPendingExtra(extra)
  }, [])

  const cancelDelete = useCallback(() => {
    setPendingId(null)
    setPendingExtra(null)
  }, [])

  const confirmDelete = useCallback(async (password) => {
    if (pendingId == null) return
    setIsSubmitting(true)
    try {
      await api.post('/auth/verify-password', { password })
      await mutateFn(pendingId, password, pendingExtra)
      onSuccess?.()
      setPendingId(null)
      setPendingExtra(null)
    } catch (err) {
      onError?.(err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [pendingId, pendingExtra, mutateFn, onSuccess, onError])

  return {
    requestDelete,
    cancelDelete,
    confirmDelete,
    deleteModalOpen: pendingId != null,
    isSubmitting,
    pendingId,
  }
}
