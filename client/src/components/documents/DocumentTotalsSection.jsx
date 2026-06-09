import { formatMoney } from '../../lib/currencies'

const CLR = { mid: '#475569', dark: '#0f172a', accent: '#0ea5e9', discount: '#b91c1c', border: '#e2e8f0', bg: '#f8fafc' }

export function discountTypeLabel(doc = {}) {
  const type = doc.globalDiscountType || 'fixed'
  const val = Number(doc.globalDiscountValue || 0)
  if (type === 'percentage' && val > 0) return `Percentage (${val}%)`
  if (type === 'percentage') return 'Percentage'
  return 'Fixed amount'
}

export function globalDiscountAmount(doc = {}, grossSubtotal = 0) {
  const type = doc.globalDiscountType || 'fixed'
  const val = Number(doc.globalDiscountValue || 0)
  if (type === 'percentage') return (Number(grossSubtotal || 0) * val) / 100
  return val
}

function lineDiscountAmount(doc = {}, grossSubtotal = 0, discountTotal = 0) {
  const globalAmt = globalDiscountAmount(doc, grossSubtotal)
  return Math.max(0, discountTotal - globalAmt)
}

/** Shared subtotal / discount / tax / total block for quotations & invoices */
export default function DocumentTotalsSection({
  doc = {},
  currency = 'LKR',
  showTransport = false,
  showAdvance = false,
  showPaidBalance = false,
  width = '300px',
}) {
  const grossSubtotal = Number(doc.subtotal || 0)
  const discountTotal = Number(doc.discountTotal || 0)
  const globalAmt = globalDiscountAmount(doc, grossSubtotal)
  const lineDiscAmt = lineDiscountAmount(doc, grossSubtotal, discountTotal)
  const hasGlobalDiscount =
    globalAmt > 0 || (doc.globalDiscountType === 'percentage' && Number(doc.globalDiscountValue) > 0)
  const hasAnyDiscount = discountTotal > 0 || hasGlobalDiscount || lineDiscAmt > 0
  const transport = Number(doc.transportCharge || 0)
  const tax = Number(doc.tax || 0)
  const total = Number(doc.total || 0)

  const row = (label, value, { color = CLR.mid, prefix = '', bold = false } = {}) => (
    <div
      key={label}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '6px 0',
        color,
        fontWeight: bold ? 700 : 500,
        fontSize: bold ? '11pt' : '10pt',
        borderBottom: bold ? 'none' : `1px solid ${CLR.border}`,
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{prefix}{value}</span>
    </div>
  )

  return (
    <div
      style={{
        width,
        marginLeft: 'auto',
        marginBottom: '20px',
        pageBreakInside: 'avoid',
        border: `1px solid ${CLR.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        background: CLR.bg,
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          background: CLR.dark,
          color: '#fff',
          fontSize: '8.5pt',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Totals summary
      </div>
      <div style={{ padding: '12px 14px' }}>
        {row('Subtotal', formatMoney(grossSubtotal, currency))}

        {hasAnyDiscount && (
          <>
            {row('Discount type', discountTypeLabel(doc))}
            {lineDiscAmt > 0 && row('Line discount', formatMoney(lineDiscAmt, currency), { color: CLR.discount, prefix: '-' })}
            {hasGlobalDiscount && globalAmt > 0 && row('Discount amount', formatMoney(globalAmt, currency), { color: CLR.discount, prefix: '-' })}
            {discountTotal > 0 && row('Discount total', formatMoney(discountTotal, currency), { color: CLR.discount, prefix: '-', bold: true })}
          </>
        )}

        {showTransport && transport > 0 && row('Transport charges', formatMoney(transport, currency))}

        {tax > 0 && row('Tax amount', formatMoney(tax, currency))}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 0 4px',
            marginTop: '8px',
            borderTop: `2px solid ${CLR.accent}`,
            fontSize: '12pt',
            fontWeight: 800,
            color: CLR.dark,
          }}
        >
          <span>Grand total</span>
          <span>{formatMoney(total, currency)}</span>
        </div>

        {showAdvance && Number(doc.advanceAmount) > 0 && row('Advance', formatMoney(doc.advanceAmount, currency))}

        {showPaidBalance && Number(doc.totalPaid) > 0 && row('Paid', formatMoney(doc.totalPaid, currency), { color: '#15803d' })}

        {showPaidBalance && Number(doc.remainingBalance) > 0 && row('Balance due', formatMoney(doc.remainingBalance, currency), { color: '#b91c1c', bold: true })}
      </div>
    </div>
  )
}
