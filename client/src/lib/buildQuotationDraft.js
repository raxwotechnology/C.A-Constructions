/** Build a quotation-shaped object from the create/edit form for live preview. */
import { calcDocumentTotals } from './documentTotals'

export function buildQuotationDraft(form, { clients = [], editing = null, user } = {}) {
  const clientId = form?.client
  const clientRow = clients.find((c) => String(c._id) === String(clientId))
  const client = clientRow
    ? {
        _id: clientRow._id,
        name: clientRow.name,
        email: clientRow.email,
        phone: clientRow.phone,
      }
    : editing?.client || null

  const totals = calcDocumentTotals(form?.items || [], {
    taxRate: form?.taxRate || 0,
    globalDiscountValue: form?.globalDiscountValue || 0,
    globalDiscountType: form?.globalDiscountType || 'fixed',
    transportCharge: form?.transportCharge || 0,
  })

  return {
    _id: editing?._id || null,
    quotationNo: editing?.quotationNo || 'Preview',
    title: form?.title || '',
    client,
    serviceType: form?.serviceType || editing?.serviceType || 'Other',
    globalDiscountType: form?.globalDiscountType || 'fixed',
    globalDiscountValue: Number(form?.globalDiscountValue || 0),
    discountTotal: totals.discountTotal,
    items: totals.items,
    subtotal: totals.grossSubtotal,
    discountTotal: totals.discountTotal,
    globalDiscountType: form?.globalDiscountType || 'fixed',
    globalDiscountValue: Number(form?.globalDiscountValue || 0),
    tax: totals.tax,
    taxRate: Number(form?.taxRate || 0),
    transportCharge: totals.transportCharge,
    total: totals.total,
    currency: form?.currency || 'LKR',
    advanceAmount: Number(form?.advanceAmount || 0),
    notes: form?.notes || '',
    terms: form?.terms || '',
    paymentMethod: form?.paymentMethod || '',
    paymentMethodCustom: form?.paymentMethodCustom || '',
    bankAccount: form?.bankAccount || editing?.bankAccount,
    bankBranch: form?.bankBranch || editing?.bankBranch || '',
    preparedBy: form?.preparedBy || user?.name || '',
    directorRole: form?.directorRole || editing?.directorRole || '',
    directorName: form?.directorName || '',
    directorSealUrl: form?.directorSealUrl || editing?.directorSealUrl || '',
    showSeal: form?.showSeal !== false,
    validUntil: form?.validUntil || '',
    status: editing?.status || 'draft',
    generatedBy: editing?.generatedBy || (user ? { name: user.name } : null),
  }
}
