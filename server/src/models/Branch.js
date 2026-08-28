const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isHeadOffice: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  openedAt: { type: Date },
  description: { type: String, default: '' },
  /** Letterhead customization overrides for branch documents */
  letterheadName: { type: String, default: '' },
  letterheadTagline: { type: String, default: '' },
  letterheadAddress: { type: String, default: '' },
  letterheadPhone: { type: String, default: '' },
  letterheadEmail: { type: String, default: '' },
  letterheadWebsite: { type: String, default: '' },
  letterheadLogoUrl: { type: String, default: '' },
  letterheadFooter: { type: String, default: '' },
  letterheadUrl: { type: String, default: '' },
  sealUrl: { type: String, default: '' },
  signatures: {
    director: { url: { type: String, default: '' }, label: { type: String, default: 'Managing Director' } },
    manager: { url: { type: String, default: '' }, label: { type: String, default: 'Branch Manager' } },
    admin: { url: { type: String, default: '' }, label: { type: String, default: 'Admin' } },
    hr: { url: { type: String, default: '' }, label: { type: String, default: 'HR Manager' } },
  },
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
