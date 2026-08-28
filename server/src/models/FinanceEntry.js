const mongoose = require('mongoose');

const financeEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['income', 'expense', 'income_tax', 'vat', 'other'], default: 'expense' },
    category: { type: String, default: 'General' },
    title: { type: String, default: '' },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now, required: true },
    note: { type: String, default: '' },
    paymentMethod: { type: String, default: 'Bank Transfer' },
    billFile: { type: String },
    billFileName: { type: String },
    bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Extended/Legacy fields
    transactionNo: { type: String, default: () => `TXN-${Date.now()}` },
    transactionType: { type: String, default: 'Expense' },
    masterCategory: { type: String, default: 'General' },
    subCategory: { type: String },
    payeeOrPayer: { type: String, default: 'General' },
    chequeDetails: {
      chequeNumber: { type: String },
      bankName: { type: String },
      realizationDate: { type: Date },
      status: { type: String, enum: ['Pending', 'Realized', 'Bounced'], default: 'Pending' }
    },
    vatAmount: { type: Number, default: 0 },
    apitTaxAmount: { type: Number, default: 0 },
    description: { type: String },
    referenceDoc: { type: String },
    status: { type: String, default: 'Approved' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinanceEntry', financeEntrySchema);

