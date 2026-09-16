import { calcDocumentTotals } from './documentTotals'

export function buildInvoiceDraft(form, { clients = [], editing = null, projects = [], banks = [] } = {}) {
  const clientId = form?.client
  const clientRow = clients.find((c) => String(c._id) === String(clientId))
  const client = clientRow
    ? { _id: clientRow._id, name: clientRow.name, email: clientRow.email, phone: clientRow.phone }
    : editing?.client || null

  const projectId = form?.project
  const projectRow = projects.find((p) => String(p._id) === String(projectId))

  const bankAccountId = form?.bankAccount
  const bankRow = banks?.find((b) => String(b._id) === String(bankAccountId))
  const bankAccount = bankRow
    ? { _id: bankRow._id, bankName: bankRow.bankName, accountName: bankRow.accountName, accountNumber: bankRow.accountNumber, branchName: bankRow.branchName }
    : editing?.bankAccount || null

  const totals = calcDocumentTotals(form?.items || [], {
    taxRate: form?.taxRate || 0,
    globalDiscountValue: form?.globalDiscountValue ?? form?.discountTotal ?? 0,
    globalDiscountType: form?.globalDiscountType || 'fixed',
    transportCharge: form?.transportCharge || 0,
  })

  return {
    _id: editing?._id || null,
    invoiceNo: editing?.invoiceNo || 'Preview',
    client,
    project: projectRow ? { title: projectRow.title } : editing?.project,
    serviceType: form?.serviceType || editing?.serviceType || 'Other',
    items: totals.items,
    subtotal: totals.grossSubtotal,
    discountTotal: totals.discountTotal,
    globalDiscountType: form?.globalDiscountType || 'fixed',
    globalDiscountValue: Number(form?.globalDiscountValue || 0),
    tax: totals.tax,
    taxRate: Number(form?.taxRate || 0),
    transportCharge: totals.transportCharge,
    total: totals.total,
    totalPaid: editing?.totalPaid || 0,
    remainingBalance: totals.total - (editing?.totalPaid || 0),
    currency: form?.currency || 'LKR',
    notes: form?.notes || '',
    paymentTerms: form?.paymentTerms || form?.terms || '',
    terms: form?.paymentTerms || form?.terms || '',
    paymentMethod: form?.paymentMethod || '',
    paymentMethodCustom: form?.paymentMethodCustom || '',
    bankAccount: bankAccount,
    bankBranch: form?.bankBranch || editing?.bankBranch || '',
    invoiceDate: form?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: form?.dueDate || '',
    status: form?.status || editing?.status || 'draft',
  }
}
