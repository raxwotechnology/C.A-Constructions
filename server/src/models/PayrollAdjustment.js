const mongoose = require('mongoose');

/** Adjustment entry when paid payroll cannot be auto-modified */
const payrollAdjustmentSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  type: { type: String, enum: ['addition', 'deduction'], required: true },
  amount: { type: Number, required: true },
  label: { type: String, default: '' },
  reason: { type: String, default: '' },
  sourceModule: { type: String, default: '' },
  sourceEntityId: { type: String, default: '' },
  previousNetSalary: { type: Number, default: 0 },
  suggestedNetSalary: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'applied', 'void'], default: 'pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

payrollAdjustmentSchema.index({ payroll: 1 });
payrollAdjustmentSchema.index({ employee: 1, month: 1, year: 1 });

module.exports = mongoose.model('PayrollAdjustment', payrollAdjustmentSchema);
