const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  originalAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  voucherCode: { type: String, default: '' },
  currency: { type: String, default: 'LKR' },
  method: { type: String, default: 'payhere' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  // PayHere specific
  payhere_order_id: String,
  payhere_payment_id: String,
  payhere_status_code: String,
  payhere_message: String,
  md5sig: String,
  paidAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
