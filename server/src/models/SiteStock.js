const mongoose = require('mongoose');

const siteStockSchema = new mongoose.Schema({
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null }, // null = Central Warehouse
  isCentralWarehouse: { type: Boolean, default: false },
  itemName: { type: String, required: true },
  category: {
    type: String,
    enum: ['Cement', 'Sand', 'Aggregates', 'Steel', 'Bricks/Blocks', 'Timber', 'Tiles', 'MEP Fittings', 'Machinery/Tools', 'Other'],
    default: 'Cement'
  },
  quantity: { type: Number, default: 0 },
  unit: { type: String, enum: ['bags', 'cubes', 'kg', 'tons', 'nos', 'meters', 'units'], default: 'bags' },
  unitPrice: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  lastRestocked: Date,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('SiteStock', siteStockSchema);
