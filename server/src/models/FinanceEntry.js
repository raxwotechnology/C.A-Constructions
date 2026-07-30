const mongoose = require('mongoose');
const {
  INCOME_CATEGORIES,
  ALL_EXPENSE_FLAT,
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  CAPITAL_CATEGORIES,
  TAX_CATEGORIES
} = require('../constants/masterCategories');

const financeEntrySchema = new mongoose.Schema(
  {
    transactionNo: { type: String, required: true, unique: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    transactionType: {
      type: String,
      enum: ['Income', 'Expense', 'Asset', 'Liability', 'Capital', 'Tax'],
      required: true
    },
    masterCategory: {
      type: String,
      required: true
    },
    subCategory: { type: String },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now, required: true },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Cheque', 'Bank Transfer', 'Credit'],
      default: 'Bank Transfer'
    },
    chequeDetails: {
      chequeNumber: { type: String },
      bankName: { type: String },
      realizationDate: { type: Date },
      status: { type: String, enum: ['Pending', 'Realized', 'Bounced'], default: 'Pending' }
    },
    vatAmount: { type: Number, default: 0 },
    apitTaxAmount: { type: Number, default: 0 },
    payeeOrPayer: { type: String, required: true },
    description: { type: String },
    referenceDoc: { type: String }, // e.g. receipt or invoice URL
    status: { type: String, enum: ['Draft', 'Approved', 'Paid', 'Reconciled'], default: 'Approved' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinanceEntry', financeEntrySchema);
