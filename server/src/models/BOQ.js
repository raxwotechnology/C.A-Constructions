const mongoose = require('mongoose');
const { PROJECT_SERVICE_TYPES } = require('../constants/masterCategories');

const boqItemSchema = new mongoose.Schema({
  billNo: { type: String, required: true }, // e.g. "Bill 01 - Earthwork"
  itemCode: { type: String, required: true }, // e.g. "1.1"
  description: { type: String, required: true },
  slsStandard: { type: String, default: 'SLS 573' },
  unit: { type: String, required: true }, // e.g. "m3", "m2", "kg", "Item"
  estimatedQty: { type: Number, required: true, default: 0 },
  unitRate: { type: Number, required: true, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  actualQty: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Approved'], default: 'Pending' }
});

const boqSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    serviceType: {
      type: String,
      enum: PROJECT_SERVICE_TYPES.map(t => t.labelEn),
      required: true
    },
    items: [boqItemSchema],
    grandTotalEstimated: { type: Number, default: 0 },
    grandTotalActual: { type: Number, default: 0 },
    contingencyPercentage: { type: Number, default: 5 },
    vatPercentage: { type: Number, default: 18 },
    finalContractValue: { type: Number, default: 0 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BOQ', boqSchema);
