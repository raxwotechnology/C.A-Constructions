const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: 'System' },
  userRole: { type: String, default: 'system' },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'view', 'login', 'logout', 'approve', 'reject', 'export', 'pay'],
    required: true
  },
  module: {
    type: String,
    enum: ['employees', 'payroll', 'leaves', 'attendance', 'projects', 'invoices',
           'clients', 'subscriptions', 'recruitment', 'letters', 'financial',
           'services', 'portfolio', 'rewards', 'settings', 'auth', 'quotations',
           'branches', 'performance', 'analytics', 'exports', 'loans'],
    required: true
  },
  entityId: { type: String, default: '' },
  entityName: { type: String, default: '' },
  description: { type: String, required: true },
  changes: {
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
  },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
}, { timestamps: true });

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
