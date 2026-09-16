const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    contactPerson: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    address: { type: String, default: '' },
    category: {
      type: String,
      enum: ['Hardware', 'Materials', 'Electrical', 'Plumbing', 'Machinery', 'Raw Material', 'Other'],
      default: 'Hardware',
    },
    brNumber: { type: String, default: '' },
    vatNumber: { type: String, default: '' },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      branchName: { type: String, default: '' },
    },
    outstandingBalance: { type: Number, default: 0 },
    totalBilled: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
