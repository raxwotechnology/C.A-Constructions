const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, default: '' },
  type: { type: String, enum: ['percentage', 'fixed', 'free_consultation', 'hosting_discount', 'premium_support'], required: true },
  value: { type: Number, default: 0 },
  pointsCost: { type: Number, default: 0 },
  minimumSpend: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isTemplate: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  campaignName: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);
