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
  /** Shown under company name on quotations/invoices (e.g. Next Level Tech) */
  letterheadTagline: { type: String, default: 'Next Level Tech' },
  quotationThankYouMessage: { type: String, default: 'We appreciate your business and look forward to the opportunity to work with you. Should you have any questions regarding this quotation, please do not hesitate to contact us.' },
  quotationNotesTemplate: { type: String, default: '' },
  quotationTermsTemplate: { type: String, default: '' },
  quotationDirectorName: { type: String, default: '' },
  quotationDirectorRole: { type: String, enum: ['', 'admin', 'manager', 'hr', 'director'], default: '' },
  quotationLayoutFontSizePt: { type: Number, default: 11 },
  quotationLayoutLineHeight: { type: Number, default: 1.5 },
  quotationLayoutPagePaddingMm: { type: Number, default: 14 },
  quotationLayoutHeaderSpacingPx: { type: Number, default: 24 },
  quotationLayoutFooterSpacingPx: { type: Number, default: 32 },
  quotationLayoutTableCellPaddingPx: { type: Number, default: 10 },
  quotationLayoutContentMaxWidth: { type: String, default: '100%' },
  quotationLayoutShowDocumentFrame: { type: Boolean, default: true },
  quotationLayoutShowRefOnDocument: { type: Boolean, default: true },
  whatsappNumber: { type: String, default: '' },
  /** System admin email — notifications, letterheads, agreements */
  adminEmail: { type: String, default: '' },
  sealUrl: { type: String, default: '' },
  letterheadUrl: { type: String, default: '' },
  signatures: {
    hr: { url: { type: String, default: '' }, label: { type: String, default: 'HR' } },
    admin: { url: { type: String, default: '' }, label: { type: String, default: 'Admin' } },
    manager: { url: { type: String, default: '' }, label: { type: String, default: 'Manager' } },
    director: { url: { type: String, default: '' }, label: { type: String, default: 'Director' } },
    marketing: { url: { type: String, default: '' }, label: { type: String, default: 'Marketing' } },
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
