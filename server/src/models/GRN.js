const mongoose = require('mongoose');

const grnSchema = new mongoose.Schema({
  grnNo: { type: String, required: true, unique: true },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  supplierName: String,
  poNumber: String,
  itemName: { type: String, required: true },
  orderedQty: { type: Number, required: true },
  receivedQty: { type: Number, required: true },
  unit: String,
  unitPrice: { type: Number, default: 0 },
  varianceQty: { type: Number, default: 0 }, // orderedQty - receivedQty
  hasVariance: { type: Boolean, default: false },
  paymentHoldFlag: { type: Boolean, default: false },
  varianceReason: String,
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedDate: { type: Date, default: Date.now },
  supervisorSignatureUrl: String,
  status: { type: String, enum: ['verified', 'flagged_variance', 'resolved'], default: 'verified' },
}, { timestamps: true });

module.exports = mongoose.model('GRN', grnSchema);
