const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, default: 0 },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  reference: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true });

const bankAccountSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true, unique: true },
  accountHolder: { type: String, required: true },
  accountType: {
    type: String,
    enum: ['savings', 'current', 'fixed'],
    default: 'current',
  },
  branchName: { type: String, default: '' },
  currentBalance: { type: Number, default: 0 },
  currency: { type: String, default: 'LKR' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: '' },
  transactions: [transactionSchema],
}, { timestamps: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
