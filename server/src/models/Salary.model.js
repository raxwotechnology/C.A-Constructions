const mongoose = require('mongoose');

const salaryComponentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['allowance', 'deduction'], required: true },
  amount: { type: Number, required: true },
  isPercentage: { type: Boolean, default: false },
  description: { type: String }
});

const salarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  basicSalary: { type: Number, required: true },
  components: [salaryComponentSchema],
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  overtimePay: { type: Number, default: 0 },
  grossSalary: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  workingDays: { type: Number, default: 22 },
  presentDays: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processed', 'paid'], default: 'pending' },
  paidAt: { type: Date },
  paymentMethod: { type: String, enum: ['bank', 'cash', 'cheque'], default: 'bank' },
  remarks: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const overtimeSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  hours: { type: Number, required: true },
  reason: { type: String },
  hourlyRate: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  remarks: { type: String }
}, { timestamps: true });

module.exports = {
  Salary: mongoose.model('Salary', salarySchema),
  Payroll: mongoose.model('Payroll', payrollSchema),
  Overtime: mongoose.model('Overtime', overtimeSchema)
};
