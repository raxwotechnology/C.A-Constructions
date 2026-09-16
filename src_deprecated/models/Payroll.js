const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  allowances: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  commissions: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  loanDeduction: { type: Number, default: 0 },
  // EPF/ETF - Sri Lanka statutory
  epfEmployee: { type: Number, default: 0 },   // 8% of basic
  epfEmployer: { type: Number, default: 0 },   // 12% of basic
  etfEmployer: { type: Number, default: 0 },   // 3% of basic
  grossSalary: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid'],
    default: 'draft'
  },
  paidAt: Date,
  payslipUrl: String,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
