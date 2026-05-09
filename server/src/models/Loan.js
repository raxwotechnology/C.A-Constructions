const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  totalAmount: { type: Number, required: true },
  monthlyInstallment: { type: Number, required: true },
  startDate: { type: Date, required: true },
  reason: { type: String, default: '' },

  totalPaid: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  installmentsPaid: { type: Number, default: 0 },
  totalInstallments: { type: Number, default: 0 }, // auto-calculated

  status: {
    type: String,
    enum: ['active', 'cleared'],
    default: 'active',
  },
  payments: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
    note: String,
  }],
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

loanSchema.pre('save', function (next) {
  if (this.isNew) {
    this.outstandingBalance = this.totalAmount;
    this.totalInstallments = this.monthlyInstallment > 0
      ? Math.ceil(this.totalAmount / this.monthlyInstallment)
      : 0;
  }
  next();
});

module.exports = mongoose.model('Loan', loanSchema);
