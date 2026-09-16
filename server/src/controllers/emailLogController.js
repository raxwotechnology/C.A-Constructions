const EmailLog = require('../models/EmailLog');
const { sendLoggedMail } = require('../services/emailService');
const { verifyConnection, smtpConfigured } = require('../utils/mailer');

exports.getEmailLogs = async (req, res, next) => {
  try {
    const { status, module, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (module) query.module = module;
    if (search) {
      query.$or = [
        { recipientEmail: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') }
      ];
    }
    const logs = await EmailLog.find(query).sort({ sentAt: -1 }).limit(200);
    const totalSent = await EmailLog.countDocuments({ status: 'sent' });
    const totalFailed = await EmailLog.countDocuments({ status: 'failed' });
    res.json({ success: true, logs, totalSent, totalFailed, smtpReady: smtpConfigured() });
  } catch (err) {
    next(err);
  }
};

exports.resendEmail = async (req, res, next) => {
  try {
    const log = await EmailLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Email log not found' });
    }
    try {
      await sendLoggedMail({
        to: log.recipientEmail,
        subject: log.subject,
        html: `<p>This is a resent copy of a previous system email.</p><hr/><p><strong>Original subject:</strong> ${log.subject}</p>`,
        text: `Resent: ${log.subject}`,
      }, log.module || 'system');
      // Update the original log to reflect successful resend
      await EmailLog.findByIdAndUpdate(req.params.id, {
        status: 'sent',
        error: undefined,
        sentAt: new Date(),
      });
      res.json({ success: true, message: 'Email resent successfully' });
    } catch (sendErr) {
      // Update original log with new error
      await EmailLog.findByIdAndUpdate(req.params.id, {
        status: 'failed',
        error: sendErr.message || 'Resend failed',
      });
      return res.status(500).json({ success: false, message: sendErr.message || 'Resend failed' });
    }
  } catch (err) {
    next(err);
  }
};

exports.sendCustomEmail = async (req, res, next) => {
  try {
    const { emails, subject, message } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients provided' });
    }
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }
    const promises = emails.map(email =>
      sendLoggedMail({
        to: email,
        subject,
        text: message,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#334155;">${message.replace(/\n/g, '<br/>')}</div>`,
      }, 'custom')
    );
    await Promise.all(promises);
    res.json({ success: true, message: `Custom emails sent to ${emails.length} recipients` });
  } catch (err) {
    next(err);
  }
};

exports.testSmtp = async (req, res, next) => {
  try {
    if (!smtpConfigured()) {
      return res.json({ success: false, message: 'SMTP not configured in server .env (SMTP_HOST, SMTP_USER, SMTP_PASS required)' });
    }
    const verify = await verifyConnection();
    if (!verify.ok) {
      return res.json({ success: false, message: `SMTP connection failed: ${verify.reason}` });
    }
    const testTo = req.body?.to || process.env.SMTP_USER;
    await sendLoggedMail({
      to: testTo,
      subject: 'Raxwo ERP — SMTP Test',
      html: '<h2>SMTP is working!</h2><p>This is a test email from the Raxwo ERP system.</p>',
      text: 'SMTP is working! This is a test email from the Raxwo ERP system.',
    }, 'system');
    res.json({ success: true, message: `SMTP verified. Test email sent to ${testTo}` });
  } catch (err) {
    next(err);
  }
};
