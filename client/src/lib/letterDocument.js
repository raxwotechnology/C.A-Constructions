import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { absoluteMediaUrl } from './media'
import { buildCompanyFromSettings, companyContactLines, companyLogoHtml, contactBlockHtml } from './companyBranding'
import { resolveLetterSignatory } from './letterSignatures'

function safeImgSrc(u) {
  if (!u || typeof u !== 'string') return ''
  const abs = absoluteMediaUrl(u.trim())
  if (!abs) return ''
  return abs.replace(/"/g, '').replace(/'/g, '')
}

function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const LOGO_MAX_HEIGHT = 48
const SIG_IMAGE_MAX_HEIGHT = 44
const SEAL_MAX_HEIGHT = 52

/** Build the quotation-style letterhead (logo+name left, contact right, blue border bottom) */
export function buildLetterheadHtml(company) {
  const logoHtml = companyLogoHtml(company, { forPrint: false, maxHeight: LOGO_MAX_HEIGHT })

  const tagline = company.tagline || 'Next Level Tech'
  const taglineHtml = `<p style="margin:4px 0 0;font-size:11pt;font-weight:500;color:#38bdf8">${esc(tagline)}</p>`

  const contactHtml = contactBlockHtml(company)

  return `
    <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:18px;border-bottom:3px solid #0ea5e9;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:16px;min-width:0">
        <div style="flex-shrink:0">${logoHtml}</div>
        <div>
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-0.02em">${esc(company.name || 'Company')}</h1>
          ${taglineHtml}
        </div>
      </div>
      <div style="text-align:right;min-width:200px;flex:1">${contactHtml}</div>
    </header>`
}


export function buildRefDateHtml(letterRef, issuedDate) {
  const dateStr =
    issuedDate && !Number.isNaN(new Date(issuedDate).getTime())
      ? new Date(issuedDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })
      : issuedDate || ''

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:10pt">
      <div>
        <span style="color:#64748b;margin-right:6px;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Ref:</span>
        <strong style="color:#0f172a">${esc(letterRef || '—')}</strong>
      </div>
      <div>
        <span style="color:#64748b;margin-right:6px;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Date:</span>
        <strong style="color:#0f172a">${esc(dateStr)}</strong>
      </div>
    </div>`
}

export function buildTitleHtml(letterTitle) {
  return letterTitle
    ? `<h2 style="margin:0 0 20px;font-size:15pt;font-weight:800;color:#0f172a;letter-spacing:-0.01em;border-left:4px solid #0ea5e9;padding-left:12px">${esc(letterTitle)}</h2>`
    : ''
}

export function buildSigsHtml(signatures, opts = {}) {
  if (!signatures) return ''
  const siteSettings = opts.siteSettings || {}
  const { signatory, seal } = resolveLetterSignatory(signatures, siteSettings)
  const roleLabel = (signatory.role || 'admin').replace(/^./, (c) => c.toUpperCase())

  const includeSignature = signatures.includeSignature !== false
  const includeSeal = signatures.includeSeal !== false && !opts.hideSeal

  const hasSig = includeSignature && (signatory.data || signatory.name)
  const hasSeal = includeSeal && Boolean(seal?.data)
  if (!hasSig && !hasSeal) return ''

  const sigBlock = hasSig
    ? `
      ${signatory.data
        ? `<img src="${safeImgSrc(signatory.data)}" alt="" style="max-height:${SIG_IMAGE_MAX_HEIGHT}px;max-width:140px;object-fit:contain;display:block;margin:0 0 8px auto"/>`
        : `<div style="height:36px;border-bottom:1px solid #94a3b8;width:140px;margin:0 0 8px auto"></div>`}
      <p style="margin:0;font-size:10pt;font-weight:700;color:#0f172a">${esc(signatory.name || roleLabel)}</p>
      ${signatory.title ? `<p style="margin:4px 0 0;font-size:9pt;color:#64748b">${esc(signatory.title)}</p>` : ''}
      <p style="margin:6px 0 0;font-size:8pt;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8">Authorized Signatory</p>`
    : ''

  const sealBlock = hasSeal
    ? `<img src="${safeImgSrc(seal.data)}" alt="Company seal" style="max-height:${SEAL_MAX_HEIGHT}px;max-width:72px;object-fit:contain;display:block;margin:${hasSig ? '14px' : '0'} 0 0 auto;opacity:0.95"/>`
    : ''

  return `
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #e2e8f0;page-break-inside:avoid">
      <div style="margin-left:auto;max-width:200px;text-align:right">
        ${sigBlock}
        ${sealBlock}
      </div>
    </div>`
}

export function buildFooterHtml(company) {
  return `
    <footer style="margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;font-size:9pt;color:#64748b">
      <p style="margin:5px 0 0;font-size:8pt;color:#94a3b8">This document was generated electronically and is valid with authorised signatures where applied.</p>
    </footer>`
}

export function buildLetterInnerForPrint({ company, letterTitle, letterRef, issuedDate, bodyHtml, signatures, siteSettings, isFullHtml }) {
  // If isFullHtml is true, the bodyHtml already contains letterhead, ref, title,
  // signatures, and footer (e.g. custom letters from Enterprise Builder).
  // Just wrap it in the outer container without adding duplicate elements.
  if (isFullHtml) {
    return `
    <div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#0f172a;font-size:11pt;line-height:1.55;max-width:780px;margin:0 auto">
      <div class="letter-body" style="margin-top:0">${bodyHtml || ''}</div>
    </div>`
  }

  const issued =
    issuedDate && !Number.isNaN(new Date(issuedDate).getTime())
      ? new Date(issuedDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })
      : issuedDate || ''
  // Standard letter bodies from letterTemplatesHtml already contain their own <h1> title,
  // so we skip buildTitleHtml to avoid duplicates.
  return `
  <div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#0f172a;font-size:11pt;line-height:1.55;max-width:780px;margin:0 auto">
    ${buildLetterheadHtml(company)}
    ${buildRefDateHtml(letterRef, issued)}
    <div class="letter-body" style="margin-top:4px">${bodyHtml || ''}</div>
    ${buildSigsHtml(signatures, { siteSettings })}
    ${buildFooterHtml(company)}
  </div>`
}

const PRINT_STYLES = `
  @page { margin: 0; size: A4; }
  body { margin: 0; padding: 14mm 16mm; background: #fff; }
  /* Letter body prose styles */
  .letter-body p, .letter-body .letter-p { margin: 0 0 10px; }
  .letter-body .letter-h1 { font-size: 15pt; font-weight: 800; color: #0f172a; margin: 0 0 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  .letter-body .letter-h2 { font-size: 11pt; font-weight: 700; color: #1e3a8a; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; }
  .letter-body .letter-salutation { margin: 12px 0 14px; font-size: 11pt; }
  .letter-body .letter-ref-line { font-size: 10pt; color: #64748b; margin: 0 0 8px; }
  .letter-body .letter-info-table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 10pt; }
  .letter-body .letter-info-table th { text-align: left; width: 38%; padding: 8px 10px; background: #f1f5f9; border: 1px solid #e2e8f0; font-weight: 600; color: #334155; }
  .letter-body .letter-info-table td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #0f172a; }
  .letter-body .letter-ol { margin: 8px 0 12px 1.2em; padding: 0; }
  .letter-body .letter-ol li { margin-bottom: 6px; }
  .letter-body .letter-small { font-size: 10pt; color: #475569; }
  .letter-body .letter-upper { text-transform: uppercase; letter-spacing: 0.04em; font-size: 10pt; }
  .letter-body .letter-close { margin-top: 28px; margin-bottom: 0; }
  .letter-body .letter-sig-space { height: 36px; }
  .letter-body .letter-sig-name { font-weight: 700; margin: 0; }
  .letter-body .letter-sig-title { font-size: 10pt; color: #64748b; margin: 4px 0 0; }
  /* Quill rich-text */
  .letter-body .ql-font-serif { font-family: Georgia,'Times New Roman',serif; }
  .letter-body .ql-font-monospace { font-family: Consolas,Monaco,'Courier New',monospace; }
  .letter-body .ql-size-small { font-size: 0.85em; }
  .letter-body .ql-size-large { font-size: 1.35em; }
  .letter-body .ql-size-huge { font-size: 1.85em; }
  .letter-body .ql-align-center { text-align: center; }
  .letter-body .ql-align-right { text-align: right; }
  .letter-body .ql-align-justify { text-align: justify; }
  /* legacy class names */
  .letter-pdf-prose .letter-h1 { font-size: 15pt; font-weight: 800; color: #0f172a; margin: 0 0 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  .letter-pdf-prose .letter-h2 { font-size: 11pt; font-weight: 700; color: #1e3a8a; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; }
  .letter-pdf-prose .letter-p { margin: 0 0 10px; }
  .letter-pdf-prose .letter-salutation { margin: 12px 0 14px; }
  .letter-pdf-prose .letter-info-table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 10pt; }
  .letter-pdf-prose .letter-info-table th { text-align: left; width: 38%; padding: 8px 10px; background: #f1f5f9; border: 1px solid #e2e8f0; font-weight: 600; color: #334155; }
  .letter-pdf-prose .letter-info-table td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #0f172a; }
  .letter-pdf-prose .letter-ol { margin: 8px 0 12px 1.2em; padding: 0; }
  .letter-pdf-prose .letter-ol li { margin-bottom: 6px; }
  .letter-pdf-prose .ql-align-center { text-align: center; }
  .letter-pdf-prose .ql-align-right { text-align: right; }
  .letter-pdf-prose .ql-align-justify { text-align: justify; }
  /* Enterprise letter styles (custom builder) */
  .enterprise-letter-body { font-size: 11pt; line-height: 1.55; }
  .enterprise-letter-body p { margin-bottom: 12px; }
  .enterprise-letter-body table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .enterprise-letter-body td, .enterprise-letter-body th { border: 1px solid #e2e8f0; padding: 8px; }
  .enterprise-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; }
  @media print { body { margin: 0; } }
`

/** Full HTML document — used for the iframe preview so preview === print */
export function buildLetterFullHtml(opts) {
  const inner = buildLetterInnerForPrint(opts)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>* { box-sizing: border-box; } ${PRINT_STYLES}</style></head><body>${inner}</body></html>`
}

export function openLetterPrint(opts) {
  const inner = buildLetterInnerForPrint(opts)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(opts.letterTitle || 'Letter')}</title><style>${PRINT_STYLES}</style></head><body>${inner}</body></html>`

  // Use a hidden iframe instead of window.open to avoid opening a new tab.
  // The iframe prints from its own context so the parent page stays responsive.
  const oldFrame = document.getElementById('__letter-print-frame')
  if (oldFrame) oldFrame.remove()

  const iframe = document.createElement('iframe')
  iframe.id = '__letter-print-frame'
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      // fallback: print the whole window
      window.print()
    }
    // Clean up after a delay to let the print dialog finish
    setTimeout(() => {
      const el = document.getElementById('__letter-print-frame')
      if (el) el.remove()
    }, 2000)
  }
}

export async function downloadLetterPdf(opts, filenameBase = 'letter') {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;padding:40px 48px;background:#fff;box-sizing:border-box;'
  const st = document.createElement('style')
  st.textContent = PRINT_STYLES
  wrap.appendChild(st)
  const content = document.createElement('div')
  content.innerHTML = buildLetterInnerForPrint(opts)
  wrap.appendChild(content)
  document.body.appendChild(wrap)
  try {
    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let y = margin
    pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight)
    heightLeft -= pageHeight - margin * 2
    while (heightLeft > 0) {
      y = margin - (imgHeight - heightLeft)
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight)
      heightLeft -= pageHeight - margin * 2
    }
    pdf.save(`${String(filenameBase).replace(/[^\w\-]+/g, '_')}.pdf`)
  } finally {
    document.body.removeChild(wrap)
  }
}
