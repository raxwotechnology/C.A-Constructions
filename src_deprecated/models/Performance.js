const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  tasksCompleted: { type: Number, default: 0 },
  commits: { type: Number, default: 0 },
  codeQuality: { type: Number, default: 0 },
  collaboration: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  notes: String,
}, { timestamps: true });

performanceSchema.index({ developer: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Performance', performanceSchema);
