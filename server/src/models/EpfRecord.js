const mongoose = require('mongoose');

// Standalone EPF/ETF record per employee per month.
// Auto-created when GET /api/epf-records is called for a period.
// Completely independent of Payroll — always editable / deletable.
const epfRecordSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month:    { type: Number, required: true },
  year:     { type: Number, required: true },

  basicSalary: { type: Number, default: 0 },
  epfEmployee: { type: Number, default: 0 },  // 8%
  epfEmployer: { type: Number, default: 0 },  // 12%
  etfEmployer: { type: Number, default: 0 },  // 3%
  totalEPF:    { type: Number, default: 0 },  // epfEmployee + epfEmployer

  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  notes: { type: String, default: '' },
}, { timestamps: true });

// One record per employee per month/year
epfRecordSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('EpfRecord', epfRecordSchema);
