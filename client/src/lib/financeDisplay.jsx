import { FiDollarSign, FiCreditCard, FiLayers, FiFileText } from 'react-icons/fi'

export function paymentPillClass(pm) {
  const m = String(pm || 'Cash').toLowerCase()
  if (m.includes('cash')) return 'finance-payment-pill--cash'
  if (m.includes('bank')) return 'finance-payment-pill--bank'
  if (m.includes('card') || m.includes('online')) return 'finance-payment-pill--card'
  if (m.includes('cheque')) return 'finance-payment-pill--cheque'
  return 'finance-payment-pill--other'
}

export function PaymentTypeIcon({ method }) {
  const m = String(method || '').toLowerCase()
  if (m.includes('cash')) return <FiDollarSign size={11} className="opacity-80 shrink-0" aria-hidden />
  if (m.includes('bank')) return <FiLayers size={11} className="opacity-80 shrink-0" aria-hidden />
  if (m.includes('card') || m.includes('online')) return <FiCreditCard size={11} className="opacity-80 shrink-0" aria-hidden />
  if (m.includes('cheque')) return <FiFileText size={11} className="opacity-80 shrink-0" aria-hidden />
  return <FiCreditCard size={11} className="opacity-80 shrink-0" aria-hidden />
}
