const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: String, required: true }, // e.g. "2026-07"
    basicSalary: { type: Number, required: true, default: 0 },
    regularOtHours: { type: Number, default: 0 },
    regularOtPay: { type: Number, default: 0 },
    doubleOtHours: { type: Number, default: 0 },
    doubleOtPay: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true, default: 0 },
    
    // Statutory EPF / ETF Calculations (Sri Lanka Standards)
    // EPF Total Eligible = Basic + Allowances subject to EPF
    epfEligibleAmount: { type: Number, default: 0 },
    epfEmployee8Percent: { type: Number, required: true, default: 0 }, // 8% deducted from employee
    epfEmployer12Percent: { type: Number, required: true, default: 0 }, // 12% contributed by company
    etfEmployer3Percent: { type: Number, required: true, default: 0 }, // 3% contributed by company
    
    // APIT (Advance Personal Income Tax) Sri Lanka Tax Deduction
    apitTaxDeduction: { type: Number, default: 0 },
    
    otherDeductions: { type: Number, default: 0 },
    netPay: { type: Number, required: true, default: 0 },
    
    paymentStatus: { type: String, enum: ['Pending', 'Approved', 'Paid'], default: 'Pending' },
    paidDate: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payroll', payrollSchema);
