const mongoose = require('mongoose');

const supplierPriceIndexSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  supplierName: { type: String, required: true },
  itemName: { type: String, required: true },
  unit: { type: String, default: 'unit' },
  historicalPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  priceIncreasePercentage: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false }, // true if price increase > 5%
  effectiveDate: { type: Date, default: Date.now },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('SupplierPriceIndex', supplierPriceIndexSchema);
