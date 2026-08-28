const mongoose = require('mongoose');

const cateringVendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: '' },
    address: { type: String, default: '' },
    defaultMealRate: { type: Number, default: 250 },
    outstandingBalance: { type: Number, default: 0 },
    totalBilled: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      branchName: { type: String, default: '' },
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CateringVendor', cateringVendorSchema);
