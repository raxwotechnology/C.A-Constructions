const mongoose = require('mongoose');

const letterSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: {
    type: String,
    enum: ['offer', 'appointment', 'confirmation', 'experience', 'salary', 'service_agreement', 'epf_confirmation', 'warning', 'termination', 'internship', 'contract', 'part_time', 'resignation', 'custom'],
    required: true
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  pdfUrl: String,
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedDate: { type: Date, default: Date.now },
  sentByEmail: { type: Boolean, default: false },
  sentAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Letter', letterSchema);
