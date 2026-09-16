export const INVOICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'unpaid', label: 'Pending' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const invoiceStatusLabel = (status) =>
  INVOICE_STATUS_OPTIONS.find((o) => o.value === status)?.label || status
