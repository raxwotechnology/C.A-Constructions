const mongoose = require('mongoose');
const { EXPENSE_CATEGORIES } = require('../constants/masterCategories');

const siteStockSchema = new mongoose.Schema(
  {
    itemCode: { type: String, unique: true, sparse: true, uppercase: true },
    itemName: { type: String, required: true },
    category: {
      type: String,
      required: true
    },
    unit: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    centralStockQty: { type: Number, default: 0 },
    siteStockQty: [
      {
        project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        qty: { type: Number, default: 0 }
      }
    ],
    isCentralWarehouse: { type: Boolean, default: true },
    site: { type: String, default: '' },
    minThresholdQty: { type: Number, default: 10 },
    reorderLevel: { type: Number, default: 10 },
    unitPrice: { type: Number, default: 0 },
    supplier: { type: String },
    lastRestockedAt: { type: Date },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Auto-generate itemCode before saving if not provided
siteStockSchema.pre('save', function (next) {
  if (!this.itemCode) {
    this.itemCode = 'STK-' + Date.now().toString().slice(-6);
  }
  next();
});

module.exports = mongoose.model('SiteStock', siteStockSchema);
