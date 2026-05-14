const mongoose = require('mongoose');

const chequeSchema = new mongoose.Schema({
  direction: { type: String, enum: ['received', 'issued'], required: true },
  source: { type: String, enum: ['subscription', 'invoice', 'income', 'expense', 'payroll', 'manual'], default: 'manual' },
  status: { type: String, enum: ['pending', 'cleared', 'returned', 'renewed'], default: 'pending' },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'LKR' },
  chequeNumber: { type: String, required: true, trim: true },
  chequeDate: { type: Date },
  bankName: { type: String, default: '' },
  drawerOrPayee: { type: String, default: '' },
  renewalDate: { type: Date },
  notes: { type: String, default: '' },
  bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  linkedSubscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  linkedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

chequeSchema.index({ status: 1, chequeDate: -1 });
chequeSchema.index({ chequeNumber: 1 });

module.exports = mongoose.model('Cheque', chequeSchema);
