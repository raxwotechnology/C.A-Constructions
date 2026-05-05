const mongoose = require('mongoose');

const overtimeSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  amount: { type: Number, required: true, min: 0 },
  hours: { type: Number, default: 0, min: 0 },
  note: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

overtimeSchema.index({ employee: 1, month: 1, year: 1 });

module.exports = mongoose.model('Overtime', overtimeSchema);

