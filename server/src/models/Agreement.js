const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema({
  // ── Type ──────────────────────────────────────────────────────────────────
  agreementType: {
    type: String,
    enum: ['client_project', 'subscription_service', 'invoice_payment', 'general'],
    required: true,
    default: 'general',
  },

  // ── Title / Reference ─────────────────────────────────────────────────────
  title: { type: String, required: true },
  agreementNo: { type: String, unique: true },

  // ── Linked records ────────────────────────────────────────────────────────
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  invoice:      { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },

  // ── Content ───────────────────────────────────────────────────────────────
  content: { type: String, default: '' },   // rich HTML content
  templateId: String,                        // template used to generate

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['draft', 'finalised', 'signed', 'expired'],
    default: 'draft',
  },
  finalisedAt: Date,
  signedAt: Date,

  // ── Meta ──────────────────────────────────────────────────────────────────
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileUrl: { type: String, default: '' },  // stored PDF/file URL
}, { timestamps: true });

// Auto agreement number
agreementSchema.pre('save', async function (next) {
  if (!this.agreementNo) {
    const count = await mongoose.model('Agreement').countDocuments();
    this.agreementNo = `AGR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Agreement', agreementSchema);
