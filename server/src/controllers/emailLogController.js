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
