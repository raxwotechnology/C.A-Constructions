const mongoose = require('mongoose');

const salaryPaymentSchema = new mongoose.Schema({
  payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  payhere_order_id: { type: String, required: true },
  payhere_payment_id: String,
  payhere_status_code: String,
  md5sig: String,
  paidAt: Date,
}, { timestamps: true });

salaryPaymentSchema.index({ payhere_order_id: 1 }, { unique: true });

module.exports = mongoose.model('SalaryPayment', salaryPaymentSchema);

