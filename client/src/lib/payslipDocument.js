import api from './api'
import { buildDocumentLetterheadHtml, documentPrintStyles, directorSealBlockHtml } from './documentPrint'
import { absoluteMediaUrl } from './media'

export const PAYSLIP_SIGNATORY_ROLES = [
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: 'Admin' },
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function esc(s) {
  if (s == null) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Resolve signatory for payslip from site settings and optional overrides */
export function resolvePayslipSignatory(siteSettings = {}, opts = {}) {
  const saved = opts.savedSignatory
  const role = saved?.role || opts.role || siteSettings?.quotationDirectorRole || 'hr'
  const siteSigs = siteSettings?.signatures || {}
  const byRole = {
    director: {
      url: siteSigs.director?.url || siteSigs.admin?.url || '',
      name: siteSettings?.quotationDirectorName || siteSigs.director?.label || 'Director',
      title: 'Director',
    },
    manager: {
      url: siteSigs.manager?.url || '',
      name: siteSigs.manager?.label || 'Manager',
      title: 'Manager',
    },
    hr: {
      url: siteSigs.hr?.url || '',
      name: siteSigs.hr?.label || 'HR',
      title: 'Human Resources',
    },
    admin: {
      url: siteSigs.admin?.url || '',
      name: siteSigs.admin?.label || 'Admin',
      title: 'Administrator',
    },
  }
  const sig = byRole[role] || byRole.hr
  const customSig = opts.customSignatureUrl || ''

  return {
    role,
    signatureUrl: absoluteMediaUrl(customSig || saved?.signatureUrl || sig.url),
    signatureName: saved?.signatureName || sig.name,
    signatureTitle: saved?.signatureTitle || sig.title,
  }
}

/** Branding object for buildPayslipHtml from payroll record + live settings */
export function payslipBrandingFromPayroll(siteSettings, payroll, liveOpts = {}) {
  const saved = payroll?.payslipSignatory
  return resolvePayslipSignatory(siteSettings, {
    role: saved?.role || liveOpts.role || 'hr',
    customSignatureUrl: liveOpts.customSignatureUrl,
    savedSignatory: saved,
  })
}

function row(label, val, cls = '') {
  return Number(val || 0) > 0
    ? `<div class="row ${cls}"><span>${esc(label)}</span><span>LKR ${Number(val || 0).toLocaleString()}</span></div>`
    : ''
}

export function buildPayslipHtml(payroll, siteSettings = {}, signatoryOpts = {}) {
  const p = payroll || {}
  const sig = resolvePayslipSignatory(siteSettings, {
    ...signatoryOpts,
    savedSignatory: p.payslipSignatory,
  })
  const letterhead = buildDocumentLetterheadHtml(siteSettings, { forPrint: true })
  const payLabel = { cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque' }[p.paymentMethod]
    || (p.paymentMethod || '—').replace(/_/g, ' ')
  const bankLabel = p.bankAccount?.bankName
    ? `${p.bankAccount.bankName}${p.bankAccount.branchName ? ` · ${p.bankAccount.branchName}` : ''} (${p.bankAccount.accountNumber || ''})`
    : ''

  const sigImgHtml = sig.signatureUrl
    ? `<img src="${sig.signatureUrl.replace(/"/g, '')}" alt="Signature" style="max-height:60px;max-width:180px;object-fit:contain;display:block;margin-left:auto;margin-bottom:4px"/>`
    : '<div style="height:60px"></div>'

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payslip ${MONTHS[(p.month || 1) - 1]} ${p.year || ''}</title>
  <style>
    ${documentPrintStyles()}
    @page { size: A4; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body { width: 100%; max-width: 100%; margin: 0; padding: 16px 20px; box-sizing: border-box; }
    .slip-banner{width:100%;box-sizing:border-box;background:linear-gradient(135deg,#0f172a,#1e3a8a);color:#fff;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
    .slip-banner h3{margin:0;font-size:15px;font-weight:700}
    .slip-banner .status{font-size:10px;font-weight:700;text-transform:uppercase;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.15)}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;width:100%;box-sizing:border-box}
    .info-row{display:flex;justify-content:space-between;font-size:12px;color:#555;padding:4px 0;border-bottom:1px solid #f0f0f0}
    .info-row span:last-child{font-weight:600;color:#111}
    .sec-title{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#64748b;font-weight:700;margin:14px 0 6px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;width:100%}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px;width:100%}
    .add{color:#16a34a}.ded{color:#dc2626}
    .net{width:100%;box-sizing:border-box;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-top:12px;display:flex;justify-content:space-between;font-weight:800;font-size:16px;color:#15803d}
    .foot{margin-top:20px;font-size:9px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:10px;line-height:1.5;width:100%}
  </style></head><body>
  ${letterhead}
  <div class="slip-banner">
    <div><h3>Official Payslip</h3><p style="margin:4px 0 0;font-size:11px;opacity:.85">${esc(MONTHS[(p.month || 1) - 1])} ${p.year || ''}</p></div>
    <span class="status">${esc((p.status || '').toUpperCase())}</span>
  </div>
  <div class="info">
    <div class="info-row"><span>Employee</span><span>${esc(p.employee?.userId?.name || 'N/A')}</span></div>
    <div class="info-row"><span>Emp No</span><span>${esc(p.employee?.employeeNo || 'N/A')}</span></div>
    <div class="info-row"><span>Department</span><span>${esc(p.employee?.department || '—')}</span></div>
    <div class="info-row"><span>Designation</span><span>${esc(p.employee?.designation || '—')}</span></div>
    <div class="info-row"><span>Payment method</span><span>${esc(payLabel)}</span></div>
    ${bankLabel ? `<div class="info-row"><span>Source Bank</span><span>${esc(bankLabel)}</span></div>` : ''}
    ${p.employee?.bank ? `<div class="info-row"><span>Employee Bank</span><span>${esc(p.employee.bank)}${p.employee.bankBranch ? ` · ${esc(p.employee.bankBranch)}` : ''}</span></div>` : ''}
    ${p.employee?.accountNumber ? `<div class="info-row"><span>Employee A/C</span><span>${esc(p.employee.accountNumber)}</span></div>` : ''}
    ${p.chequeNumber ? `<div class="info-row"><span>Cheque no.</span><span>${esc(p.chequeNumber)}</span></div>` : ''}
  </div>
  <div class="sec-title">Earnings</div>
  ${row('Basic Salary', p.basicSalary)}
  ${row('Allowances', p.allowances, 'add')}
  ${row('Overtime Pay', p.otPay || p.overtime, 'add')}
  ${row(`Bonus${p.bonusNote ? ` (${p.bonusNote})` : ''}`, p.bonus, 'add')}
  ${row('Commissions', p.commissions, 'add')}
  ${row('Project Commissions', p.projectCommissions, 'add')}
  <div class="row" style="font-weight:600"><span>Gross Salary</span><span>LKR ${Number(p.grossSalary || 0).toLocaleString()}</span></div>
  <div class="sec-title">Deductions</div>
  ${row('EPF Employee', p.epfEmployee, 'ded')}
  ${row('Income Tax', p.incomeTaxDeduction, 'ded')}
  ${row('Advance Deduction', p.advanceDeduction || p.advancePayment, 'ded')}
  ${row('Loan Deduction', p.loanDeduction, 'ded')}
  ${row('Leave Deduction', p.leaveDeduction, 'ded')}
  ${row('Late Penalties', p.penaltyDeduction, 'ded')}
  ${row('Other Deductions', p.deductions, 'ded')}
  <div class="row" style="font-weight:600;margin-top:6px"><span>Total Deductions</span><span>LKR ${Number(p.totalDeductions || 0).toLocaleString()}</span></div>
  <div class="net"><span>Net Salary</span><span>LKR ${Number(p.netSalary || 0).toLocaleString()}</span></div>
  <div class="sec-title">Statutory (Employer — Informational)</div>
  ${row('EPF Employer (12%)', p.epfEmployer)}
  ${row('ETF Employer (3%)', p.etfEmployer)}
  <div style="margin-top:32px;text-align:right;page-break-inside:avoid">
    ${sigImgHtml}
    <div style="border-top:1px solid #94a3b8;display:inline-block;min-width:180px;padding-top:6px;margin-top:4px">
      <div style="font-size:11px;font-weight:700;color:#0f172a">${esc(sig.signatureName)}</div>
      <div style="font-size:9.5px;color:#64748b;font-weight:500;margin-top:2px">${esc(sig.signatureTitle)}</div>
      <div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">Authorized Signatory</div>
    </div>
  </div>
  <div class="foot">${esc(siteSettings?.siteName || '')}${siteSettings?.contactAddress ? ` · ${esc(siteSettings.contactAddress)}` : ''}<br/>Generated: ${new Date().toLocaleString()}</div>
  </body></html>`
}

async function inlineImagesToDataUrls(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  const imgs = div.querySelectorAll('img')
  for (const img of imgs) {
    try {
      const src = img.getAttribute('src')
      if (!src || src.startsWith('data:')) continue
      const res = await fetch(src)
      const blob = await res.blob()
      const reader = new FileReader()
      const dataUrl = await new Promise((r) => { reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob) })
      img.setAttribute('src', dataUrl)
    } catch { /* keep original */ }
  }
  return div.innerHTML
}

export async function downloadPayslipPdf(payroll, siteSettings, signatoryOpts = {}, filenameBase) {
  const rawHtml = buildPayslipHtml(payroll, siteSettings, signatoryOpts)
  const inlined = await inlineImagesToDataUrls(rawHtml)
  const empName = (payroll?.employee?.userId?.name || 'payslip').replace(/[^\w-]+/g, '_')
  const fname = filenameBase || `Payslip_${empName}_${MONTHS[(payroll?.month || 1) - 1]}_${payroll?.year || ''}`

  try {
    const { htmlStringToPdfDownload } = await import('./pdfGenerator')
    // We send the HTML to the backend to apply letterhead wrapping/inlining (if needed) and get final HTML string back
    const res = await api.post(`/payroll/generate-pdf?html=true`, { html: inlined, filename: fname }, { responseType: 'text' })
    const finalHtml = typeof res.data === 'string' ? res.data : await res.data.text()
    
    await htmlStringToPdfDownload(finalHtml, fname)
  } catch (err) {
    console.error('Payslip PDF Generation Error:', err)
    throw err
  }
}

export async function printPayslip(payroll, siteSettings, signatoryOpts = {}) {
  const html = buildPayslipHtml(payroll, siteSettings, signatoryOpts)
  const inlined = await inlineImagesToDataUrls(html)
  let frame = document.getElementById('payroll-print-frame')
  if (!frame) {
    frame = document.createElement('iframe')
    frame.id = 'payroll-print-frame'
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(frame)
  }
  const doc = frame.contentWindow.document
  doc.open()
  doc.write(inlined)
  doc.close()
  frame.contentWindow.focus()
  setTimeout(() => frame.contentWindow.print(), 400)
}

export function payslipSignatoryPayload(role, customSignatureUrl, siteSettings) {
  const siteSigs = siteSettings?.signatures || {}
  const roleMap = {
    director: {
      url: siteSigs.director?.url || siteSigs.admin?.url || '',
      name: siteSettings?.quotationDirectorName || siteSigs.director?.label || 'Director',
      title: 'Director',
    },
    manager: {
      url: siteSigs.manager?.url || '',
      name: siteSigs.manager?.label || 'Manager',
      title: 'Manager',
    },
    hr: {
      url: siteSigs.hr?.url || '',
      name: siteSigs.hr?.label || 'HR',
      title: 'Human Resources',
    },
    admin: {
      url: siteSigs.admin?.url || '',
      name: siteSigs.admin?.label || 'Admin',
      title: 'Administrator',
    },
  }
  const sig = roleMap[role] || roleMap.hr
  return {
    role,
    signatureUrl: customSignatureUrl || sig.url,
    signatureName: sig.name,
    signatureTitle: sig.title,
  }
}
