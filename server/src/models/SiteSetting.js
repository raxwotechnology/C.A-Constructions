const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'Raxwo Pvt Ltd' },
  siteDescription: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  footerText: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  contactAddress: { type: String, default: 'Weliweriya, Sri Lanka' },
  websiteUrl: { type: String, default: '' },
  mapLat: { type: Number, default: 7.0289 },
  mapLng: { type: Number, default: 80.0153 },
  mapZoom: { type: Number, default: 13 },

  /** Statutory contribution rates (% of basic salary). Used by payroll & EPF records. */
  epfEmployeeRate: { type: Number, default: 8, min: 0, max: 50 },
  epfEmployerRate: { type: Number, default: 12, min: 0, max: 50 },
  etfEmployerRate: { type: Number, default: 3, min: 0, max: 50 },
}, { timestamps: true });

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
