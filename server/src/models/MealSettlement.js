const mongoose = require('mongoose');

const mealSettlementSchema = new mongoose.Schema(
  {
    settlementNo: { type: String, required: true, unique: true, uppercase: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'CateringVendor', required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    totalMealCount: { type: Number, default: 0 },
    totalBillAmount: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    remainingOutstanding: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'other'],
      default: 'cash',
    },
    chequeNumber: { type: String, default: '' },
    paymentDate: { type: Date, default: Date.now },
    smsSent: { type: Boolean, default: false },
    smsResponse: { type: String, default: '' },
    notes: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MealSettlement', mealSettlementSchema);
