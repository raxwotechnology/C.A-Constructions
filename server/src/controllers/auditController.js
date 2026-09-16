const AuditLog = require('../models/AuditLog');

// @desc    Get audit logs
// @route   GET /api/audit
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { module, action, user, severity, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;
    if (user) query.user = user;
    if (severity) query.severity = severity;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.json({ success: true, logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// @desc    Get audit stats (module breakdown)
// @route   GET /api/audit/stats
exports.getAuditStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [byModule, byAction, bySeverity, recentUsers] = await Promise.all([
      AuditLog.aggregate([{ $match: match }, { $group: { _id: '$module', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AuditLog.aggregate([{ $match: match }, { $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AuditLog.aggregate([{ $match: match }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
      AuditLog.aggregate([
        { $match: { ...match, user: { $exists: true, $ne: null } } },
        { $group: { _id: '$user', count: { $sum: 1 }, userName: { $first: '$userName' } } },
        { $sort: { count: -1 } }, { $limit: 10 }
      ]),
    ]);

    res.json({ success: true, byModule, byAction, bySeverity, recentUsers });
  } catch (err) { next(err); }
};

// @desc    Create audit log (internal utility)
exports.createAuditLog = async ({ user, action, module, entityId, entityName, description, changes, ipAddress, userAgent, severity = 'info' }) => {
  try {
    await AuditLog.create({
      user: user?._id || user,
      userName: user?.name || 'System',
      userRole: user?.role || 'system',
      action, module, entityId: entityId || '', entityName: entityName || '',
      description, changes, ipAddress: ipAddress || '', userAgent: userAgent || '', severity,
    });
  } catch (_) {}
};
