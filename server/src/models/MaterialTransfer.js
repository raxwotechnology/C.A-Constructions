const mongoose = require('mongoose');

const materialTransferSchema = new mongoose.Schema({
  transferNo: { type: String, required: true, unique: true },
  fromSite: { type: String, default: 'Central Warehouse' },
  toSite: { type: String, required: true },
  itemName: { type: String, required: true },
  category: String,
  quantity: { type: Number, required: true },
  unit: String,
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispatchedAt: { type: Date, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'received', 'discrepancy_flagged'],
    default: 'pending'
  },
  discrepancyNote: String,
  discrepancyQty: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MaterialTransfer', materialTransferSchema);
