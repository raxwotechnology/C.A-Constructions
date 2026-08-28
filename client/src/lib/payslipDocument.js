import api from './api'
import { buildDocumentLetterheadHtml, documentPrintStyles } from './documentPrint'
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
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatLkr(val) {
  return Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
      title: 'Managing Director',
    },
    manager: {
      url: siteSigs.manager?.url || '',
      name: siteSigs.manager?.label || 'General Manager',
      title: 'General Manager',
    },
    hr: {
      url: siteSigs.hr?.url || '',
      name: siteSigs.hr?.label || 'Head of HR',
      title: 'Head of Human Resources',
    },
    admin: {
      url: siteSigs.admin?.url || '',
      name: siteSigs.admin?.label || 'Accountant',
      title: 'Finance & Payroll Administrator',
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

export function payslipSignatoryPayload(siteSettings, opts = {}) {
  const sig = resolvePayslipSignatory(siteSettings, opts)
  return {
    role: sig.role,
    signatureUrl: sig.signatureUrl,
    signatureName: sig.signatureName,
    signatureTitle: sig.signatureTitle,
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

export function buildPayslipHtml(payroll, siteSettings = {}, signatoryOpts = {}) {
  const p = payroll || {}
  const sig = resolvePayslipSignatory(siteSettings, {
    ...signatoryOpts,
    savedSignatory: p.payslipSignatory,
  })
  const letterhead = buildDocumentLetterheadHtml(siteSettings, { forPrint: true })
  
  const payLabel = { cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque' }[p.paymentMethod]
    || (p.paymentMethod || 'Bank Transfer').replace(/_/g, ' ')
    
  const empBank = p.employee?.bank || p.bankAccount?.bankName || ''
  const empBranch = p.employee?.bankBranch || p.bankAccount?.branchName || ''
  const empAccount = p.employee?.accountNumber || p.bankAccount?.accountNumber || ''
  const empBankStr = empBank ? `${empBank}${empBranch ? ` (${empBranch})` : ''}${empAccount ? ` - A/C: ${empAccount}` : ''}` : '—'

  const sigImgHtml = sig.signatureUrl
    ? `<img src="${sig.signatureUrl.replace(/"/g, '')}" alt="Signature" style="max-height:55px;max-width:170px;object-fit:contain;display:block;margin-left:auto;margin-bottom:4px"/>`
    : '<div style="height:55px"></div>'

  const totalDeductionsCalc = Number(p.totalDeductions || 0) || (
    Number(p.epfEmployee || 0) +
    Number(p.incomeTaxDeduction || 0) +
    Number(p.advanceDeduction || p.advancePayment || 0) +
    Number(p.loanDeduction || 0) +
    Number(p.leaveDeduction || 0) +
    Number(p.penaltyDeduction || 0) +
    Number(p.deductions || 0)
  )

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payslip ${MONTHS[(p.month || 1) - 1]} ${p.year || ''} - ${esc(p.employee?.userId?.name || p.employee?.fullName || 'Employee')}</title>
  <style>
    ${documentPrintStyles()}
    @page { size: A4; margin: 8mm 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.45;
      margin: 0;
      padding: 10px 14px;
    }
    
    .payslip-container {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
    }

    .slip-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-bottom: 3px solid #ea580c;
      border-radius: 8px;
      padding: 10px 16px;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .slip-banner h2 {
      margin: 0;
      font-size: 12pt;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #ffffff;
      text-transform: uppercase;
    }
    .slip-banner p {
      margin: 2px 0 0;
      font-size: 8.5pt;
      color: #cbd5e1;
      font-weight: 600;
    }
    .status-pill {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 20px;
      display: inline-block;
    }
    .status-paid { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .status-approved { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
    .status-draft { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

    .emp-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .emp-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
    }
    .emp-item {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 3px;
    }
    .emp-label { color: #64748b; font-weight: 600; }
    .emp-val { color: #0f172a; font-weight: 700; text-align: right; }

    .tables-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    .pay-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .pay-table th {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 7px 10px;
      text-align: left;
    }
    .pay-table.earnings th { background: #f0fdf4; color: #166534; border-bottom: 2px solid #bbf7d0; }
    .pay-table.deductions th { background: #fef2f2; color: #991b1b; border-bottom: 2px solid #fecdd3; }

    .pay-table td {
      padding: 6px 10px;
      font-size: 9pt;
      border-bottom: 1px solid #f1f5f9;
    }
    .pay-table tr:last-child td { border-bottom: none; }
    .amt-cell { text-align: right; font-weight: 600; font-family: 'Consolas', 'Courier New', monospace; }
    
    .total-row td {
      font-weight: 800;
      font-size: 9.5pt;
    }
    .total-row.earnings-total td { background: #f8fafc; color: #0f172a; border-top: 2px solid #cbd5e1; }
    .total-row.deductions-total td { background: #fff1f2; color: #991b1b; border-top: 2px solid #fecdd3; }

    .net-hero {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-radius: 8px;
      padding: 12px 18px;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(5,150,105,0.15);
      margin-bottom: 14px;
    }
    .net-hero-title { font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #ffffff; }
    .net-hero-sub { font-size: 8pt; color: #a7f3d0; margin-top: 2px; font-weight: 500; }
    .net-hero-val { font-size: 16pt; font-weight: 900; font-family: 'Consolas', 'Courier New', monospace; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }

    .statutory-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 14px;
      margin-bottom: 16px;
    }
    .statutory-title { font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 4px; }
    .statutory-grid { display: flex; justify-content: space-between; font-size: 8.5pt; color: #334155; }
    .statutory-item span:first-child { color: #64748b; margin-right: 4px; }
    .statutory-item span:last-child { font-weight: 700; font-family: monospace; color: #0f172a; }

    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .confidential-notice {
      font-size: 7.5pt;
      color: #94a3b8;
      line-height: 1.4;
      max-width: 320px;
    }
    .signature-box {
      text-align: right;
      min-width: 170px;
    }
    .signature-line {
      border-top: 1px solid #94a3b8;
      margin-top: 4px;
      padding-top: 3px;
    }
  </style></head><body>
  <div class="payslip-container">
    ${letterhead}
    
    <div class="slip-banner">
      <div>
        <h2>OFFICIAL PAYSLIP</h2>
        <p>For the Period of ${MONTHS[(p.month || 1) - 1]} ${p.year || ''}</p>
      </div>
      <div>
        <span class="status-pill status-${(p.status || 'draft').toLowerCase()}">${esc((p.status || 'DRAFT').toUpperCase())}</span>
      </div>
    </div>

    <div class="emp-box">
      <div class="emp-grid">
        <div class="emp-item"><span class="emp-label">Employee Name:</span><span class="emp-val">${esc(p.employee?.userId?.name || p.employee?.fullName || 'N/A')}</span></div>
        <div class="emp-item"><span class="emp-label">Employee No:</span><span class="emp-val">${esc(p.employee?.employeeNo || p.employee?.employeeId || 'N/A')}</span></div>
        <div class="emp-item"><span class="emp-label">Department:</span><span class="emp-val">${esc(p.employee?.department || 'Civil & Structural Engineering')}</span></div>
        <div class="emp-item"><span class="emp-label">Designation:</span><span class="emp-val">${esc(p.employee?.designation || 'Staff')}</span></div>
        <div class="emp-item"><span class="emp-label">EPF Member No:</span><span class="emp-val">${esc(p.employee?.epfNumber || '—')}</span></div>
        <div class="emp-item"><span class="emp-label">NIC Number:</span><span class="emp-val">${esc(p.employee?.nic || '—')}</span></div>
        <div class="emp-item"><span class="emp-label">Payment Method:</span><span class="emp-val">${esc(payLabel)}</span></div>
        <div class="emp-item"><span class="emp-label">Bank Account:</span><span class="emp-val">${esc(empBankStr)}</span></div>
      </div>
    </div>

    <div class="tables-grid">
      <!-- EARNINGS TABLE -->
      <table class="pay-table earnings">
        <thead>
          <tr>
            <th>Earnings (Additions)</th>
            <th style="text-align:right">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Basic Salary</td><td class="amt-cell">${formatLkr(p.basicSalary)}</td></tr>
          ${p.allowances > 0 ? `<tr><td>Fixed Allowances</td><td class="amt-cell">${formatLkr(p.allowances)}</td></tr>` : ''}
          ${(p.otPay || p.overtime) > 0 ? `<tr><td>Overtime Pay ${p.overtimeHours || p.otHours ? `(${p.overtimeHours || p.otHours} hrs)` : ''}</td><td class="amt-cell">${formatLkr(p.otPay || p.overtime)}</td></tr>` : ''}
          ${p.bonus > 0 ? `<tr><td>Bonus ${p.bonusNote ? `<br/><small style="color:#64748b;font-weight:normal">${esc(p.bonusNote)}</small>` : ''}</td><td class="amt-cell">${formatLkr(p.bonus)}</td></tr>` : ''}
          ${p.commissions > 0 ? `<tr><td>Commissions</td><td class="amt-cell">${formatLkr(p.commissions)}</td></tr>` : ''}
          ${p.projectCommissions > 0 ? `<tr><td>Project Allocations</td><td class="amt-cell">${formatLkr(p.projectCommissions)}</td></tr>` : ''}
          ${p.incentives > 0 ? `<tr><td>Incentives</td><td class="amt-cell">${formatLkr(p.incentives)}</td></tr>` : ''}
          <tr class="total-row earnings-total">
            <td>TOTAL GROSS SALARY</td>
            <td class="amt-cell">${formatLkr(p.grossSalary)}</td>
          </tr>
        </tbody>
      </table>

      <!-- DEDUCTIONS TABLE -->
      <table class="pay-table deductions">
        <thead>
          <tr>
            <th>Deductions</th>
            <th style="text-align:right">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>EPF Employee (8%)</td><td class="amt-cell">${formatLkr(p.epfEmployee)}</td></tr>
          ${p.incomeTaxDeduction > 0 ? `<tr><td>APIT Income Tax</td><td class="amt-cell">${formatLkr(p.incomeTaxDeduction)}</td></tr>` : ''}
          ${(p.advanceDeduction || p.advancePayment) > 0 ? `<tr><td>Salary Advance</td><td class="amt-cell">${formatLkr(p.advanceDeduction || p.advancePayment)}</td></tr>` : ''}
          ${p.loanDeduction > 0 ? `<tr><td>Loan Installment</td><td class="amt-cell">${formatLkr(p.loanDeduction)}</td></tr>` : ''}
          ${p.leaveDeduction > 0 ? `<tr><td>Leave Deduction (No-Pay)</td><td class="amt-cell">${formatLkr(p.leaveDeduction)}</td></tr>` : ''}
          ${p.penaltyDeduction > 0 ? `<tr><td>Late Penalties</td><td class="amt-cell">${formatLkr(p.penaltyDeduction)}</td></tr>` : ''}
          ${p.deductions > 0 ? `<tr><td>Other Deductions</td><td class="amt-cell">${formatLkr(p.deductions)}</td></tr>` : ''}
          <tr class="total-row deductions-total">
            <td>TOTAL DEDUCTIONS</td>
            <td class="amt-cell">${formatLkr(totalDeductionsCalc)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="net-hero">
      <div>
        <div class="net-hero-title">NET SALARY PAYABLE</div>
        <div class="net-hero-sub">Transferred to Employee Bank Account</div>
      </div>
      <div class="net-hero-val">LKR ${formatLkr(p.netSalary)}</div>
    </div>

    <div class="statutory-box">
      <div class="statutory-title">Employer Statutory Contributions (Company Contribution - Informational)</div>
      <div class="statutory-grid">
        <div class="statutory-item"><span>EPF Employer (12%):</span><span>LKR ${formatLkr(p.epfEmployer)}</span></div>
        <div class="statutory-item"><span>ETF Employer (3%):</span><span>LKR ${formatLkr(p.etfEmployer)}</span></div>
        <div class="statutory-item"><span>Total Company Remittance (15%):</span><span>LKR ${formatLkr((p.epfEmployer || 0) + (p.etfEmployer || 0))}</span></div>
      </div>
    </div>

    <div class="footer-section">
      <div class="confidential-notice">
        <strong>CONFIDENTIAL PRIVATE DOCUMENT</strong><br/>
        This payslip is computer generated for R.A CREATIONS & HOME DESIGNS (PVT) LTD.<br/>
        Generated: ${new Date().toLocaleString('en-LK')}
      </div>
      <div class="signature-box">
        ${sigImgHtml}
        <div class="signature-line">
          <div style="font-size:9.5pt;font-weight:700;color:#0f172a">${esc(sig.signatureName)}</div>
          <div style="font-size:8pt;color:#64748b;font-weight:600">${esc(sig.signatureTitle)}</div>
          <div style="font-size:7.5pt;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Authorized Signatory</div>
        </div>
      </div>
    </div>
  </div>
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
  const empName = (payroll?.employee?.userId?.name || payroll?.employee?.fullName || 'payslip').replace(/[^\w-]+/g, '_')
  const fname = filenameBase || `Payslip_${empName}_${MONTHS[(payroll?.month || 1) - 1]}_${payroll?.year || ''}`

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Pop-up blocked. Please allow pop-ups to export PDF.')
  }
  printWindow.document.write(inlined)
  printWindow.document.close()

  setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch (_) { /* ignore */ }
  }, 600)
}

export function printPayslip(payroll, siteSettings = {}, signatoryOpts = {}) {
  const rawHtml = buildPayslipHtml(payroll, siteSettings, signatoryOpts)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Pop-up blocked. Please allow pop-ups to print payslip.')
  }
  printWindow.document.write(rawHtml)
  printWindow.document.close()
  setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch (_) { /* ignore */ }
  }, 600)
}
