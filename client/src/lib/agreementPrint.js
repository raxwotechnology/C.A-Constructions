import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function escapeHtml(s) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeImgSrc(u) {
  if (!u || typeof u !== 'string') return ''
  return u.replace(/"/g, '').replace(/'/g, '').trim()
}

export function buildAgreementBodyHtml(opts) {
  const {
    siteName,
    logoUrl,
    address,
    phone,
    email,
    websiteUrl,
    locationLine,
    title,
    agreementNo,
    agreementDate,
    bodyHtml,
    signatures,
  } = opts
  const initials = escapeHtml((siteName || 'C').trim().slice(0, 2).toUpperCase())
  const logoInner = logoUrl
    ? `<img src="${safeImgSrc(logoUrl)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;"/>`
    : `<span style="font-size:26px;font-weight:800;color:#0f172a;font-family:system-ui,Segoe UI,sans-serif;letter-spacing:-0.02em;">${initials}</span>`
  const contactRows = [
    address ? `<div><span style="color:#94a3b8">Address:</span> ${escapeHtml(address)}</div>` : '',
    phone ? `<div><span style="color:#94a3b8">Tel:</span> ${escapeHtml(phone)}</div>` : '',
    email ? `<div><span style="color:#94a3b8">Email:</span> ${escapeHtml(email)}</div>` : '',
    websiteUrl ? `<div><span style="color:#94a3b8">Web:</span> <a href="${escapeHtml(websiteUrl)}" style="color:#2563eb;text-decoration:none">${escapeHtml(websiteUrl)}</a></div>` : '',
    locationLine ? `<div><span style="color:#94a3b8">Branch:</span> ${escapeHtml(locationLine)}</div>` : '',
  ].filter(Boolean).join('')

  const sigBlock = (heading, data, name) => {
    if (!data) {
      return `<div style="padding:10px;border:1px solid #e2e8f0;border-radius:6px;"><p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;color:#64748b;letter-spacing:0.04em;">${heading}</p><p style="margin:0;font-size:10pt;">Signature: ___________________________</p>${name ? `<p style="margin:6px 0 0;font-size:10pt;">Name: ${escapeHtml(name)}</p>` : ''}</div>`
    }
    return `<div style="padding:10px;border:1px solid #e2e8f0;border-radius:6px;"><p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;color:#64748b;">${heading}</p>${name ? `<p style="margin:0 0 6px;font-weight:600;font-size:10pt;">${escapeHtml(name)}</p>` : ''}<img src="${safeImgSrc(data)}" alt="" style="max-height:80px;border:1px solid #f1f5f9;background:#fff;"/></div>`
  }

  const witness =
    signatures?.witness?.name || signatures?.witness?.data
      ? `<div style="margin-top:14px;padding:10px;border:1px solid #e2e8f0;border-radius:6px;font-size:10pt;"><strong>Witness</strong>${signatures.witness.name ? `: ${escapeHtml(signatures.witness.name)}` : ''}${signatures.witness.data ? `<br/><img src="${safeImgSrc(signatures.witness.data)}" style="max-height:72px;margin-top:6px;border:1px solid #f1f5f9;"/>` : ''}</div>`
      : ''

  const sealHtml = signatures?.seal?.data
      ? `<div style="margin-top:14px;padding:10px;border:1px solid #e2e8f0;border-radius:6px;font-size:10pt;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;"><strong>Company Seal</strong><img src="${safeImgSrc(signatures.seal.data)}" style="max-height:96px;margin-top:6px;"/></div>`
      : ''

  return `
    <div style="margin-bottom:28px;padding:22px 24px;border-radius:14px;background:linear-gradient(135deg,#f8fafc 0%,#e8eef5 55%,#f1f5f9 100%);border:1px solid #cbd5e1;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
        <div style="flex-shrink:0;width:88px;height:88px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(15,23,42,0.08);overflow:hidden;padding:8px;">
          ${logoInner}
        </div>
        <div style="flex:1;min-width:200px;">
          <p style="margin:0;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;font-family:system-ui,Segoe UI,sans-serif;font-weight:600;">Official agreement</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:800;color:#0c1a2e;font-family:Georgia,serif;line-height:1.15;letter-spacing:-0.02em;">${escapeHtml(siteName || 'Company')}</h1>
          ${contactRows ? `<div style="margin:10px 0 0;font-size:10pt;color:#475569;font-family:system-ui,Segoe UI,sans-serif;line-height:1.65;text-align:left">${contactRows}</div>` : ''}
        </div>
      </div>
    </div>
    <p style="text-align:right;font-size:10pt;color:#64748b;margin:0 0 16px;font-family:system-ui,Segoe UI,sans-serif;">Ref: <strong>${escapeHtml(agreementNo || '—')}</strong> &nbsp;|&nbsp; Date: <strong>${escapeHtml(agreementDate || '')}</strong></p>
    <h2 style="font-size:14pt;margin:0 0 16px;color:#0f172a;font-family:Georgia,serif;">${escapeHtml(title || 'Agreement')}</h2>
    <div class="agreement-content" style="font-family:Georgia,serif;font-size:11pt;line-height:1.6;color:#1e293b;">${bodyHtml || ''}</div>
    <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-family:system-ui,Segoe UI,sans-serif;">
      ${sigBlock('Service provider', signatures?.provider?.data, signatures?.provider?.signerName)}
      ${sigBlock('Client / counterparty', signatures?.client?.data, signatures?.client?.signerName)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${witness}
      ${sealHtml}
    </div>
  `
}

export function openAgreementPrint(opts) {
  const inner = buildAgreementBodyHtml(opts)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(opts.agreementNo || 'Agreement')}</title>
    <style>
      body { font-family: Georgia, serif; color: #111; line-height: 1.55; padding: 48px; max-width: 800px; margin: 0 auto; }
      .agreement-content h1, .agreement-content h2, .agreement-content h3 { font-family: system-ui, sans-serif; color: #0f172a; margin-top: 1.25em; margin-bottom: 0.5em; }
      .agreement-content p { margin: 0 0 12px; }
      .agreement-content ul { margin: 0 0 12px 1.2em; }
      @media print { body { padding: 12mm; } }
    </style></head><body>${inner}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},300);}</script></body></html>`)
  w.document.close()
}

export async function downloadAgreementPdf(opts, filenameBase = 'agreement') {
  const wrap = document.createElement('div')
  wrap.setAttribute('dir', 'ltr')
  wrap.style.cssText =
    'position:fixed;left:-9999px;top:0;width:794px;padding:40px 48px;background:#fff;box-sizing:border-box;'
  wrap.innerHTML = buildAgreementBodyHtml(opts)
  document.body.appendChild(wrap)
  try {
    const canvas = await html2canvas(wrap, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: wrap.scrollWidth,
      height: wrap.scrollHeight,
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

    const safe = String(filenameBase).replace(/[^\w\-]+/g, '_')
    pdf.save(`${safe}.pdf`)
  } finally {
    document.body.removeChild(wrap)
  }
}
