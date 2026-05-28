/**
 * Server-side HTML for quotation/invoice PDF generation (mirrors client letterhead layout).
 */
const SiteSetting = require('../models/SiteSetting');

const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const API_URL = (process.env.API_URL || process.env.SERVER_URL || 'http://localhost:5000').replace(/\/$/, '');

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absUploadUrl(path) {
  if (!path) return '';
  const p = String(path).trim();
  if (/^https?:\/\//i.test(p)) return p;
  const rel = p.startsWith('/') ? p : `/${p}`;
  return `${API_URL}${rel}`;
}

function buildLetterhead(settings) {
  const name = settings.siteName || 'Company';
  const tagline = settings.letterheadTagline || settings.siteDescription || 'Next Level Tech';
  const logo = settings.logoUrl ? absUploadUrl(settings.logoUrl) : '';
  const logoHtml = logo
    ? `<img src="${logo.replace(/"/g, '')}" alt="" style="max-height:64px;object-fit:contain"/>`
    : `<span style="font-weight:800;font-size:22px;color:#1e3a8a">${esc((name || 'C').charAt(0))}</span>`;

  const lines = [];
  if (settings.contactAddress) lines.push({ label: 'Address', text: settings.contactAddress });
  if (settings.contactPhone) lines.push({ label: 'Tel', text: settings.contactPhone });
  const email = settings.adminEmail || settings.contactEmail;
  if (email) lines.push({ label: 'Email', text: email });
  if (settings.websiteUrl) lines.push({ label: 'Web', text: settings.websiteUrl });

  const contactHtml = lines
    .map(
      (l) =>
        `<div style="margin:3px 0;font-size:9.5pt;color:#475569"><span style="color:#38bdf8;font-weight:600;min-width:42px;display:inline-block">${esc(l.label)}</span> ${esc(l.text)}</div>`,
    )
    .join('');

  return `
    <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:3px solid #0ea5e9;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:16px">
        <div>${logoHtml}</div>
        <div>
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#0f172a">${esc(name)}</h1>
          ${tagline ? `<p style="margin:4px 0 0;font-size:11pt;font-weight:500;color:#38bdf8">${esc(tagline)}</p>` : ''}
        </div>
      </div>
      <div style="text-align:right;min-width:200px">${contactHtml}</div>
    </header>`;
}

function fmtMoney(amount, currency = 'LKR') {
  const n = Number(amount || 0);
  try {
    return `${currency} ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

const PAYMENT_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  card: 'Card',
  online: 'Online Payment',
  custom: 'Custom',
};

function itemsTableHtml(items, currency) {
  const rows = (items || [])
    .map(
      (item) => `
    <tr>
      <td style="border:1px solid #e2e8f0;padding:10px">${esc(item.description)}</td>
      <td style="border:1px solid #e2e8f0;padding:10px;text-align:center">${item.quantity || 1}</td>
      <td style="border:1px solid #e2e8f0;padding:10px;text-align:right">${fmtMoney(item.unitPrice, currency)}</td>
      <td style="border:1px solid #e2e8f0;padding:10px;text-align:right">${item.discount > 0 ? `${item.discount}%` : '—'}</td>
      <td style="border:1px solid #e2e8f0;padding:10px;text-align:right;font-weight:600">${fmtMoney(item.total, currency)}</td>
    </tr>`,
    )
    .join('');
  return `
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:10.5pt">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="border:1px solid #e2e8f0;padding:10px;text-align:left">Description</th>
          <th style="border:1px solid #e2e8f0;padding:10px">Qty</th>
          <th style="border:1px solid #e2e8f0;padding:10px;text-align:right">Unit price</th>
          <th style="border:1px solid #e2e8f0;padding:10px;text-align:right">Disc.</th>
          <th style="border:1px solid #e2e8f0;padding:10px;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function getSettings() {
  const s = await SiteSetting.findOne().lean();
  return s || {};
}

async function buildQuotationDocumentHtml(quotation, { bankLabel } = {}) {
  const settings = await getSettings();
  const q = quotation;
  const currency = q.currency || 'LKR';
  const fontSizePt = Number(settings.quotationLayoutFontSizePt ?? 11);
  const lineHeight = Number(settings.quotationLayoutLineHeight ?? 1.5);
  const pagePaddingMm = Number(settings.quotationLayoutPagePaddingMm ?? 14);
  const headerSpacingPx = Number(settings.quotationLayoutHeaderSpacingPx ?? 24);
  const footerSpacingPx = Number(settings.quotationLayoutFooterSpacingPx ?? 32);
  const tableCellPaddingPx = Number(settings.quotationLayoutTableCellPaddingPx ?? 10);
  const showDocumentFrame = settings.quotationLayoutShowDocumentFrame !== false;
  const showRefOnDocument = settings.quotationLayoutShowRefOnDocument !== false;
  const payLabel =
    q.paymentMethod === 'custom'
      ? q.paymentMethodCustom || 'Custom'
      : PAYMENT_LABELS[q.paymentMethod] || q.paymentMethod || '';
  const thanks = settings.quotationThankYouMessage || 'Thank you for your business.';
  const roleProfile = settings.signatures?.[q.directorRole] || null;
  const directorName = q.directorName || roleProfile?.label || settings.quotationDirectorName || '';
  const sealUrl = q.directorSealUrl || roleProfile?.url || settings.sealUrl;
  const prepared = q.preparedBy || q.generatedBy?.name || '';

  const body = `
    ${buildLetterhead(settings)}
    <div style="font-family:'Segoe UI',system-ui,sans-serif;color:#0f172a;font-size:${fontSizePt}pt;line-height:${lineHeight};padding:28px 32px;${showDocumentFrame ? 'border:1px solid #cbd5e1;border-radius:4px;' : ''}">
      <h2 style="margin:0 0 8px;font-size:22pt;font-weight:800;letter-spacing:0.06em">QUOTATION</h2>
      ${q.title ? `<p style="color:#475569;font-weight:500">${esc(q.title)}</p>` : ''}
      <div style="display:flex;justify-content:space-between;margin:${headerSpacingPx}px 0 24px;gap:16px">
        <div style="flex:1;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
          <p style="margin:0 0 8px;font-size:9pt;font-weight:700;color:#94a3b8;text-transform:uppercase">Quotation for</p>
          <p style="margin:0;font-weight:700">${esc(q.client?.name || 'Client')}</p>
          ${q.client?.email ? `<p style="margin:4px 0 0;font-size:10pt;color:#64748b">${esc(q.client.email)}</p>` : ''}
        </div>
        <div style="flex:1;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;text-align:right">
          <p style="margin:0 0 8px;font-size:9pt;font-weight:700;color:#94a3b8;text-transform:uppercase">Prepared by</p>
          <p style="margin:0;font-weight:600">${esc(prepared)}</p>
          ${payLabel ? `<p style="margin:8px 0 0;font-size:10pt"><span style="color:#94a3b8">Payment:</span> ${esc(payLabel)}</p>` : ''}
          ${bankLabel ? `<p style="margin:4px 0 0;font-size:10pt"><span style="color:#94a3b8">Bank:</span> ${esc(bankLabel)}</p>` : ''}
          ${(q.bankBranch || q.bankAccount?.branchName) ? `<p style="margin:4px 0 0;font-size:10pt"><span style="color:#94a3b8">Bank branch:</span> ${esc(q.bankBranch || q.bankAccount?.branchName)}</p>` : ''}
          ${q.validUntil ? `<p style="margin:8px 0 0;font-size:10pt"><span style="color:#94a3b8">Valid until:</span> ${new Date(q.validUntil).toLocaleDateString('en-LK')}</p>` : ''}
        </div>
      </div>
      ${itemsTableHtml(q.items, currency).replaceAll('padding:10px', `padding:${tableCellPaddingPx}px`)}
      <div style="width:280px;margin-left:auto;font-size:10.5pt">
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Subtotal</span><span>${fmtMoney(q.subtotal, currency)}</span></div>
        ${Number(q.transportCharge) > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0"><span>Transport</span><span>${fmtMoney(q.transportCharge, currency)}</span></div>` : ''}
        ${Number(q.taxRate) > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0"><span>Tax (${q.taxRate}%)</span><span>${fmtMoney(q.tax, currency)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:8px;border-top:2px solid #0ea5e9;font-size:13pt;font-weight:800"><span>Total</span><span>${fmtMoney(q.total, currency)}</span></div>
      </div>
      ${q.notes ? `<div style="margin-top:24px"><p style="font-size:9pt;font-weight:700;color:#64748b;text-transform:uppercase">Notes</p><p style="white-space:pre-wrap;color:#475569">${esc(q.notes)}</p></div>` : ''}
      ${q.terms ? `<div style="margin-top:16px"><p style="font-size:9pt;font-weight:700;color:#64748b;text-transform:uppercase">Terms</p><p style="white-space:pre-wrap;color:#475569">${esc(q.terms)}</p></div>` : ''}
      ${thanks ? `<p style="margin-top:${footerSpacingPx}px;text-align:center;font-style:italic;color:#64748b;border-top:1px solid #e2e8f0;padding-top:16px">${esc(thanks)}</p>` : ''}
      ${directorName || sealUrl ? `
        <div style="margin-top:40px;text-align:right">
          ${directorName ? `<p style="font-weight:700;margin:0 0 8px">${esc(directorName)}</p>` : ''}
          ${sealUrl ? `<img src="${absUploadUrl(sealUrl).replace(/"/g, '')}" style="max-height:90px"/>` : ''}
        </div>` : ''}
      ${(showRefOnDocument && q.quotationNo) ? `<p style="text-align:right;font-size:9pt;color:#94a3b8;margin-top:24px">Ref: ${esc(q.quotationNo)}</p>` : ''}
    </div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:${pagePaddingMm}mm;background:#fff">${body}</body></html>`;
}

async function buildInvoiceDocumentHtml(invoice) {
  const settings = await getSettings();
  const inv = invoice;
  const currency = inv.currency || 'LKR';

  const body = `
    ${buildLetterhead(settings)}
    <div style="font-family:'Segoe UI',system-ui,sans-serif;color:#0f172a;font-size:11pt;line-height:1.5;padding:28px 32px;border:1px solid #cbd5e1;border-radius:4px">
      <h2 style="margin:0 0 8px;font-size:22pt;font-weight:800;letter-spacing:0.06em">TAX INVOICE</h2>
      <div style="display:flex;justify-content:space-between;margin:24px 0">
        <div style="flex:1;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
          <p style="margin:0 0 8px;font-size:9pt;font-weight:700;color:#94a3b8">BILLED TO</p>
          <p style="margin:0;font-weight:700">${esc(inv.client?.name)}</p>
          ${inv.client?.email ? `<p style="margin:4px 0 0;font-size:10pt;color:#64748b">${esc(inv.client.email)}</p>` : ''}
        </div>
        <div style="text-align:right;font-size:10pt;color:#475569">
          ${inv.invoiceDate ? `<p>Date: ${new Date(inv.invoiceDate).toLocaleDateString('en-LK')}</p>` : ''}
          ${inv.dueDate ? `<p>Due: ${new Date(inv.dueDate).toLocaleDateString('en-LK')}</p>` : ''}
        </div>
      </div>
      ${itemsTableHtml(inv.items, currency)}
      <div style="width:280px;margin-left:auto;font-size:10.5pt">
        <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Subtotal</span><span>${fmtMoney(inv.subtotal, currency)}</span></div>
        ${Number(inv.tax) > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0"><span>Tax</span><span>${fmtMoney(inv.tax, currency)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:8px;border-top:2px solid #0ea5e9;font-size:13pt;font-weight:800"><span>Total</span><span>${fmtMoney(inv.total, currency)}</span></div>
        ${Number(inv.totalPaid) > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;color:#16a34a"><span>Paid</span><span>${fmtMoney(inv.totalPaid, currency)}</span></div>` : ''}
        ${Number(inv.remainingBalance) > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;color:#b91c1c"><span>Balance due</span><span>${fmtMoney(inv.remainingBalance, currency)}</span></div>` : ''}
      </div>
      ${inv.notes ? `<div style="margin-top:24px"><p style="font-size:9pt;font-weight:700;color:#64748b">Notes</p><p style="white-space:pre-wrap">${esc(inv.notes)}</p></div>` : ''}
      ${inv.invoiceNo ? `<p style="text-align:right;font-size:9pt;color:#94a3b8;margin-top:24px">Ref: ${esc(inv.invoiceNo)}</p>` : ''}
    </div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:14mm;background:#fff">${body}</body></html>`;
}

function bankLabelFromAccount(bank) {
  if (!bank) return '';
  return `${bank.bankName || ''} · ${bank.accountNumber || ''}`.trim();
}

module.exports = {
  buildQuotationDocumentHtml,
  buildInvoiceDocumentHtml,
  bankLabelFromAccount,
  APP_URL,
};
