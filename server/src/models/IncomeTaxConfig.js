const mongoose = require('mongoose');

const taxSlabSchema = new mongoose.Schema({
  minIncome: { type: Number, default: 0 },
  maxIncome: { type: Number, default: null },
  rate: { type: Number, required: true, min: 0, max: 100 },
  label: { type: String, default: '' },
}, { _id: false });

const incomeTaxConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  year: { type: Number, required: true },
  slabs: [taxSlabSchema],
  standardRelief: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

incomeTaxConfigSchema.index({ year: 1, isActive: 1 });

module.exports = mongoose.model('IncomeTaxConfig', incomeTaxConfigSchema);
