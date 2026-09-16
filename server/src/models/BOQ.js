const mongoose = require('mongoose');
const { PROJECT_SERVICE_TYPES } = require('../constants/masterCategories');

const boqItemSchema = new mongoose.Schema({
  code: { type: String }, // e.g. "DIV-03-01"
  division: { type: String, default: 'Earthworks & Excavation' },
  item: { type: String },
  unit: { type: String, default: 'sqft' },
  qty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  
  // Backward compatibility fields
  billNo: { type: String },
  itemCode: { type: String },
  description: { type: String },
  slsStandard: { type: String, default: 'SLS 573' },
  estimatedQty: { type: Number, default: 0 },
  unitRate: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  actualQty: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Approved'], default: 'Pending' }
}, { timestamps: true });

// Auto-sync aliases before saving
boqItemSchema.pre('validate', function(next) {
  if (this.code && !this.itemCode) this.itemCode = this.code;
  if (this.itemCode && !this.code) this.code = this.itemCode;
  
  if (this.item && !this.description) this.description = this.item;
  if (this.description && !this.item) this.item = this.description;

  if (this.division && !this.billNo) this.billNo = this.division;
  if (this.billNo && !this.division) this.division = this.billNo;

  if (this.qty !== undefined && (!this.estimatedQty || this.estimatedQty === 0)) this.estimatedQty = this.qty;
  if (this.estimatedQty !== undefined && (!this.qty || this.qty === 0)) this.qty = this.estimatedQty;

  if (this.rate !== undefined && (!this.unitRate || this.unitRate === 0)) this.unitRate = this.rate;
  if (this.unitRate !== undefined && (!this.rate || this.rate === 0)) this.rate = this.unitRate;

  if (this.qty && this.rate) {
    this.amount = this.qty * this.rate;
    this.totalAmount = this.amount;
  }
  next();
});

const boqSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: false },
    title: { type: String, default: 'SLS 573 Standard Bill of Quantities' },
    serviceType: {
      type: String,
      default: 'Residential Construction'
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
