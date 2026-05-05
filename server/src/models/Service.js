const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  features: [{ type: String }],
  priceText: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  icon: { type: String, default: 'FiCode' },
  colorFrom: { type: String, default: '#3b82f6' },
  colorTo: { type: String, default: '#1d4ed8' },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);

