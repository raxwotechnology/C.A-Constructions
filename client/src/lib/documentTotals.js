/** Shared line-item + global discount + tax + transport calculations (matches server calcItems). */
export function calcDocumentTotals(items = [], {
  taxRate = 0,
  globalDiscountValue = 0,
  globalDiscountType = 'fixed',
  transportCharge = 0,
} = {}) {
  let grossSubtotal = 0
  let lineDiscounts = 0
  const calcedItems = (items || []).map((item) => {
    const qty = Number(item.quantity || 1)
    const price = Number(item.unitPrice || 0)
    const discPct = Number(item.discount || 0)
    const base = qty * price
    const discAmt = base * (discPct / 100)
    const afterDisc = base - discAmt
    grossSubtotal += base
    lineDiscounts += discAmt
    return {
      ...item,
      description: item.description || '',
      quantity: qty,
      unitPrice: price,
      discount: discPct,
      total: parseFloat(afterDisc.toFixed(2)),
    }
  })

  const globalDiscAmt =
    globalDiscountType === 'percentage'
      ? grossSubtotal * (Number(globalDiscountValue || 0) / 100)
      : Number(globalDiscountValue || 0)

  const discountTotal = lineDiscounts + globalDiscAmt
  const taxable = Math.max(0, grossSubtotal - discountTotal)
  const tax = taxable * (Number(taxRate || 0) / 100)
  const transport = Number(transportCharge || 0)
  const total = parseFloat((taxable + tax + transport).toFixed(2))

  return {
    items: calcedItems,
    grossSubtotal: parseFloat(grossSubtotal.toFixed(2)),
    lineDiscounts: parseFloat(lineDiscounts.toFixed(2)),
    globalDiscAmt: parseFloat(globalDiscAmt.toFixed(2)),
    discountTotal: parseFloat(discountTotal.toFixed(2)),
    taxable: parseFloat(taxable.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    transportCharge: transport,
    total,
  }
}
