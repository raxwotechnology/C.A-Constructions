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
}, { timestamps: true });

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
