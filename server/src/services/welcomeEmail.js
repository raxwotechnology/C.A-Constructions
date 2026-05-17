const { sendMail } = require('../utils/mailer');

const WELCOME_FROM = process.env.WELCOME_EMAIL_FROM || process.env.SMTP_FROM || 'raxwotechnology@gmail.com';
const PORTAL_URL = process.env.CLIENT_PORTAL_URL || process.env.APP_URL || 'https://raxwo.net';

async function sendClientWelcomeEmail(user) {
  const name = user.name || 'there';
  const email = user.email || '';
  const subject = 'Thank you for joining Raxwo Technology';
  const text = [
    `Hi ${name},`,
    '',
    'Thank you for creating your Raxwo client account.',
    '',
    `Email: ${email}`,
    `Portal: ${PORTAL_URL}/login`,
    '',
    'You can sign in to view projects, invoices, subscriptions, and more.',
    '',
    'Best regards,',
    'Raxwo Technology',
    'raxwotechnology@gmail.com',
  ].join('\n');

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto;padding:24px;">
<div style="background:linear-gradient(135deg,#0B1F3A,#1a3a6b);padding:24px;border-radius:12px 12px 0 0;">
<h1 style="color:#fff;margin:0;font-size:22px;">Welcome to Raxwo Technology</h1></div>
<div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
<p>Hi <strong>${name}</strong>,</p>
<p>Thank you for registering with <strong>Raxwo Technology</strong>. Your client portal account is ready.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
<tr><td style="padding:8px 0;color:#64748b;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;font-weight:600;">${email}</td></tr>
<tr><td style="padding:8px 0;color:#64748b;">Account type</td><td style="padding:8px 0;font-weight:600;">Client portal</td></tr>
</table>
<p style="margin:20px 0;"><a href="${PORTAL_URL}/login" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Sign in to your portal</a></p>
<p style="font-size:13px;color:#64748b;">Questions? Contact <a href="mailto:raxwotechnology@gmail.com">raxwotechnology@gmail.com</a>.</p>
<p style="font-size:13px;color:#94a3b8;margin-top:24px;">— Raxwo Technology Team</p>
</div></body></html>`;

  return sendMail({
    from: WELCOME_FROM,
    to: user.email,
    subject,
    html,
    text,
  });
}

module.exports = { sendClientWelcomeEmail, WELCOME_FROM };
