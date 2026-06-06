/**
 * emailService.js
 * Central email notification service for Raxwo ERP.
 * Supports professional, branded HTML templates pulled from SiteSettings.
 */
const { sendMail } = require('../utils/mailer');
const EmailLog = require('../models/EmailLog');
const SiteSetting = require('../models/SiteSetting');
// Note: toAbsoluteUrl removed — use absoluteMediaUrl from the client side instead

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/* ─── Dynamic Template Builder ─────────────────────────────────────────────────── */
const buildEmailHTML = async (title, content) => {
  let settings = await SiteSetting.findOne().lean();
  if (!settings) settings = {};

  const companyName = settings.siteName || 'Raxwo Technology';
  const logoSrc = settings.logoUrl ? (settings.logoUrl.startsWith('http') ? settings.logoUrl : APP_URL + settings.logoUrl) : '';
  const contactEmail = settings.contactEmail || settings.adminEmail || 'contact@raxwo.net';
  const contactPhone = settings.contactPhone || '';
  const address = settings.contactAddress || 'Colombo, Sri Lanka';
  const website = settings.websiteUrl || APP_URL;

  const headerBg = '#0B1F3A';
  const primaryColor = '#2563eb';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
  .header { background: linear-gradient(135deg, ${headerBg}, #1a3a6b); padding: 30px; text-align: center; }
  .header img { max-height: 50px; margin-bottom: 15px; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .body { padding: 40px 30px; line-height: 1.6; font-size: 16px; color: #334155; }
  .footer { background: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
  .footer p { margin: 5px 0; font-size: 13px; color: #64748b; }
  .footer a { color: ${primaryColor}; text-decoration: none; }
  .btn { display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 24px 0; transition: background-color 0.3s; text-align: center; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
  .info-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .info-label { color: #64748b; font-weight: 500; font-size: 14px; }
  .info-val { color: #0f172a; font-weight: 600; text-align: right; font-size: 14px; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      ${logoSrc ? `<img src="${logoSrc}" alt="${companyName} Logo">` : ''}
      <h1>${title}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p><strong>${companyName}</strong></p>
      <p>${address}</p>
      ${contactPhone ? `<p>Phone: ${contactPhone}</p>` : ''}
      <p>Email: <a href="mailto:${contactEmail}">${contactEmail}</a> | Web: <a href="${website}">${website}</a></p>
      <p style="margin-top: 16px; font-size: 12px;">This is an automated message from the ERP system. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`;
};

const btnHtml = (label, url) => `<div style="text-align: center;"><a href="${url}" class="btn">${label}</a></div>`;
const infoBoxHtml = (rows) => {
  const inner = rows.map(r => `<div class="info-row"><span class="info-label">${r.label}</span><span class="info-val">${r.value}</span></div>`).join('');
  return `<div class="info-box">${inner}</div>`;
};


const sendLoggedMail = async (options, moduleName = 'system') => {
  try {
    // Gmail requires from == authenticated SMTP_USER
    options.from = process.env.SMTP_FROM || process.env.SMTP_USER || 'raxwotechnology@gmail.com';
    console.log(`[Email] Sending "${options.subject}" to ${options.to} via ${options.from}`);
    const result = await sendMail(options);
    if (result && result.sent === false) {
      console.warn(`[Email] Skipped (not configured): ${result.reason}`);
      await EmailLog.create({
        recipientEmail: options.to,
        subject: options.subject,
        module: moduleName,
        status: 'failed',
        error: result.reason || 'SMTP not configured'
      }).catch(() => {});
      return;
    }
    await EmailLog.create({
      recipientEmail: options.to,
      subject: options.subject,
      module: moduleName,
      status: 'sent'
    }).catch(() => {});
    console.log(`[Email] ✅ Sent successfully to ${options.to}`);
  } catch (error) {
    console.error(`[Email] ❌ FAILED to send "${options.subject}" to ${options.to}:`, error?.message);
    await EmailLog.create({
      recipientEmail: options.to || 'unknown',
      subject: options.subject || 'unknown',
      module: moduleName,
      status: 'failed',
      error: error?.message || 'Unknown error'
    }).catch(() => {});
  }
};

/* ─── Client / Auth Notifications ────────────────────────────────────────────── */
exports.sendClientWelcomeEmail = async (user, password) => {
  const html = await buildEmailHTML('Welcome to Raxwo', `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>We are thrilled to welcome you to our client portal. An account has been securely created for you.</p>
    ${infoBoxHtml([
      { label: 'Login Email', value: user.email },
      { label: 'Temporary Password', value: password || 'Client@2026' }
    ])}
    <p>Please log in to your portal to view projects, track invoices, and manage your subscriptions. We recommend changing your password after your first login.</p>
    ${btnHtml('Access Portal', `${APP_URL}/login`)}
  `);
  await sendLoggedMail({ to: user.email, subject: 'Welcome to Raxwo Technology', html }, 'auth');
};

/* ─── Project Notifications ──────────────────────────────────────────────────── */
exports.sendProjectAssignedClientEmail = async (clientEmail, clientName, projectDetails) => {
  const html = await buildEmailHTML('Project Initiated', `
    <p>Hi <strong>${clientName}</strong>,</p>
    <p>A new project has been initiated and assigned to your account.</p>
    ${infoBoxHtml([
      { label: 'Project Name', value: projectDetails.title },
      { label: 'Start Date', value: projectDetails.startDate ? new Date(projectDetails.startDate).toLocaleDateString() : 'N/A' },
      { label: 'Status', value: projectDetails.status || 'Active' }
    ])}
    <p>You can track the progress, milestones, and deliverables through your client portal.</p>
    ${btnHtml('View Project', `${APP_URL}/my-projects`)}
  `);
  await sendLoggedMail({ to: clientEmail, subject: `Project Update: ${projectDetails.title}`, html }, 'project');
};

exports.sendProjectAssignedEmployeeEmail = async (employeeEmail, employeeName, projectDetails) => {
  const html = await buildEmailHTML('New Project Assignment', `
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>You have been assigned to a new project.</p>
    ${infoBoxHtml([
      { label: 'Project Name', value: projectDetails.title },
      { label: 'Client', value: projectDetails.clientName || 'Internal' },
      { label: 'Deadline', value: projectDetails.deadline ? new Date(projectDetails.deadline).toLocaleDateString() : 'N/A' }
    ])}
    <p>Please check your dashboard for specific tasks and requirements.</p>
    ${btnHtml('View Dashboard', `${APP_URL}/developer/projects`)}
  `);
  await sendLoggedMail({ to: employeeEmail, subject: `Assigned: ${projectDetails.title}`, html }, 'project');
};

/* ─── Financial / Billing Notifications ──────────────────────────────────────── */
exports.sendInvoiceEmail = async (clientEmail, clientName, invoiceDetails, { shareLink, pdfBuffer } = {}) => {
  const viewUrl = shareLink || `${APP_URL}/client/invoices`;
  const html = await buildEmailHTML('Invoice', `
    <p>Hi <strong>${clientName}</strong>,</p>
    <p>Please find your invoice details below. ${pdfBuffer ? 'A PDF copy is attached to this email.' : ''}</p>
    ${infoBoxHtml([
      { label: 'Invoice No', value: invoiceDetails.invoiceNo },
      { label: 'Amount', value: `${invoiceDetails.currency || 'LKR'} ${Number(invoiceDetails.total).toLocaleString()}` },
      { label: 'Due Date', value: invoiceDetails.dueDate ? new Date(invoiceDetails.dueDate).toLocaleDateString() : 'N/A' },
      { label: 'Balance Due', value: `${invoiceDetails.currency || 'LKR'} ${Number(invoiceDetails.remainingBalance ?? invoiceDetails.total).toLocaleString()}` },
    ])}
    ${btnHtml('View in Portal', viewUrl)}
  `);
  const mailOpts = {
    to: clientEmail,
    subject: `Invoice ${invoiceDetails.invoiceNo}`,
    html,
  };
  if (pdfBuffer) {
    mailOpts.attachments = [{
      filename: `${invoiceDetails.invoiceNo || 'invoice'}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }];
  }
  await sendLoggedMail(mailOpts, 'invoice');
};

exports.sendQuotationEmail = async (clientEmail, clientName, quoteDetails, { shareLink, pdfBuffer } = {}) => {
  const viewUrl = shareLink || `${APP_URL}/my-account?quotation=${quoteDetails._id || ''}`;
  const html = await buildEmailHTML('Quotation', `
    <p>Hi <strong>${clientName}</strong>,</p>
    <p>Thank you for your interest. ${pdfBuffer ? 'Your quotation is attached as a PDF.' : 'Your quotation is ready to review.'}</p>
    ${infoBoxHtml([
      { label: 'Quotation No', value: quoteDetails.quotationNo },
      { label: 'Total Amount', value: `${quoteDetails.currency || 'LKR'} ${Number(quoteDetails.total).toLocaleString()}` },
      { label: 'Valid Until', value: quoteDetails.validUntil ? new Date(quoteDetails.validUntil).toLocaleDateString() : 'N/A' },
    ])}
    ${btnHtml('View Online', viewUrl)}
  `);
  const mailOpts = {
    to: clientEmail,
    subject: `Quotation ${quoteDetails.quotationNo}`,
    html,
  };
  if (pdfBuffer) {
    mailOpts.attachments = [{
      filename: `${quoteDetails.quotationNo || 'quotation'}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }];
  }
  await sendLoggedMail(mailOpts, 'quotation');
};

exports.sendSubscriptionHistoryEmail = async (clientEmail, clientName, subDetails, { shareLink, pdfBuffer } = {}) => {
  const viewUrl = shareLink || `${APP_URL}/my-subscriptions`;
  const html = await buildEmailHTML('Subscription Payment History', `
    <p>Hi <strong>${clientName}</strong>,</p>
    <p>Please find the payment history for your subscription <strong>"${subDetails.title}"</strong> below.</p>
    ${infoBoxHtml([
      { label: 'Subscription No', value: subDetails.subscriptionNo || 'N/A' },
      { label: 'Total Billed', value: `LKR ${Number(subDetails.totalBilled || 0).toLocaleString()}` },
      { label: 'Total Paid', value: `LKR ${Number(subDetails.totalPaid || 0).toLocaleString()}` },
      { label: 'Remaining Balance', value: `LKR ${Math.max(0, (subDetails.totalBilled || 0) - (subDetails.totalPaid || 0)).toLocaleString()}` },
    ])}
    ${btnHtml('View Online', viewUrl)}
  `);
  const mailOpts = {
    to: clientEmail,
    subject: `Payment History: ${subDetails.title}`,
    html,
  };
  if (pdfBuffer) {
    mailOpts.attachments = [{
      filename: `Subscription_History_${subDetails.subscriptionNo || 'receipt'}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }];
  }
  await sendLoggedMail(mailOpts, 'subscription');
};

/* ─── Payroll & HR Notifications ─────────────────────────────────────────────── */
exports.sendPayslipReadyEmail = async (employeeEmail, employeeName, details) => {
  const monthName = new Date(details.year, details.month - 1).toLocaleString('default', { month: 'long' });
  const html = await buildEmailHTML('Salary Payment Confirmation', `
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Your salary payment for <strong>${monthName} ${details.year}</strong> has been processed.</p>
    ${infoBoxHtml([
      { label: 'Net Salary', value: `LKR ${Number(details.netSalary).toLocaleString()}` },
      { label: 'Payment Method', value: 'Bank Transfer' }
    ])}
    <p>Your detailed payslip (including overtime, deductions, and bonuses) is now available for download.</p>
    ${btnHtml('Download Payslip', `${APP_URL}/developer/payslips`)}
  `);
  await sendLoggedMail({ to: employeeEmail, subject: `Salary Confirmation: ${monthName} ${details.year}`, html }, 'payroll');
};

exports.sendLeaveSubmittedEmail = async (employeeEmail, employeeName, leaveDetails) => {
  const html = await buildEmailHTML('Leave Request Submitted', `
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Your leave request has been submitted to your manager.</p>
    ${infoBoxHtml([
      { label: 'Leave Type', value: leaveDetails.leaveType },
      { label: 'Duration', value: `${leaveDetails.days} day(s)` },
      { label: 'Start Date', value: new Date(leaveDetails.startDate).toLocaleDateString() }
    ])}
    ${btnHtml('View Request', `${APP_URL}/developer/leaves`)}
  `);
  await sendLoggedMail({ to: employeeEmail, subject: `Leave Request Submitted — ${leaveDetails.leaveType}`, html }, 'leave');
};

exports.sendLeaveDecisionEmail = async (employeeEmail, employeeName, leaveDetails) => {
  const approved = leaveDetails.status === 'approved';
  const html = await buildEmailHTML('Leave Request Update', `
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Your recent <strong>${leaveDetails.leaveType}</strong> leave request has been <strong style="color:${approved ? '#16a34a' : '#dc2626'};">${leaveDetails.status.toUpperCase()}</strong>.</p>
    ${leaveDetails.reason ? `<div style="background:#f1f5f9;padding:12px;border-left:4px solid ${approved ? '#16a34a' : '#dc2626'};">${leaveDetails.reason}</div>` : ''}
    ${btnHtml('View Details', `${APP_URL}/developer/leaves`)}
  `);
  await sendLoggedMail({ to: employeeEmail, subject: `Leave ${approved ? 'Approved ✅' : 'Rejected ❌'}`, html }, 'leave');
};

/* ─── Batch Operations ───────────────────────────────────────────────────────── */
exports.sendBatchPayslipEmails = async (payrolls) => {
  for (const p of payrolls) {
    if (p.employee?.userId?.email) {
      await exports.sendPayslipReadyEmail(
        p.employee.userId.email,
        p.employee.userId.name,
        { month: p.month, year: p.year, netSalary: p.netSalary }
      );
    }
  }
};
