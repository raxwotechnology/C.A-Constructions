const Invoice = require('../models/Invoice');

/**
 * Prefer invoice number = quotation number when converting.
 * If that string is already used by another invoice, use {base}-2, {base}-3, …
 */
async function allocateInvoiceNoFromQuotationNo(rawBase) {
  const base = rawBase != null ? String(rawBase).trim() : '';
  if (!base) return null;
  let candidate = base;
  for (let n = 0; n < 500; n++) {
    const taken = await Invoice.findOne({ invoiceNo: candidate }).select('_id').lean();
    if (!taken) return candidate;
    candidate = `${base}-${n + 2}`;
  }
  return null;
}

/** Sequential INV-YYYY-#### when not converting from a quotation (replaces old Invoice pre-save hook). */
async function generateAutoInvoiceNo(prefix = 'INV') {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments();
  
  let offset = 1;
  let candidateNo = `${prefix || 'INV'}-${year}-${String(count + offset).padStart(4, '0')}`;
  
  // Ensure uniqueness in case of deleted invoices or concurrent creation
  while (true) {
    const taken = await Invoice.findOne({ invoiceNo: candidateNo }).select('_id').lean();
    if (!taken) return candidateNo;
    offset++;
    candidateNo = `${prefix || 'INV'}-${year}-${String(count + offset).padStart(4, '0')}`;
  }
}

module.exports = { allocateInvoiceNoFromQuotationNo, generateAutoInvoiceNo };
