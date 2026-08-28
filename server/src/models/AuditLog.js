const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "CREATE_PROJECT", "APPROVE_PO", "DELETE_FINANCE_ENTRY"
    module: { type: String, required: true }, // e.g. "Projects", "Finance", "Site", "Payroll"
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
