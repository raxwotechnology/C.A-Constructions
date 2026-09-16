const { sendMail } = require('../utils/mailer');

const WELCOME_FROM = process.env.WELCOME_EMAIL_FROM || process.env.SMTP_FROM || 'raxwotechnology@gmail.com';
const PORTAL_URL = process.env.CLIENT_PORTAL_URL || process.env.APP_URL || 'https://raxwo.net';

async function sendClientWelcomeEmail(user, password) {
  const name = user.name || 'there';
  const email = user.email || '';
  const loginUrl = `${PORTAL_URL}/login`;
  const subject = 'Welcome to R A Creations & Home Designs';
  const text = [
    `Hi ${name},`,
    '',
    'Thank you for creating your R A Creations & Home Designs client account.',
    '',
    `Username: ${email}`,
    `Temporary password: ${password}`,
    '',
    `Sign in: ${loginUrl}`,
    '',
    'Please change your password after logging in.',
    '',
    'Best regards,',
    'R A Creations & Home Designs'
  ].join('\n');

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Welcome to R A Creations & Home Designs</h1>
  </div>
  <div style="padding: 24px; background: #ffffff;">
    <p style="font-size: 16px; color: #1e293b;">Hi <strong>${name}</strong>,</p>
    <p>Thank you for registering with <strong>R A Creations & Home Designs</strong>. Your client portal account is ready.</p>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
      <p style="margin: 4px 0;"><strong>Username:</strong> ${email}</p>
      <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${password}</p>
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Access Client Portal</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">Please change your password after signing in for security.</p>
    <p style="font-size:13px;color:#94a3b8;margin-top:24px;">— R A Creations & Home Designs Team</p>
  </div>
</div>`;

  return sendMail({
    from: WELCOME_FROM,
    to: user.email,
    subject,
    html,
    text,
  });
}

module.exports = { sendClientWelcomeEmail, WELCOME_FROM };
