const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  recipientName: { type: String, required: true },
  recipientPhone: { type: String, required: true },
  message: { type: String, required: true },
  module: { type: String, required: true }, // e.g., 'payroll', 'leave', 'project'
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  response: { type: mongoose.Schema.Types.Mixed },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SmsLog', smsLogSchema);
