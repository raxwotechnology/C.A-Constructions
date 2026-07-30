const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  category: { type: String, default: 'General' },
  orderedQty: { type: Number, required: true, default: 0 },
  receivedQty: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'units' },
  unitPrice: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 },
  varianceQty: { type: Number, default: 0 },
  hasVariance: { type: Boolean, default: false },
});

const grnSchema = new mongoose.Schema({
  grnNo: { type: String, required: true, unique: true },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  siteName: { type: String, default: 'Central Warehouse' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  supplierName: { type: String, required: true },
  poNumber: { type: String, default: '' },
  items: [grnItemSchema],
  totalAmount: { type: Number, default: 0 },
  hasVariance: { type: Boolean, default: false },
  paymentHoldFlag: { type: Boolean, default: false },
  varianceReason: { type: String, default: '' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedDate: { type: Date, default: Date.now },
  supervisorSignatureUrl: { type: String, default: '' },
  status: { type: String, enum: ['verified', 'flagged_variance', 'resolved'], default: 'verified' },

  // Backward compatibility fields for legacy single-item calls
  itemName: { type: String },
  orderedQty: { type: Number },
  receivedQty: { type: Number },
  unit: { type: String },
  unitPrice: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('GRN', grnSchema);
