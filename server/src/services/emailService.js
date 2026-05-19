/**
 * emailService.js
 * Central email notification service for Raxwo ERP.
 * All emails use the existing mailer.js utility.
 * Set SMTP_* env vars in .env to enable sending.
 */
const { sendMail } = require('../utils/mailer');

const FROM = process.env.SMTP_FROM || 'noreply@raxwo.net';
const APP_URL = process.env.APP_URL || 'https://raxwo.net';

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const wrap = (content) => `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1e293b;max-width:580px;margin:0 auto;padding:0;">
<div style="background:linear-gradient(135deg,#0B1F3A,#1a3a6b);padding:20px 24px;border-radius:12px 12px 0 0;">
  <h2 style="color:#fff;margin:0;font-size:20px;font-weight:700;">🏢 Raxwo Technology</h2>
</div>
<div style="background:#f8fafc;padding:28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
  ${content}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="font-size:12px;color:#94a3b8;">This is an automated message from the Raxwo ERP system. Do not reply directly to this email.</p>
  <p style="font-size:12px;color:#94a3b8;">Raxwo Technology · Colombo, Sri Lanka · <a href="mailto:raxwotechnology@gmail.com" style="color:#2563eb;">raxwotechnology@gmail.com</a></p>
</div>
</body></html>`;

const btn = (label, url) =>
  `<p style="margin:20px 0;"><a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:14px;">${label}</a></p>`;

const safe = (fn) => async (...args) => {
  try { return await fn(...args); }
  catch (err) { console.warn('[emailService] Failed to send email:', err?.message); }
};

/* ─── Leave Notifications ────────────────────────────────────────────────────── */
exports.sendLeaveSubmittedEmail = safe(async (employeeEmail, employeeName, leaveType, days, startDate) => {
  await sendMail({
    from: FROM, to: employeeEmail,
    subject: `Leave Request Submitted — ${leaveType}`,
    html: wrap(`
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your <strong>${leaveType} leave</strong> request for <strong>${days} day(s)</strong> starting <strong>${new Date(startDate).toLocaleDateString('en-LK')}</strong> has been submitted successfully.</p>
      <p>You will be notified once it is reviewed by your manager.</p>
      ${btn('View My Leaves', `${APP_URL}/developer/leaves`)}
    `),
  });
});

exports.sendLeaveDecisionEmail = safe(async (employeeEmail, employeeName, leaveType, status, reason) => {
  const approved = status === 'approved';
  await sendMail({
    from: FROM, to: employeeEmail,
    subject: `Leave Request ${approved ? 'Approved ✅' : 'Rejected ❌'} — ${leaveType}`,
    html: wrap(`
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your <strong>${leaveType} leave</strong> request has been <strong style="color:${approved ? '#16a34a' : '#dc2626'};">${status}</strong>.</p>
      ${reason ? `<div style="background:${approved ? '#f0fdf4' : '#fef2f2'};border-left:4px solid ${approved ? '#16a34a' : '#dc2626'};padding:12px;border-radius:4px;margin:12px 0;font-size:14px;">${reason}</div>` : ''}
      ${btn('View Details', `${APP_URL}/developer/leaves`)}
    `),
  });
});

/* ─── Request Notifications ─────────────────────────────────────────────────── */
exports.sendRequestSubmittedEmail = safe(async (managerEmails, employeeName, subject, type) => {
  if (!managerEmails?.length) return;
  await sendMail({
    from: FROM, to: managerEmails.join(','),
    subject: `New Employee Request: ${subject}`,
    html: wrap(`
      <p>A new <strong>${type.replace(/_/g, ' ')}</strong> request has been submitted by <strong>${employeeName}</strong>.</p>
      <div style="background:#f1f5f9;padding:14px;border-radius:8px;margin:12px 0;">
        <p style="margin:0;font-size:15px;font-weight:600;">"${subject}"</p>
      </div>
      <p>Please review and take action in the admin panel.</p>
      ${btn('Review Request', `${APP_URL}/admin/requests`)}
    `),
  });
});

