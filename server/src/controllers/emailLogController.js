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
