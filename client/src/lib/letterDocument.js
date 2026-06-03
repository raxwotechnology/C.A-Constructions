import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { absoluteMediaUrl } from './media'
import { buildCompanyFromSettings, companyContactLines, companyLogoHtml } from './companyBranding'

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
  const nameHtml = sig?.name ? `<p style="margin:4px 0 0;font-size:10pt;font-weight:700;color:#0f172a">${esc(sig.name)}</p>` : ''
  const titleHtml = sig?.title ? `<p style="margin:2px 0 0;font-size:8.5pt;color:#64748b">${esc(sig.title)}</p>` : ''
  if (!sig?.data) {
    return `
      <div style="min-width:160px">
        <div style="height:48px;border-bottom:1px solid #94a3b8;margin-bottom:6px"></div>
        <p style="margin:0;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;font-weight:700">${esc(label)}</p>
        ${nameHtml}${titleHtml}
      </div>`
  }
  return `
    <div style="min-width:160px">
      <img src="${safeImgSrc(sig.data)}" style="max-height:60px;object-fit:contain;display:block;margin-bottom:6px" alt=""/>
      <p style="margin:0;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;font-weight:700">${esc(label)}</p>
      ${nameHtml}${titleHtml}
    </div>`
}

/** Build the quotation-style letterhead (logo+name left, contact right, blue border bottom) */
export function buildLetterheadHtml(company) {
  const logoSrc = absoluteMediaUrl(company.logoPath || company.logo)
  const logoHtml = logoSrc
    ? `<img src="${safeImgSrc(logoSrc)}" alt="" style="max-height:64px;object-fit:contain;flex-shrink:0"/>`
    : `<div style="width:56px;height:56px;border-radius:10px;background:#0ea5e9;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;flex-shrink:0">${esc((company.name || 'C').charAt(0))}</div>`

  const tagline = company.tagline || 'Next Tech Level'
  const taglineHtml = `<p style="margin:4px 0 0;font-size:11pt;font-weight:500;color:#38bdf8">${esc(tagline)}</p>`

  const contactLines = companyContactLines(company)
  const contactHtml = contactLines
    .map(l => `<div style="margin:3px 0;font-size:9.5pt;color:#475569"><span style="color:#38bdf8;font-weight:600;min-width:42px;display:inline-block">${esc(l.label)}</span> ${esc(l.text)}</div>`)
    .join('')

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
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:10pt">
      <div>
        <span style="color:#64748b;margin-right:6px;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Ref:</span>
        <strong style="color:#0f172a">${esc(letterRef || '—')}</strong>
      </div>
      <div>
        <span style="color:#64748b;margin-right:6px;font-size:9pt;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Date:</span>
        <strong style="color:#0f172a">${esc(issuedDate || '')}</strong>
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
  const list = Array.isArray(signatures.list) ? signatures.list : [
    { role: 'HR', ...signatures.hr },
    { role: 'Manager', ...signatures.manager }
  ]
  const listHtml = list.filter(s => s).map(s => sigCell(s.role || 'Signature', s)).join('')
  
  const sealObj = signatures.seal
  const sealHtml = (sealObj?.data && !opts.hideSeal) ? `
    <div style="position:absolute;top:${sealObj.y !== undefined ? sealObj.y : 80}%;left:${sealObj.x !== undefined ? sealObj.x : 85}%;transform:translate(-50%, -50%);text-align:center;z-index:10;pointer-events:none;">
      <p style="margin:0 0 4px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;background:rgba(255,255,255,0.7);padding:2px 4px;border-radius:4px;display:inline-block;">Seal</p><br/>
      <img src="${safeImgSrc(sealObj.data)}" style="max-height:100px;object-fit:contain;opacity:0.9;mix-blend-mode:multiply;pointer-events:auto;"/>
    </div>
  ` : ''

  return `
    <div style="position:relative;margin-top:32px;padding-top:20px;border-top:2px solid #e2e8f0;">
      <div style="display:flex;gap:40px;flex-wrap:wrap;align-items:flex-end;justify-content:flex-end;position:relative;z-index:1;">
        ${listHtml}
      </div>
      ${sealHtml}
    </div>`
}

export function buildFooterHtml(company) {
  return `
    <footer style="margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;font-size:9pt;color:#64748b">
      <p style="margin:5px 0 0;font-size:8pt;color:#94a3b8">This document was generated electronically and is valid with authorised signatures where applied.</p>
    </footer>`
}

export function buildLetterInnerForPrint({ company, letterTitle, letterRef, issuedDate, bodyHtml, signatures }) {
  return `
  <div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#0f172a;font-size:11pt;line-height:1.6;max-width:780px;margin:0 auto">
    ${buildLetterheadHtml(company)}
    ${buildRefDateHtml(letterRef, issuedDate)}
    ${buildTitleHtml(letterTitle)}
    <div class="letter-body" style="margin-top:4px">${bodyHtml || ''}</div>
    ${buildSigsHtml(signatures)}
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
  @media print { body { margin: 0; } }
`

/** Full HTML document — used for the iframe preview so preview === print */
export function buildLetterFullHtml(opts) {
  const inner = buildLetterInnerForPrint(opts)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>* { box-sizing: border-box; } ${PRINT_STYLES}</style></head><body>${inner}</body></html>`
}

export function openLetterPrint(opts) {
  const inner = buildLetterInnerForPrint(opts)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(opts.letterTitle || 'Letter')}</title><style>${PRINT_STYLES}</style></head><body>${inner}<script>window.onload=function(){window.print();}<\/script></body></html>`)
  w.document.close()
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
