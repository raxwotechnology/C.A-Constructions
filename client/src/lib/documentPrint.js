/**
 * Shared professional letterhead & print styles for quotations, invoices, exports.
 */
import { buildCompanyFromSettings, companyContactLines, companyLogoHtml, contactBlockHtml } from './companyBranding'
import { absoluteMediaUrl, mediaUrl } from './media'

function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Letterhead: logo + name + tagline left; contact right */
export function buildDocumentLetterheadHtml(settings, { forPrint = true, showTagline } = {}) {
  const company = buildCompanyFromSettings(settings)
  const tagline =
    showTagline !== undefined
      ? showTagline
      : settings.letterheadTagline?.trim() || settings.siteDescription?.trim() || 'Next Level Tech'
  const logo = companyLogoHtml(company, { forPrint, maxHeight: 64 })
  const contactHtml = contactBlockHtml(company)

  return `
    <header class="doc-letterhead" style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:3px solid #0ea5e9;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:16px;min-width:0">
        <div style="flex-shrink:0">${logo}</div>
        <div>
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-0.02em">${esc(company.name)}</h1>
          ${tagline ? `<p style="margin:4px 0 0;font-size:11pt;font-weight:500;color:#38bdf8">${esc(tagline)}</p>` : ''}
        </div>
      </div>
      <div style="text-align:right;min-width:200px;flex:1">${contactHtml}</div>
    </header>`
}

export function documentPrintStyles() {
  return `
    @page { size: A4; margin: 10mm 14mm 10mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; font-size: 10.5pt; line-height: 1.55; margin: 0; padding: 0; }
    .doc-frame { border: 1px solid #cbd5e1; border-radius: 4px; padding: 28px 32px; min-height: 100%; }
    .doc-title { font-size: 22pt; font-weight: 800; color: #0f172a; letter-spacing: 0.06em; margin: 0 0 4px; }
    .doc-meta { font-size: 10pt; color: #64748b; }
    table { page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    table.doc-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    table.doc-table th { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px 12px; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; text-align: left; }
    table.doc-table td { border: 1px solid #e2e8f0; padding: 10px 12px; vertical-align: top; }
    .doc-totals { width: 280px; margin-left: auto; }
    .doc-totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 10.5pt; color: #475569; }
    .doc-totals-row.total { font-size: 13pt; font-weight: 800; color: #0f172a; border-top: 2px solid #0ea5e9; margin-top: 8px; padding-top: 10px; }
    .doc-seal-block { margin-top: 40px; text-align: right; page-break-inside: avoid; }
    .doc-thankyou { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-style: italic; color: #64748b; text-align: center; font-size: 10.5pt; }
    .doc-continuation { padding-top: 0; }
    @media print {
      body { padding: 0 !important; margin: 0; }
      .no-print { display: none !important; }
      .doc-frame, .doc-print-frame, .quotation-doc, .invoice-doc {
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
      .doc-letterhead, .doc-letterhead-wrap { page-break-after: avoid; page-break-inside: avoid; }
      .quotation-doc-inner > div:first-child,
      .invoice-doc-inner > div:first-child { page-break-inside: avoid; }
      body, .quotation-doc, .quotation-doc-inner, .invoice-doc, .invoice-doc-inner {
        font-family: 'Segoe UI', system-ui, sans-serif !important;
        font-size: 10.5pt !important;
        line-height: 1.55 !important;
        color: #0f172a !important;
      }
      table { page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .doc-totals, .doc-seal-block { page-break-inside: avoid; }
    }
  `
}

export function directorSealBlockHtml({ directorName, sealUrl, forPrint = true }) {
  if (!directorName && !sealUrl) return ''
  let src = ''
  if (sealUrl) {
    if (sealUrl.startsWith('data:') || /^https?:\/\//i.test(sealUrl)) {
      src = sealUrl
    } else {
      src = forPrint ? absoluteMediaUrl(sealUrl) : mediaUrl(sealUrl)
    }
  }
  return `
    <div class="doc-seal-block" style="margin-top:40px;text-align:right;page-break-inside:avoid">
      ${src ? `<img src="${src.replace(/"/g, '')}" alt="Seal" style="max-height:90px;object-fit:contain;display:inline-block"/>` : ''}
      ${directorName ? `<p style="margin:10px 0 0;font-weight:700;font-size:11pt;color:#0f172a">${esc(directorName)}</p>` : ''}
      <p style="margin:4px 0 0;font-size:9pt;color:#64748b">Authorized Signatory</p>
    </div>`
}

/** Print without popup URL bar noise (about:blank) — uses hidden iframe on same page. */
export function printHtmlContent({ title, bodyHtml, extraCss = '' }) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return false
  }

  const safeTitle = ' '
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${safeTitle}</title><style>${documentPrintStyles()}${extraCss}</style></head><body>${bodyHtml}</body></html>`

  doc.open()
  doc.write(html)
  doc.close()

  const runPrint = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      }, 1500)
    }
  }

  if (iframe.contentWindow?.document?.readyState === 'complete') runPrint()
  else iframe.onload = runPrint

  return true
}

/** @deprecated Prefer printHtmlContent */
export function openDocumentPrintWindow({ title, bodyHtml, extraCss = '' }) {
  return printHtmlContent({ title, bodyHtml, extraCss })
}
