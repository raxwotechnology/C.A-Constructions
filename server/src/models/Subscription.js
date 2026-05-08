const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paidAt: { type: Date, default: Date.now },
  method: { type: String, default: 'manual' }, // manual, payhere, bank_transfer
  reference: { type: String, default: '' },
  note: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const hostingDetailSchema = new mongoose.Schema({
  hostingUrl: { type: String, default: '' },
  domainName: { type: String, default: '' },
  provider: { type: String, default: '' },
  hostingPlan: { type: String, default: '' },
  expiryDate: { type: Date },
  renewalStatus: { type: String, enum: ['active', 'pending_renewal', 'expired', 'cancelled'], default: 'active' },
  sslEnabled: { type: Boolean, default: false },
  nameservers: { type: String, default: '' },
  registrar: { type: String, default: '' },
  domainExpiryDate: { type: Date },
  notes: { type: String, default: '' },
});

const agreementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['hosting', 'maintenance', 'service', 'social_media', 'other'], default: 'service' },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
  validFrom: { type: Date },
  validUntil: { type: Date },
  notes: { type: String, default: '' },
});

const subscriptionSchema = new mongoose.Schema({
  // Core relations
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  previousProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],

  // Subscription info
  subscriptionNo: { type: String, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  subscriptionType: {
    type: String,
    enum: [
      'website_maintenance',
      'app_maintenance',
      'hosting_domain',
      'social_media_facebook',
      'social_media_instagram',
      'social_media_tiktok',
      'content_management',
      'technical_support',
      'bug_fixing',
      'seo_marketing',
      'custom',
    ],
    required: true,
  },

  // Billing
  amount: { type: Number, required: true }, // Custom per-client monthly amount
  currency: { type: String, default: 'LKR' },
  billingFrequency: { type: String, enum: ['monthly', 'quarterly', 'semi_annual', 'annual'], default: 'monthly' },
  billingDay: { type: Number, default: 1, min: 1, max: 28 }, // Day of month billing is due
  nextDueDate: { type: Date, required: true },
  gracePeriodDays: { type: Number, default: 7 }, // Days after due date before overdue

  // Payment tracking
  totalBilled: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  payments: [paymentRecordSchema],

  // Overdue
  overdueDays: { type: Number, default: 0 },
  lastOverdueCheck: { type: Date },

  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'overdue', 'cancelled', 'expired'],
    default: 'active',
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },

  // Hosting & Domain
  hostingDetails: hostingDetailSchema,

  // Agreements
  agreements: [agreementSchema],

  // Notes
  adminNotes: { type: String, default: '' },

}, { timestamps: true });

// Auto-generate subscription number
subscriptionSchema.pre('save', async function (next) {
  if (!this.subscriptionNo) {
    const count = await mongoose.model('Subscription').countDocuments();
    this.subscriptionNo = `SUB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual: remaining balance
subscriptionSchema.virtual('remainingBalance').get(function () {
  return Math.max(0, this.totalBilled - this.totalPaid);
});

// Index for quick lookups
subscriptionSchema.index({ client: 1, status: 1 });
subscriptionSchema.index({ nextDueDate: 1 });
subscriptionSchema.index({ 'hostingDetails.expiryDate': 1 });

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
