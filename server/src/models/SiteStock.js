const mongoose = require('mongoose');
const { EXPENSE_CATEGORIES } = require('../constants/masterCategories');

const siteStockSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, unique: true, uppercase: true },
    itemName: { type: String, required: true },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES.material,
      required: true
    },
    unit: { type: String, required: true }, // e.g. "Bags", "Tons", "Cubes", "Nos"
    centralStockQty: { type: Number, default: 0 },
    siteStockQty: [
      {
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        qty: { type: Number, default: 0 }
      }
    ],
    minThresholdQty: { type: Number, default: 10 },
    unitPrice: { type: Number, default: 0 },
    supplier: { type: String },
    lastRestockedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteStock', siteStockSchema);
