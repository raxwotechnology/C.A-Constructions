const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'Raxwo Pvt Ltd' },
  siteDescription: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  footerText: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  contactAddress: { type: String, default: 'Weliweriya, Sri Lanka' },
  branchDetails: { type: String, default: '' },
  websiteUrl: { type: String, default: '' },
  whatsappNumber: { type: String, default: '' },
  /** System admin email — notifications, letterheads, agreements */
  adminEmail: { type: String, default: '' },
  sealUrl: { type: String, default: '' },
  letterheadUrl: { type: String, default: '' },
  signatures: {
    hr: { url: { type: String, default: '' }, label: { type: String, default: 'HR' } },
    admin: { url: { type: String, default: '' }, label: { type: String, default: 'Admin' } },
    manager: { url: { type: String, default: '' }, label: { type: String, default: 'Manager' } },
  },
  mapLat: { type: Number, default: 7.0289 },
  mapLng: { type: Number, default: 80.0153 },
  mapZoom: { type: Number, default: 13 },

  /** Statutory contribution rates (% of basic salary). Used by payroll & EPF records. */
  epfEmployeeRate: { type: Number, default: 8, min: 0, max: 50 },
  epfEmployerRate: { type: Number, default: 12, min: 0, max: 50 },
  etfEmployerRate: { type: Number, default: 3, min: 0, max: 50 },

  smsEnabled: { type: Boolean, default: true },
  smsModules: {
    payroll: { type: Boolean, default: true },
    leave: { type: Boolean, default: true },
    project: { type: Boolean, default: true },
    hr: { type: Boolean, default: true },
    financial: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
  },
  messageAutoDeleteDays: { type: Number, default: 0 }, // 0 = disabled
}, { timestamps: true });

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
