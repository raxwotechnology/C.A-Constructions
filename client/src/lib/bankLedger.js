/** Mirror server isLedgerBankMethod — card/bank transfer post to company bank ledger */
export function isLedgerBankMethod(method) {
  const raw = String(method || '').trim()
  if (!raw) return false
  const m = raw.toLowerCase().replace(/[\s-]+/g, '_')
  if (!m || m === 'cash' || m === 'cheque' || m === 'other' || m === 'manual' || m === 'salary_deduction') return false
  if (m.includes('payhere')) return true
  if (m === 'bank_transfer' || (m.includes('bank') && m.includes('transfer'))) return true
  if (m.includes('card')) return true
  if (m.includes('online')) return true
  if (m.endsWith('_transfer') || m.includes('transfer')) return true
  return false
}
