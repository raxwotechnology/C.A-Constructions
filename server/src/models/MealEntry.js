const mongoose = require('mongoose');

const mealEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    shift: { type: String, enum: ['Morning', 'Day', 'Night', 'Both'], default: 'Day' },
    mealCount: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'CateringVendor', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    siteName: { type: String, default: '' },
    settlementStatus: {
      type: String,
      enum: ['unsettled', 'partially_settled', 'settled'],
      default: 'unsettled',
    },
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: 'MealSettlement' },
    notes: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MealEntry', mealEntrySchema);
