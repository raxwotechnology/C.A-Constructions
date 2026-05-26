export function buildInvoiceDraft(form, { clients = [], editing = null, projects = [] } = {}) {
  const clientId = form?.client
  const clientRow = clients.find((c) => String(c._id) === String(clientId))
  const client = clientRow
    ? { _id: clientRow._id, name: clientRow.name, email: clientRow.email, phone: clientRow.phone }
    : editing?.client || null

  const projectId = form?.project
  const projectRow = projects.find((p) => String(p._id) === String(projectId))

  const items = (form?.items || []).map((item) => {
    const qty = Number(item.quantity || 1)
    const price = Number(item.unitPrice || 0)
    const disc = Number(item.discount || 0)
    const total = qty * price * (1 - disc / 100)
    return { description: item.description || '', quantity: qty, unitPrice: price, discount: disc, total }
  })

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const taxRate = Number(form?.taxRate || 0)
  const tax = subtotal * taxRate / 100
  const total = subtotal + tax

  return {
    _id: editing?._id || null,
    invoiceNo: editing?.invoiceNo || 'Preview',
    client,
    project: projectRow ? { title: projectRow.title } : editing?.project,
    items,
    subtotal,
    tax,
    taxRate,
    total,
    totalPaid: editing?.totalPaid || 0,
    remainingBalance: editing?.remainingBalance ?? total,
    currency: form?.currency || 'LKR',
    notes: form?.notes || '',
    paymentTerms: form?.paymentTerms || '',
    invoiceDate: form?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: form?.dueDate || '',
    status: form?.status || editing?.status || 'draft',
  }
}
