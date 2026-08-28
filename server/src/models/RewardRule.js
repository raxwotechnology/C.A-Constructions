const mongoose = require('mongoose');

const rewardRuleSchema = new mongoose.Schema({
  action: { type: String, required: true, unique: true },
  points: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  campaignName: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('RewardRule', rewardRuleSchema);
