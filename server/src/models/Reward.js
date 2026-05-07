const mongoose = require('mongoose');

const pointsHistorySchema = new mongoose.Schema({
  action: { type: String, required: true },
  points: { type: Number, required: true },
  sourceKey: { type: String, required: true },
  note: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const rewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  referralCode: { type: String, required: true, unique: true },
  totalPoints: { type: Number, default: 0 },
  pointsHistory: [pointsHistorySchema],
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);
