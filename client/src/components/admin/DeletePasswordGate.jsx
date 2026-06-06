import PasswordConfirmModal from './PasswordConfirmModal'
import { usePasswordProtectedDelete } from '../../hooks/usePasswordProtectedDelete'

/**
 * Standard delete flow: trash → password modal → verify → API delete.
 * @param {object} deleteMutation - react-query useMutation result with mutateAsync
 */
export function useDeleteWithPassword(deleteMutation, { title, message } = {}) {
  const gate = usePasswordProtectedDelete({
    mutateFn: (id) => deleteMutation.mutateAsync(id),
  })

  const modal = (
    <PasswordConfirmModal
      open={gate.deleteModalOpen}
      onClose={gate.cancelDelete}
      onConfirm={gate.confirmDelete}
      isSubmitting={gate.isSubmitting || deleteMutation.isPending}
      title={title || 'Confirm delete'}
      message={message || 'Enter your admin password to permanently delete this record.'}
    />
  )

  return { ...gate, DeletePasswordModal: modal }
}
