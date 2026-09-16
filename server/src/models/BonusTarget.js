const mongoose = require('mongoose');

const bonusTargetSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  targetName: { type: String, required: true },
  metricDescription: { type: String },
  targetValue: { type: String },
  measurementPeriod: { type: String },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'achieved', 'missed'], default: 'pending' },
  achievedAt: Date,
  bonusAmount: { type: Number, default: 0 },
  linkedPayroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('BonusTarget', bonusTargetSchema);