exports.sendRequestDecisionEmail = safe(async (employeeEmail, employeeName, subject, status, note) => {
  const approved = status.includes('approved');
  await sendMail({
    from: FROM, to: employeeEmail,
    subject: `Request ${approved ? 'Approved ✅' : 'Rejected ❌'}: ${subject}`,
    html: wrap(`
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your request "<strong>${subject}</strong>" has been <strong style="color:${approved ? '#16a34a' : '#dc2626'};">${approved ? 'approved' : 'rejected'}</strong>.</p>
      ${note ? `<div style="background:#f1f5f9;padding:12px;border-radius:8px;margin:12px 0;font-size:14px;"><strong>Note:</strong> ${note}</div>` : ''}
      ${btn('View My Requests', `${APP_URL}/developer/requests`)}
    `),
  });
});

/* ─── Work Log Notifications ─────────────────────────────────────────────────── */
exports.sendWorkLogSubmittedEmail = safe(async (managerEmails, employeeName, date, taskCount) => {
  if (!managerEmails?.length) return;
  await sendMail({
    from: FROM, to: managerEmails.join(','),
    subject: `Work Log Submitted — ${employeeName} (${new Date(date).toLocaleDateString('en-LK')})`,
    html: wrap(`
      <p><strong>${employeeName}</strong> has submitted a work log for <strong>${new Date(date).toLocaleDateString('en-LK')}</strong> with <strong>${taskCount} task(s)</strong> completed.</p>
      ${btn('Review Work Log', `${APP_URL}/admin/work-logs`)}
    `),
  });
});

exports.sendWorkLogApprovedEmail = safe(async (employeeEmail, employeeName, date, note) => {
  await sendMail({
    from: FROM, to: employeeEmail,
    subject: `Work Log Approved ✅ — ${new Date(date).toLocaleDateString('en-LK')}`,
    html: wrap(`
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your work log for <strong>${new Date(date).toLocaleDateString('en-LK')}</strong> has been <strong style="color:#16a34a;">approved</strong>.</p>
      ${note ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px;border-radius:4px;margin:12px 0;font-size:14px;">${note}</div>` : ''}
      ${btn('View My Work Logs', `${APP_URL}/developer/work-logs`)}
    `),
  });
});

/* ─── Tool Assignment Notifications ─────────────────────────────────────────── */
exports.sendToolAssignedEmail = safe(async (employeeEmail, employeeName, toolName, accessUrl) => {
  await sendMail({
    from: FROM, to: employeeEmail,
    subject: `New Tool Access Assigned: ${toolName} 🔑`,
    html: wrap(`
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>You have been granted access to <strong>${toolName}</strong>. Your credentials are available in the employee portal.</p>
      ${accessUrl ? `<p>Direct access: <a href="${accessUrl}" style="color:#2563eb;">${accessUrl}</a></p>` : ''}
      ${btn('View My Tools', `${APP_URL}/developer/tools`)}
    `),
  });
});

exports.sendToolRevokedEmail = safe(async (employeeEmail, employeeName, toolName) => {
  await sendMail({
    from: FROM, to: employeeEmail,
    subject: `Tool Access Revoked: ${toolName}`,
    html: wrap(`
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your access to <strong>${toolName}</strong> has been revoked by your administrator.</p>
      <p>If you believe this is an error, please contact HR or your manager.</p>
      ${btn('View My Tools', `${APP_URL}/developer/tools`)}
    `),
  });
});

/* ─── Payroll Notifications ─────────────────────────────────────────────────── */
exports.sendPayslipReadyEmail = safe(async (employeeEmail, employeeName, month, year, netSalary) => {
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  await sendMail({
    from: FROM, to: employeeEmail,
    subject: `Your Payslip for ${monthName} ${year} is Ready 💰`,
    html: wrap(`
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your payslip for <strong>${monthName} ${year}</strong> has been generated.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:16px 0;text-align:center;">
        <p style="margin:0;font-size:13px;color:#4b5563;">Net Salary</p>
        <p style="margin:4px 0 0;font-size:26px;font-weight:700;color:#15803d;">LKR ${Number(netSalary).toLocaleString()}</p>
      </div>
      ${btn('View Payslip', `${APP_URL}/developer/payslips`)}
    `),
  });
});

/* ─── Payroll Batch Notify (Admin trigger) ───────────────────────────────────── */
exports.sendBatchPayslipEmails = safe(async (payrolls) => {
  for (const p of payrolls) {
    if (p.employee?.userId?.email) {
      await exports.sendPayslipReadyEmail(
        p.employee.userId.email,
        p.employee.userId.name,
        p.month,
        p.year,
        p.netSalary
      );
    }
  }
});
