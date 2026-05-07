const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referralCode: { type: String, required: true },
  rewardPoints: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'completed'], default: 'completed' },
}, { timestamps: true });

referralSchema.index({ referrerId: 1, referredUserId: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);
