const mongoose = require('mongoose');

const payrollRecalcLogSchema = new mongoose.Schema({
  payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  triggerSource: { type: String, required: true },
  triggerModule: { type: String, default: '' },
  triggerEntityId: { type: String, default: '' },
  reason: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: 'System' },
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed },
  netDelta: { type: Number, default: 0 },
  skipped: { type: Boolean, default: false },
  skipReason: { type: String, default: '' },
}, { timestamps: true });

payrollRecalcLogSchema.index({ employee: 1, month: 1, year: 1, createdAt: -1 });
payrollRecalcLogSchema.index({ payroll: 1, createdAt: -1 });

module.exports = mongoose.model('PayrollRecalcLog', payrollRecalcLogSchema);
