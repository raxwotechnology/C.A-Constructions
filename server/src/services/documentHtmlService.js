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
  if (/^data:/i.test(p)) return p;
  if (/^https?:\/\//i.test(p)) return p;
  const rel = p.startsWith('/') ? p : `/${p}`;
  return `${API_URL}${rel}`;
}

/**
 * Convert a /uploads/... path to a base64 data URI by reading the file from disk.
 * Falls back to absUploadUrl if the file doesn't exist locally.
 * This ensures images always render in Puppeteer PDFs regardless of network/SSL issues.
 */
function localFileToDataUri(uploadPath) {
  if (!uploadPath) return '';
  const p = String(uploadPath).trim();
  if (/^data:/i.test(p)) return p;

  // Try to read from local filesystem
  try {
    const path = require('path');
    const fs = require('fs');
    const { getUploadsRoot } = require('../utils/uploadsPath');

    let relPath = p;
    // Strip leading /uploads/ or uploads/ to get relative path within uploads dir
    if (relPath.startsWith('/uploads/')) relPath = relPath.slice('/uploads/'.length);
    else if (relPath.startsWith('uploads/')) relPath = relPath.slice('uploads/'.length);
    // If it's a full URL, extract the path portion
    else if (/^https?:\/\//i.test(relPath)) {
      try {
        const url = new URL(relPath);
        relPath = url.pathname;
        if (relPath.startsWith('/uploads/')) relPath = relPath.slice('/uploads/'.length);
      } catch { /* ignore */ }
    }

    const filePath = path.join(getUploadsRoot(), relPath);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
      const mime = mimeMap[ext] || 'image/png';
      return `data:${mime};base64,${data.toString('base64')}`;
    }
  } catch { /* fallback to URL */ }

  return absUploadUrl(p);
}

