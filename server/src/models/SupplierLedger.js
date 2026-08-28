const mongoose = require('mongoose');

const supplierLedgerSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    transactionType: {
      type: String,
      enum: ['bill_po', 'payment', 'adjustment'],
      required: true,
    },
    referencePO: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    referenceNumber: { type: String, default: '' },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'other', 'n/a'],
      default: 'n/a',
    },
    chequeNumber: { type: String, default: '' },
    chequeDate: { type: Date },
    bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    runningBalance: { type: Number, default: 0 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupplierLedger', supplierLedgerSchema);
