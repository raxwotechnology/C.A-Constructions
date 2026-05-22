const nodemailer = require('nodemailer');

function smtpConfigured() {
  require('dotenv').config();
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!smtpConfigured()) {
    console.warn('[Mailer] SMTP not configured — SMTP_HOST, SMTP_USER, SMTP_PASS must be set in .env');
    return null;
  }
  // Always strip any whitespace from app passwords (Gmail format: "xxxx xxxx xxxx xxxx")
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass,
    },
  });
}

async function sendMail({ to, subject, html, text, from: fromOverride }) {
  const transport = getTransport();
  if (!transport) {
    return { sent: false, reason: 'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS in .env)' };
  }
  const from = fromOverride || process.env.SMTP_FROM || process.env.SMTP_USER;
  console.log(`[Mailer] Attempting to send to: ${to}, subject: ${subject}, from: ${from}`);
  await transport.sendMail({ from, to, subject, html, text });
  return { sent: true };
}

module.exports = { sendMail, smtpConfigured };
