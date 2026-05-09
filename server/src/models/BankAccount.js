const mongoose = require('mongoose');

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
}, { timestamps: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
