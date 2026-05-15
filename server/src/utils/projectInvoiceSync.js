const Project = require('../models/Project');
const Invoice = require('../models/Invoice');

function derivePaymentStatus(invoice) {
  if (!invoice) return 'none';
  const total = Number(invoice.total) || 0;
  const paid = Number(invoice.totalPaid) || 0;
  const remaining = typeof invoice.remainingBalance === 'number'
    ? invoice.remainingBalance
    : Math.max(0, total - paid);

  if (invoice.status === 'paid' || (total > 0 && remaining <= 0)) return 'paid';
  if (paid > 0) return 'partial';
  if (invoice.status === 'cancelled' || invoice.status === 'draft') return 'none';
  return 'unpaid';
}

function deriveAggregatePaymentStatus(invoices) {
  const list = (invoices || []).filter(Boolean);
  if (!list.length) return 'none';
  const statuses = list.map(derivePaymentStatus);
  if (statuses.every((s) => s === 'paid')) return 'paid';
  if (statuses.every((s) => s === 'unpaid')) return 'unpaid';
  if (statuses.some((s) => s === 'partial' || s === 'paid')) return 'partial';
  return 'partial';
}

function workflowStatusForPayment(paymentStatus, currentStatus) {
  if (['cancelled', 'planning'].includes(currentStatus)) return currentStatus;
  if (paymentStatus === 'paid') return 'paid_completed';
  if (paymentStatus === 'partial' || paymentStatus === 'unpaid') {
    if (currentStatus === 'paid_completed') return 'completed_payment_pending';
    if (['active', 'completed', 'on_hold', 'overdue', 'completed_payment_pending'].includes(currentStatus)) {
      return paymentStatus === 'unpaid' ? 'completed_payment_pending' : 'completed_payment_pending';
    }
  }
  return currentStatus;
}

async function loadInvoicesForProject(invoiceIds) {
  const ids = [...new Set((invoiceIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];
  return Invoice.find({ _id: { $in: ids } });
}

async function validateInvoicesBelongToClient(clientId, invoiceIds) {
  if (!clientId) {
    if (invoiceIds?.length) {
      const err = new Error('Select a client before linking invoices');
      err.statusCode = 400;
      throw err;
    }
    return [];
  }
  const ids = [...new Set((invoiceIds || []).filter(Boolean).map(String))];
  if (!ids.length) return [];

  const invoices = await Invoice.find({ _id: { $in: ids } });
  if (invoices.length !== ids.length) {
    const err = new Error('One or more invoices were not found');
    err.statusCode = 400;
    throw err;
  }
  const bad = invoices.find((inv) => String(inv.client) !== String(clientId));
  if (bad) {
    const err = new Error(`Invoice ${bad.invoiceNo} does not belong to the selected client`);
    err.statusCode = 400;
    throw err;
  }
  return invoices;
}

async function applyPaymentStatusToProject(project, invoices) {
  const paymentStatus = deriveAggregatePaymentStatus(invoices);
  project.paymentStatus = paymentStatus;
  if (paymentStatus !== 'none') {
    project.status = workflowStatusForPayment(paymentStatus, project.status);
    if (paymentStatus === 'paid' && !project.completedAt) {
      project.completedAt = new Date();
    }
  }
  return project;
}

/** Sync all projects linked to an invoice after payment changes */
async function syncProjectsForInvoice(invoiceId) {
  if (!invoiceId) return;
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return;

  const projects = await Project.find({
    $or: [{ invoice: invoiceId }, { linkedInvoices: invoiceId }],
  });

  for (const project of projects) {
    const ids = [
      ...(project.invoice ? [project.invoice] : []),
      ...(project.linkedInvoices || []),
    ];
    const uniqueIds = [...new Set(ids.map(String))];
    const invoices = await loadInvoicesForProject(uniqueIds);
    await applyPaymentStatusToProject(project, invoices);
    await project.save();
  }
}

/** Resolve invoice ids from create/update payload */
function normalizeInvoiceIds(body) {
  const fromArray = Array.isArray(body.linkedInvoices) ? body.linkedInvoices : [];
  const single = body.invoice ? [body.invoice] : [];
  const combined = [...fromArray, ...single].filter(Boolean);
  return [...new Set(combined.map(String))];
}

module.exports = {
  derivePaymentStatus,
  deriveAggregatePaymentStatus,
  validateInvoicesBelongToClient,
  applyPaymentStatusToProject,
  syncProjectsForInvoice,
  normalizeInvoiceIds,
  loadInvoicesForProject,
};
