const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  recipientEmail: { type: String, required: true },
  subject: { type: String, required: true },
  module: { type: String, required: true }, // e.g., 'payroll', 'project', 'quotation', 'invoice'
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  error: { type: String },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('EmailLog', emailLogSchema);
