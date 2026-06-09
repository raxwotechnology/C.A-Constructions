const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, default: 'LKR' },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  dueDate: Date,
  paidAt: Date,
  notes: String,
  paymentRef: String,
}, { timestamps: true });

invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNo) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
