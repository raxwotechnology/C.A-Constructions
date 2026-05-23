const EmailLog = require('../models/EmailLog');

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
    const logs = await EmailLog.find(query).sort({ sentAt: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
};

const { sendLoggedMail } = require('../services/emailService');

exports.resendEmail = async (req, res, next) => {
  try {
    const log = await EmailLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Email log not found' });
    }
    
    // Attempt resend
    await sendLoggedMail({
      to: log.recipientEmail,
      subject: log.subject,
      text: log.body,
      html: log.body,
      category: log.module
    }, req.user?._id);

    res.json({ success: true, message: 'Resend triggered successfully' });
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
        html: message.replace(/\n/g, '<br/>'),
        category: 'custom'
      }, req.user?._id)
    );

    await Promise.all(promises);

    res.json({ success: true, message: `Custom emails sent to ${emails.length} recipients` });
  } catch (err) {
    next(err);
  }
};
