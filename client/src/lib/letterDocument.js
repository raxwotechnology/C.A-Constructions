import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { absoluteMediaUrl } from './media'
import { companyContactLines } from './companyBranding'

function safeImgSrc(u) {
  if (!u || typeof u !== 'string') return ''
  return u.replace(/"/g, '').replace(/'/g, '').trim()
}

function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sigCell(label, sig) {
  if (!sig?.data) {
    return `<div class="letter-pdf-sig-cell"><p class="letter-pdf-sig-label">${esc(label)}</p><div class="letter-pdf-sig-line"></div><p class="letter-pdf-sig-hint">Signature</p></div>`
  }
  return `<div class="letter-pdf-sig-cell"><p class="letter-pdf-sig-label">${esc(label)}</p>${sig.name ? `<p class="letter-pdf-sig-name">${esc(sig.name)}</p>` : ''}<img src="${safeImgSrc(sig.data)}" class="letter-pdf-sig-img" alt=""/></div>`
}

export function buildLetterInnerForPrint({
  company,
  letterTitle,
  letterRef,
  issuedDate,
  bodyHtml,
  signatures,
}) {
  const logoSrc = absoluteMediaUrl(company.logoPath || company.logo)
  const logo = logoSrc
    ? `<img src="${safeImgSrc(logoSrc)}" alt="" class="letter-pdf-logo"/>`
    : `<div class="letter-pdf-logo-fallback">${esc((company.name || 'C').charAt(0))}</div>`

  const contactHtml = companyContactLines(company)
    .map(
      (l) =>
        `<div class="letter-pdf-contact-row"><span class="letter-pdf-contact-k">${esc(l.label)}</span> ${esc(l.text)}</div>`,
    )
    .join('')
  const tag = company.tagline ? `<p class="letter-pdf-tagline">${esc(company.tagline)}</p>` : ''

  const sigs = signatures
    ? `<div class="letter-pdf-sig-grid">${sigCell('HR', signatures.hr)}${sigCell('Manager', signatures.manager)}</div>`
    : `<div class="letter-pdf-sig-grid">${sigCell('HR', null)}${sigCell('Manager', null)}</div>`

  const sealHtml = signatures?.seal?.data
      ? `<div style="margin-top:24px;text-align:center;"><strong>Company Seal</strong><br/><img src="${safeImgSrc(signatures.seal.data)}" style="max-height:100px;margin-top:8px;"/></div>`
      : ''

  return `
  <div class="letter-pdf-doc">
    <header class="letter-pdf-header">
      <div class="letter-pdf-brand">${logo}</div>
      <div class="letter-pdf-co">
        <h1 class="letter-pdf-co-name">${esc(company.name || 'Company')}</h1>
        ${tag}
        ${contactHtml ? `<div class="letter-pdf-co-meta">${contactHtml}</div>` : ''}
      </div>
    </header>
    <div class="letter-pdf-meta-row">
      <div><span class="letter-pdf-k">Reference</span> <strong>${esc(letterRef || '—')}</strong></div>
      <div><span class="letter-pdf-k">Date</span> <strong>${esc(issuedDate || '')}</strong></div>
      <div class="letter-pdf-doc-title">${esc(letterTitle || 'Official Letter')}</div>
    </div>
    <main class="letter-pdf-body letter-pdf-prose">${bodyHtml || ''}</main>
    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
      <div style="flex:1;">${sigs}</div>
      ${sealHtml}
    </div>
    <footer class="letter-pdf-footer">
      <p>${esc(company.name || '')} · ${esc(company.footer || company.address || '')}</p>
      <p class="letter-pdf-footer-sub">This document was generated electronically and is valid with authorised signatures where applied.</p>
    </footer>
  </div>`
}

const PRINT_STYLES = `
  .letter-pdf-doc { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; font-size: 11pt; line-height: 1.55; }
  .letter-pdf-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding-bottom: 16px; border-bottom: 3px solid #1e3a8a; margin-bottom: 20px; }
  .letter-pdf-logo { max-height: 56px; object-fit: contain; }
  .letter-pdf-logo-fallback { width: 52px; height: 52px; border-radius: 10px; background: #1e3a8a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; }
  .letter-pdf-co { text-align: right; flex: 1; }
  .letter-pdf-co-name { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
  .letter-pdf-tagline { margin: 4px 0 0; font-size: 10pt; color: #64748b; font-style: italic; }
  .letter-pdf-co-meta { margin: 8px 0 0; font-size: 9.5pt; color: #475569; line-height: 1.5; text-align: right; }
  .letter-pdf-contact-row { margin: 2px 0; }
  .letter-pdf-contact-k { color: #94a3b8; margin-right: 6px; }
  .letter-pdf-meta-row { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: baseline; margin-bottom: 20px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 10pt; }
  .letter-pdf-k { color: #64748b; margin-right: 6px; }
  .letter-pdf-doc-title { flex: 1 1 100%; font-size: 11pt; font-weight: 700; color: #1e3a8a; margin-top: 4px; }
  .letter-pdf-body { margin-top: 8px; }
  .letter-pdf-prose .letter-h1 { font-size: 16pt; font-weight: 800; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.02em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  .letter-pdf-prose .letter-h2 { font-size: 11pt; font-weight: 700; color: #1e3a8a; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.06em; }
  .letter-pdf-prose .letter-p { margin: 0 0 10px; }
  .letter-pdf-prose .letter-salutation { margin: 12px 0 14px; font-size: 11pt; }
  .letter-pdf-prose .letter-ref-line { font-size: 10pt; color: #64748b; margin: 0 0 8px; }
  .letter-pdf-prose .letter-info-table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 10pt; }
  .letter-pdf-prose .letter-info-table th { text-align: left; width: 38%; padding: 8px 10px; background: #f1f5f9; border: 1px solid #e2e8f0; font-weight: 600; color: #334155; }
  .letter-pdf-prose .letter-info-table td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #0f172a; }
  .letter-pdf-prose .letter-ol { margin: 8px 0 12px 1.2em; padding: 0; }
  .letter-pdf-prose .letter-ol li { margin-bottom: 6px; }
  .letter-pdf-prose .letter-small { font-size: 10pt; color: #475569; }
  .letter-pdf-prose .letter-upper { text-transform: uppercase; letter-spacing: 0.04em; font-size: 10pt; }
  .letter-pdf-prose .letter-close { margin-top: 28px; margin-bottom: 0; }
  .letter-pdf-prose .letter-sig-space { height: 36px; }
  .letter-pdf-prose .letter-sig-name { font-weight: 700; margin: 0; }
  .letter-pdf-prose .letter-sig-title { font-size: 10pt; color: #64748b; margin: 4px 0 0; }
  /* Quill output (rich-text letter edits) — classes preserved in saved HTML */
  .letter-pdf-prose .ql-font-serif { font-family: Georgia, 'Times New Roman', serif; }
  .letter-pdf-prose .ql-font-monospace { font-family: Consolas, Monaco, 'Courier New', monospace; }
  .letter-pdf-prose .ql-size-small { font-size: 0.85em; }
  .letter-pdf-prose .ql-size-large { font-size: 1.35em; }
  .letter-pdf-prose .ql-size-huge { font-size: 1.85em; }
  .letter-pdf-prose .ql-align-center { text-align: center; }
  .letter-pdf-prose .ql-align-right { text-align: right; }
  .letter-pdf-prose .ql-align-justify { text-align: justify; }
  .letter-pdf-sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  .letter-pdf-sig-cell { min-height: 100px; }
  .letter-pdf-sig-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0 0 6px; }
  .letter-pdf-sig-line { border-bottom: 1px solid #94a3b8; height: 40px; margin-bottom: 4px; }
  .letter-pdf-sig-hint { font-size: 9pt; color: #94a3b8; margin: 0; }
  .letter-pdf-sig-name { font-weight: 600; font-size: 10pt; margin: 0 0 4px; }
  .letter-pdf-sig-img { max-height: 64px; border: 1px solid #e2e8f0; background: #fff; }
  .letter-pdf-footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9pt; color: #64748b; }
  .letter-pdf-footer-sub { margin-top: 6px; font-size: 8pt; color: #94a3b8; }
  @media print { body { margin: 0; } .letter-pdf-doc { padding: 12mm; } }
`

export function openLetterPrint(opts) {
  const inner = buildLetterInnerForPrint(opts)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(opts.letterTitle || 'Letter')}</title><style>${PRINT_STYLES}</style></head><body>${inner}<script>window.onload=function(){window.print();}</script></body></html>`)
  w.document.close()
}

export async function downloadLetterPdf(opts, filenameBase = 'letter') {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;padding:40px 48px;background:#fff;box-sizing:border-box;'
  wrap.innerHTML = buildLetterInnerForPrint(opts)
  document.body.appendChild(wrap)
  const doc = wrap.querySelector('.letter-pdf-doc')
  if (doc) {
    const st = document.createElement('style')
    st.textContent = PRINT_STYLES
    doc.insertBefore(st, doc.firstChild)
  }
  try {
    const canvas = await html2canvas(doc || wrap, {
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
