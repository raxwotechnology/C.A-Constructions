const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, enum: ['service', 'product', 'consultation', 'subscription', 'other'], default: 'service' },
  date: { type: Date, required: true },
  description: { type: String },
  invoiceNumber: { type: String, unique: true, sparse: true },
  client: { type: String },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'online', 'cheque'], default: 'bank' },
  status: { type: String, enum: ['received', 'pending', 'overdue'], default: 'received' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: {
    type: String,
    enum: ['salary', 'rent', 'utilities', 'equipment', 'marketing', 'travel', 'software', 'other'],
    default: 'other'
  },
  date: { type: Date, required: true },
  description: { type: String },
  vendor: { type: String },
  receiptFile: { type: String },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'approved' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = {
  Revenue: mongoose.model('Revenue', revenueSchema),
  Expense: mongoose.model('Expense', expenseSchema)
};
