/** Build a quotation-shaped object from the create/edit form for live preview. */
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

  const items = (form?.items || []).map((item) => {
    const qty = Number(item.quantity || 1)
    const price = Number(item.unitPrice || 0)
    const disc = Number(item.discount || 0)
    const total = qty * price * (1 - disc / 100)
    return {
      description: item.description || '',
      quantity: qty,
      unitPrice: price,
      discount: disc,
      total,
    }
  })

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const taxRate = Number(form?.taxRate || 0)
  const transportCharge = Number(form?.transportCharge || 0)
  const tax = subtotal * taxRate / 100
  const total = subtotal + tax + transportCharge

  return {
    _id: editing?._id || null,
    quotationNo: editing?.quotationNo || 'Preview',
    title: form?.title || '',
    client,
    items,
    subtotal,
    tax,
    taxRate,
    transportCharge,
    total,
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
