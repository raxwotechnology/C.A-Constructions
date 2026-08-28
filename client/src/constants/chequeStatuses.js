/** Essential cheque statuses shown in UI (legacy DB values still display). */
export const CHEQUE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'deposited', label: 'Deposited' },
  { value: 'cleared', label: 'Cleared' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const CHEQUE_STATUS_LABEL = Object.fromEntries(
  [
    ...CHEQUE_STATUS_OPTIONS,
    { value: 'unpaid', label: 'Pending' },
    { value: 'paid', label: 'Cleared' },
    { value: 'received', label: 'Deposited' },
    { value: 'returned', label: 'Bounced' },
    { value: 'expected', label: 'Pending' },
    { value: 'renewed', label: 'Pending' },
  ].map((o) => [o.value, o.label]),
)