function buildLetterhead(settings) {
  const name = settings.siteName || 'Company';
  const tagline = settings.letterheadTagline || settings.siteDescription || 'Next Level Tech';
  const logo = settings.logoUrl ? localFileToDataUri(settings.logoUrl) : '';
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
    <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:3px solid #0ea5e9;margin-bottom:20px">
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

function discountTypeLabel(doc) {
  const type = doc.globalDiscountType || 'fixed';
  const val = Number(doc.globalDiscountValue || 0);
  if (type === 'percentage' && val > 0) return `Percentage (${val}%)`;
  if (type === 'percentage') return 'Percentage';
  return 'Fixed amount';
}

function globalDiscountAmount(doc, grossSubtotal) {
  const type = doc.globalDiscountType || 'fixed';
  const val = Number(doc.globalDiscountValue || 0);
  if (type === 'percentage') return (Number(grossSubtotal || 0) * val) / 100;
  return val;
}

function documentTotalsHtml(doc, currency, { showTransport = false, showAdvance = false, showPaidBalance = false } = {}) {
  const grossSubtotal = Number(doc.subtotal || 0);
  const discountTotal = Number(doc.discountTotal || 0);
  const globalAmt = globalDiscountAmount(doc, grossSubtotal);
  const lineDiscAmt = Math.max(0, discountTotal - globalAmt);
  const hasGlobal = globalAmt > 0 || (doc.globalDiscountType === 'percentage' && Number(doc.globalDiscountValue) > 0);
  const hasAnyDiscount = discountTotal > 0 || hasGlobal || lineDiscAmt > 0;
  const transport = Number(doc.transportCharge || 0);
  const row = (label, value, extra = '') =>
    `<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;color:#475569;font-size:10pt;border-bottom:1px solid #e2e8f0${extra}"><span>${label}</span><span style="font-weight:600;white-space:nowrap">${value}</span></div>`;

  let body = row('Subtotal', fmtMoney(grossSubtotal, currency));
  if (hasAnyDiscount) {
    body += row('Discount type', esc(discountTypeLabel(doc)));
    if (lineDiscAmt > 0) body += row('Line discount', `-${fmtMoney(lineDiscAmt, currency)}`, ';color:#b91c1c');
    if (hasGlobal && globalAmt > 0) body += row('Discount amount', `-${fmtMoney(globalAmt, currency)}`, ';color:#b91c1c');
    if (discountTotal > 0) body += row('Discount total', `-${fmtMoney(discountTotal, currency)}`, ';color:#b91c1c;font-weight:700');
  }
  if (showTransport && transport > 0) body += row('Transport charges', fmtMoney(transport, currency));
  if (Number(doc.tax) > 0) body += row('Tax amount', fmtMoney(doc.tax, currency));
  body += `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0 4px;margin-top:8px;border-top:2px solid #0ea5e9;font-size:12pt;font-weight:800;color:#0f172a"><span>Grand total</span><span>${fmtMoney(doc.total, currency)}</span></div>`;
  if (showAdvance && Number(doc.advanceAmount) > 0) body += row('Advance', fmtMoney(doc.advanceAmount, currency));
  if (showPaidBalance && Number(doc.totalPaid) > 0) body += row('Paid', fmtMoney(doc.totalPaid, currency), ';color:#15803d');
  if (showPaidBalance && Number(doc.remainingBalance) > 0) body += row('Balance due', fmtMoney(doc.remainingBalance, currency), ';font-weight:700;color:#b91c1c');

  return `<div style="width:300px;margin-left:auto;margin-bottom:20px;page-break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#f8fafc">
    <div style="padding:10px 14px;background:#0f172a;color:#fff;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Totals summary</div>
    <div style="padding:12px 14px">${body}</div>
  </div>`;
}

function termsBlockHtml(doc) {
  const text = String(doc.paymentTerms || doc.terms || '').trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  const ol = lines.map((l) => `<li style="padding-left:4px;margin-bottom:5px">${esc(l)}</li>`).join('');
  return `
    <div style="margin-bottom:16px;page-break-inside:avoid">
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="padding:10px 18px;background:#0f172a">
          <h4 style="margin:0;font-size:8.5pt;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.08em">Terms &amp; Conditions</h4>
        </div>
        <div style="padding:14px 18px;background:#fafbfc">
          <ol style="margin:0;padding-left:18px;font-size:8.5pt;line-height:1.7;color:#475569">${ol}</ol>
        </div>
      </div>
    </div>`;
}

function itemsTableHtml(items, currency) {
  const thStyle = 'border:1px solid #e2e8f0;padding:8px 10px;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.05em;color:#475569;font-weight:700';
  const tdStyle = 'border:1px solid #e2e8f0;padding:8px 10px;vertical-align:top';
  const rows = (items || [])
    .map(
      (item) => `
    <tr>
      <td style="${tdStyle}">${esc(item.description)}</td>
      <td style="${tdStyle};text-align:center">${item.quantity || 1}</td>
      <td style="${tdStyle};text-align:right">${fmtMoney(item.unitPrice, currency)}</td>
      <td style="${tdStyle};text-align:right">${item.discount > 0 ? `${item.discount}%` : '—'}</td>
      <td style="${tdStyle};text-align:right;font-weight:600">${fmtMoney(item.total, currency)}</td>
    </tr>`,
    )
    .join('');
  return `
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:10pt">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="${thStyle};text-align:left">Description</th>
          <th style="${thStyle};text-align:center">Qty</th>
          <th style="${thStyle};text-align:right">Unit price</th>
          <th style="${thStyle};text-align:right">Disc.</th>
          <th style="${thStyle};text-align:right">Total</th>
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
  const showRefOnDocument = settings.quotationLayoutShowRefOnDocument !== false;
  const payLabel =
    q.paymentMethod === 'custom'
      ? q.paymentMethodCustom || 'Custom'
      : PAYMENT_LABELS[q.paymentMethod] || q.paymentMethod || '';
  const thanks = settings.quotationThankYouMessage || 'We appreciate your business and look forward to the opportunity to work with you. Should you have any questions regarding this quotation, please do not hesitate to contact us.';
  const roleProfile = settings.signatures?.[q.directorRole] || null;
  const directorName = q.directorName || roleProfile?.label || settings.quotationDirectorName || '';
  const sealUrl = q.directorSealUrl || roleProfile?.url || settings.sealUrl;
  const prepared = q.preparedBy || q.generatedBy?.name || '';
  const showSeal = q.showSeal !== false;

  /* Split terms into numbered lines for modern display */
  const termsLines = (q.terms || '').split('\n').map(l => l.trim()).filter(Boolean);
  const termsOlHtml = termsLines.length > 0
    ? termsLines.map(l => `<li style="padding-left:4px;margin-bottom:5px">${esc(l)}</li>`).join('')
    : '';

  const body = `
    ${buildLetterhead(settings)}
    <div style="font-family:'Segoe UI',system-ui,sans-serif;color:#0f172a;font-size:10.5pt;line-height:1.55;padding:24px 28px;border:1px solid #cbd5e1;border-radius:4px">
      <!-- Title + Valid Until -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;page-break-inside:avoid">
        <div>
          <h2 style="margin:0 0 4px;font-size:20pt;font-weight:800;letter-spacing:0.06em;color:#0f172a">QUOTATION</h2>
          ${q.title ? `<p style="margin:0;color:#475569;font-weight:500;font-size:10.5pt">${esc(q.title)}</p>` : ''}
        </div>
        <div style="text-align:right;font-size:10pt;color:#475569">
          ${q.validUntil ? `<p style="margin:0"><span style="color:#94a3b8;text-transform:uppercase;font-size:8.5pt;font-weight:700;display:block;margin-bottom:2px">Valid until</span>${new Date(q.validUntil).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}</p>` : ''}
        </div>
      </div>
      <!-- Client + Prepared by info cards -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;page-break-inside:avoid">
        <div style="padding:14px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
          <p style="margin:0 0 6px;font-size:8.5pt;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">Quotation for</p>
          <p style="margin:0;font-weight:700;font-size:10.5pt;color:#0f172a">${esc(q.client?.name || 'Client')}</p>
          ${q.client?.email ? `<p style="margin:3px 0 0;font-size:9.5pt;color:#64748b">${esc(q.client.email)}</p>` : ''}
          ${q.client?.phone ? `<p style="margin:3px 0 0;font-size:9.5pt;color:#64748b">${esc(q.client.phone)}</p>` : ''}
        </div>
        <div style="padding:14px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;text-align:right">
          <p style="margin:0 0 6px;font-size:8.5pt;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">Prepared by</p>
          <p style="margin:0;font-weight:600;font-size:10.5pt;color:#0f172a">${esc(prepared)}</p>
          ${payLabel ? `<p style="margin:6px 0 0;font-size:9.5pt;color:#64748b"><span style="color:#94a3b8">Payment:</span> ${esc(payLabel)}</p>` : ''}
          ${bankLabel ? `<p style="margin:3px 0 0;font-size:9.5pt;color:#64748b"><span style="color:#94a3b8">Bank:</span> ${esc(bankLabel)}</p>` : ''}
          ${(q.bankBranch || q.bankAccount?.branchName) ? `<p style="margin:3px 0 0;font-size:9.5pt;color:#64748b"><span style="color:#94a3b8">Bank branch:</span> ${esc(q.bankBranch || q.bankAccount?.branchName)}</p>` : ''}
        </div>
      </div>
      ${itemsTableHtml(q.items, currency)}
      ${documentTotalsHtml(q, currency, { showTransport: true, showAdvance: true })}
      <!-- Notes (near totals — commercial section) -->
      ${q.notes ? `
      <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-bottom:16px;font-size:9.5pt;page-break-inside:avoid">
        <p style="margin:0 0 6px;font-size:8.5pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Notes</p>
        <p style="margin:0;white-space:pre-wrap;color:#475569;line-height:1.5">${esc(q.notes)}</p>
      </div>` : ''}
      <!-- Director seal -->
      ${showSeal && (directorName || sealUrl) ? `
        <div style="margin-top:20px;text-align:right;page-break-inside:avoid">
          ${directorName ? `<p style="font-weight:700;margin:0 0 8px;font-size:11pt;color:#0f172a">${esc(directorName)}</p>` : ''}
          ${sealUrl ? `<img src="${localFileToDataUri(sealUrl).replace(/"/g, '')}" style="max-height:90px;object-fit:contain"/>` : ''}
          <p style="margin:8px 0 0;font-size:9pt;color:#64748b">Authorized Signatory</p>
        </div>` : ''}
      <!-- Reference -->
      ${(showRefOnDocument && q.quotationNo) ? `<p style="text-align:right;font-size:8.5pt;color:#94a3b8;margin-top:14px;letter-spacing:0.04em">Ref: ${esc(q.quotationNo)}</p>` : ''}
      <!-- Terms & Conditions — modern card at the very bottom -->
      ${termsOlHtml ? `
      <div style="margin-top:28px;page-break-inside:avoid">
        <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:10px 18px">
            <p style="margin:0;font-size:9pt;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.08em">Terms &amp; Conditions</p>
          </div>
          <div style="padding:14px 18px;background:#fafbfc">
            <ol style="margin:0;padding-left:18px;font-size:8.5pt;line-height:1.7;color:#475569">${termsOlHtml}</ol>
          </div>
        </div>
      </div>` : ''}
      <!-- Thank you — absolute bottom -->
      ${thanks ? `<p style="margin:24px 0 0;text-align:center;font-style:italic;color:#94a3b8;font-size:9pt;border-top:1px solid #e2e8f0;padding-top:12px">${esc(thanks)}</p>` : ''}
    </div>`;

  /* Add @page CSS for proper multi-page PDF rendering — consistent fonts, spacing, no clipping */
  const pageCss = `
    <style>
      @page { margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; font-size: 10.5pt; line-height: 1.55; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
    </style>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${pageCss}</head><body style="margin:0;padding:14mm;background:#fff">${body}</body></html>`;
}

