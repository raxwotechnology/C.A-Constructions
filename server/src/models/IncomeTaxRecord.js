const mongoose = require('mongoose');

const incomeTaxRecordSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  config: { type: mongoose.Schema.Types.ObjectId, ref: 'IncomeTaxConfig' },
  taxableIncome: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  exemptionsApplied: { type: Number, default: 0 },
  payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
  status: { type: String, enum: ['calculated', 'deducted', 'remitted', 'cancelled'], default: 'calculated' },
  paymentMethod: { type: String, enum: ['payroll', 'bank_transfer', 'card', 'cash', ''], default: 'payroll' },
  bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  remittedAt: Date,
  remittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
}, { timestamps: true });

incomeTaxRecordSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
incomeTaxRecordSchema.index({ year: 1, month: 1 });

module.exports = mongoose.model('IncomeTaxRecord', incomeTaxRecordSchema);
