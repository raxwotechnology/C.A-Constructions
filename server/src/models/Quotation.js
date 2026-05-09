const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const quotationSchema = new mongoose.Schema({
  quotationNo: { type: String, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  title: { type: String, default: '' },
  quotationDate: { type: Date, default: Date.now },
  serviceType: {
    type: String,
    enum: ['ERP', 'POS', 'Hosting', 'Website', 'Maintenance', 'Custom', 'Other'],
    default: 'Other'
  },
  items: [quotationItemSchema],
  subtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'LKR' },
  validUntil: { type: Date },
  notes: { type: String, default: '' },
  terms: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'confirmed', 'rejected', 'expired', 'converted'],
    default: 'draft'
  },
  statusLog: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  convertedToInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  confirmedAt: Date,
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedAt: Date,
  sentAt: Date,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate quotation number
quotationSchema.pre('save', async function (next) {
  if (!this.quotationNo) {
    const count = await mongoose.model('Quotation').countDocuments();
    this.quotationNo = `QUO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Quotation', quotationSchema);
