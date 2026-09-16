/**
 * Invoice payment helpers for project UI (linked invoice + salary allocations).
 * Treat "fully paid" only when status is paid or remaining balance is explicitly zero
 * (avoid treating missing `remainingBalance` as settled).
 */
export function isInvoiceFullyPaid(inv) {
  if (!inv) return false
  if (inv.status === 'paid') return true
  const rb = inv.remainingBalance
  if (typeof rb === 'number' && rb <= 0 && inv.status !== 'draft' && inv.status !== 'cancelled') return true
  return false
}

/** Badge + label for linked invoice on project cards / detail */
export function invoicePaymentDisplay(inv) {
  if (!inv) return { label: 'No invoice', badgeClass: 'badge-gray', settled: false }
  if (isInvoiceFullyPaid(inv)) return { label: 'Paid', badgeClass: 'badge-green', settled: true }
  if (inv.status === 'partial') return { label: 'Partial', badgeClass: 'badge-blue', settled: false }
  const tp = Number(inv.totalPaid)
  const rb = typeof inv.remainingBalance === 'number' ? inv.remainingBalance : null
  if (tp > 0 && rb != null && rb > 0) return { label: 'Partial', badgeClass: 'badge-blue', settled: false }
  if (inv.status === 'overdue') return { label: 'Overdue', badgeClass: 'badge-red', settled: false }
  return { label: 'Unpaid', badgeClass: 'badge-yellow', settled: false }
}