async function buildInvoiceDocumentHtml(invoice) {
  const settings = await getSettings();
  const inv = invoice;
  const currency = inv.currency || 'LKR';
  const payLabel =
    inv.paymentMethod === 'custom'
      ? inv.paymentMethodCustom || 'Custom'
      : PAYMENT_LABELS[inv.paymentMethod] || inv.paymentMethod || '';
  const bankLabel = inv.bankAccount
    ? `${inv.bankAccount.bankName || ''} · ${inv.bankAccount.accountNumber || ''}`.trim()
    : '';

  const sigAuth = inv.signatures?.authorizer;
  const sigSeal = inv.signatures?.seal;
  const roleProfile = settings.signatures?.[inv.directorRole] || null;
  const directorName = inv.directorName || roleProfile?.label || settings.quotationDirectorName || '';
  const sealUrl = inv.directorSealUrl || roleProfile?.url || settings.sealUrl || '';

  const signaturesHtml = (sigAuth?.data || sigSeal?.data)
    ? `<div style="display:flex;justify-content:flex-end;margin-top:40px;page-break-inside:avoid">
        <div style="width:260px;text-align:center">
          ${sigAuth?.data ? `<img src="${localFileToDataUri(sigAuth.data).replace(/"/g, '')}" style="max-height:70px;margin-bottom:8px;display:block;margin-inline:auto"/>` : '<div style="height:70px"></div>'}
          <div style="border-top:2px solid #0f172a;padding-top:8px;margin-bottom:16px">
            <p style="margin:0;font-weight:700;font-size:10pt;text-transform:uppercase">${esc(sigAuth?.name || 'Authorized Signatory')}</p>
            ${sigAuth?.title ? `<p style="margin:4px 0 0;font-size:8.5pt;color:#64748b">${esc(sigAuth.title)}</p>` : ''}
          </div>
          ${sigSeal?.data ? `<img src="${localFileToDataUri(sigSeal.data).replace(/"/g, '')}" style="max-height:110px;display:block;margin-inline:auto"/>` : ''}
          ${sigSeal?.note ? `<p style="margin:8px 0 0;font-size:8.5pt;color:#64748b;font-style:italic">${esc(sigSeal.note)}</p>` : ''}
        </div>
      </div>`
    : (directorName || sealUrl)
      ? `<div style="margin-top:20px;text-align:right;page-break-inside:avoid">
          ${directorName ? `<p style="font-weight:700;margin:0 0 8px;font-size:11pt">${esc(directorName)}</p>` : ''}
          ${sealUrl ? `<img src="${localFileToDataUri(sealUrl).replace(/"/g, '')}" style="max-height:90px;object-fit:contain"/>` : ''}
          <p style="margin:8px 0 0;font-size:9pt;color:#64748b">Authorized Signatory</p>
        </div>`
      : '';

  const body = `
    ${buildLetterhead(settings)}
    <div style="font-family:'Segoe UI',system-ui,sans-serif;color:#0f172a;font-size:10.5pt;line-height:1.55;padding:24px 28px;border:1px solid #cbd5e1;border-radius:4px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;page-break-inside:avoid">
        <div>
          <h2 style="margin:0 0 4px;font-size:20pt;font-weight:800;letter-spacing:0.06em">INVOICE</h2>
          ${inv.invoiceNo ? `<p style="margin:2px 0 0;font-size:10pt;font-weight:600;color:#0ea5e9">${esc(inv.invoiceNo)}</p>` : ''}
          ${inv.project?.title ? `<p style="margin:4px 0 0;color:#475569;font-weight:500">${esc(inv.project.title)}</p>` : ''}
        </div>
        <div style="text-align:right;font-size:10pt;color:#475569">
          ${inv.invoiceDate ? `<p style="margin:0 0 8px"><span style="color:#94a3b8;text-transform:uppercase;font-size:8.5pt;font-weight:700;display:block">Invoice date</span>${new Date(inv.invoiceDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          ${inv.dueDate ? `<p style="margin:0"><span style="color:#94a3b8;text-transform:uppercase;font-size:8.5pt;font-weight:700;display:block">Due date</span>${new Date(inv.dueDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;page-break-inside:avoid">
        <div style="padding:14px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
          <p style="margin:0 0 6px;font-size:8.5pt;font-weight:700;color:#94a3b8;text-transform:uppercase">Billed to</p>
          <p style="margin:0;font-weight:700;font-size:10.5pt">${esc(inv.client?.name || 'Client')}</p>
          ${inv.client?.email ? `<p style="margin:3px 0 0;font-size:9.5pt;color:#64748b">${esc(inv.client.email)}</p>` : ''}
          ${inv.client?.phone ? `<p style="margin:3px 0 0;font-size:9.5pt;color:#64748b">${esc(inv.client.phone)}</p>` : ''}
        </div>
        <div style="padding:14px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;text-align:right">
          <p style="margin:0 0 6px;font-size:8.5pt;font-weight:700;color:#94a3b8;text-transform:uppercase">Invoice details</p>
          ${inv.serviceType ? `<p style="margin:0;font-size:9.5pt;color:#64748b"><span style="color:#94a3b8">Service:</span> ${esc(inv.serviceType)}</p>` : ''}
          ${payLabel ? `<p style="margin:6px 0 0;font-size:9.5pt;color:#64748b"><span style="color:#94a3b8">Payment:</span> ${esc(payLabel)}</p>` : ''}
          ${bankLabel ? `<p style="margin:3px 0 0;font-size:9.5pt;color:#64748b"><span style="color:#94a3b8">Bank:</span> ${esc(bankLabel)}</p>` : ''}
          ${(inv.bankBranch || inv.bankAccount?.branchName) ? `<p style="margin:3px 0 0;font-size:9.5pt;color:#64748b"><span style="color:#94a3b8">Bank branch:</span> ${esc(inv.bankBranch || inv.bankAccount?.branchName)}</p>` : ''}
          <p style="margin:6px 0 0;font-size:9.5pt;color:#64748b;text-transform:capitalize"><span style="color:#94a3b8">Status:</span> ${esc(inv.status || '—')}</p>
        </div>
      </div>
      ${itemsTableHtml(inv.items, currency)}
      ${documentTotalsHtml(inv, currency, { showTransport: true, showPaidBalance: true })}
      ${inv.notes ? `<div style="margin-bottom:16px;border-top:2px solid #e2e8f0;padding-top:12px;page-break-inside:avoid"><p style="margin:0 0 8px;font-size:8.5pt;font-weight:700;color:#94a3b8;text-transform:uppercase">Notes</p><p style="margin:0;white-space:pre-wrap;color:#475569;font-size:9pt;line-height:1.65">${esc(inv.notes)}</p></div>` : ''}
      ${termsBlockHtml(inv)}
      ${signaturesHtml}
    </div>`;

  const pageCss = `
    <style>
      @page { margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; font-size: 10.5pt; line-height: 1.55; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
    </style>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${pageCss}</head><body style="margin:0;padding:0;background:#fff">${body}</body></html>`;
}

function bankLabelFromAccount(bank) {
  if (!bank) return '';
  return `${bank.bankName || ''} · ${bank.accountNumber || ''}`.trim();
}

async function buildTabularExportHtml(title, headers, rows, metaLine = '') {
  const settings = (await SiteSetting.findOne().lean()) || {};
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c ?? '')}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:'Segoe UI',system-ui,sans-serif;padding:24px;color:#0f172a;font-size:11pt;line-height:1.55}
    h2{font-size:14pt;font-weight:800;margin:0 0 6px;color:#0f172a}
    .meta{font-size:9pt;color:#64748b;margin-bottom:14px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e2e8f0;padding:8px 10px;font-size:10pt;text-align:left}
    th{background:#f1f5f9;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.05em;color:#475569}
  </style></head><body>
  ${buildLetterhead(settings)}
  <h2>${esc(title)}</h2>
  ${metaLine ? `<p class="meta">${esc(metaLine)}</p>` : ''}
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
}

module.exports = {
  buildQuotationDocumentHtml,
  buildInvoiceDocumentHtml,
  buildTabularExportHtml,
  buildLetterhead,
  bankLabelFromAccount,
  APP_URL,
};
