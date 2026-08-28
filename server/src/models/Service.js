const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'LKR' },
  billingCycle: { type: String, enum: ['one-time', 'monthly', 'quarterly', 'yearly', 'lifetime', 'startup', 'custom'], default: 'one-time' },
  features: [{ type: String }],
  duration: { type: String, default: '' },
  discount: { type: Number, default: 0 },
  promotionLabel: { type: String, default: '' },
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  type: { type: String, enum: ['service', 'product'], default: 'service' },
  category: { type: String, default: '' },
  features: [{ type: String }],
  priceText: { type: String, default: '' },
  priceType: { type: String, enum: ['one-time', 'monthly', 'yearly', 'lifetime', 'startup', 'custom'], default: 'one-time' },
  imageUrl: { type: String, default: '' },
  icon: { type: String, default: 'FiCode' },
  colorFrom: { type: String, default: '#3b82f6' },
  colorTo: { type: String, default: '#1d4ed8' },
  active: { type: Boolean, default: true },
  archived: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  packages: [packageSchema],
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
