const mongoose = require('mongoose');

const breakdownSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Tea Expense', 'Refreshments', 'Stationery', 'Travel', 'Meals', 'Utilities', 'Maintenance', 'Site Misc', 'Fund Top Up', 'Other'],
    default: 'Other',
  },
  description: { type: String, default: '' },
  amount: { type: Number, required: true, min: 0 },
});

const pettyCashSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['in', 'out'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['office_supplies', 'travel', 'meals', 'utilities', 'maintenance', 'other', 'fund_top_up', 'tea_expense', 'refreshments', 'stationery', 'site_misc'],
    default: 'other',
  },
  paidTo: { type: String, default: '' },          // person or vendor (for OUT)
  paymentType: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'cheque'],
    default: 'cash',
  },
  isCashCheque: { type: Boolean, default: false },
  chequeNumber: { type: String, default: '' },
  chequeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cheque' },
  bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  expenseBreakdown: [breakdownSchema],
  referenceNumber: { type: String, default: '' },
  receiptUrl: { type: String, default: '' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  runningBalance: { type: Number, default: 0 },   // updated on each transaction
}, { timestamps: true });

module.exports = mongoose.model('PettyCash', pettyCashSchema);
