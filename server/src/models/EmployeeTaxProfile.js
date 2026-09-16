const mongoose = require('mongoose');

const exemptionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  amount: { type: Number, default: 0 },
}, { _id: false });

const employeeTaxProfileSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  year: { type: Number, required: true },
  tin: { type: String, default: '', trim: true },
  taxResidency: {
    type: String,
    enum: ['resident', 'non_resident'],
    default: 'resident',
  },
  employmentType: {
    type: String,
    enum: ['permanent', 'contract', 'internship'],
    default: 'permanent',
  },
  filingStatus: {
    type: String,
    enum: ['single', 'married', 'head_of_household'],
    default: 'single',
  },
  calculationMode: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly',
  },
  isExempt: { type: Boolean, default: false },
  exemptionReason: { type: String, default: '' },
  exemptions: [exemptionSchema],
  effectiveFrom: { type: Date },
  notes: { type: String, default: '' },
}, { timestamps: true });

employeeTaxProfileSchema.index({ employee: 1, year: 1 }, { unique: true });

employeeTaxProfileSchema.pre('validate', function validateExemption(next) {
  if (this.isExempt && !String(this.exemptionReason || '').trim()) {
    this.invalidate('exemptionReason', 'Exemption reason is required when tax exempt');
  }
  next();
});

module.exports = mongoose.model('EmployeeTaxProfile', employeeTaxProfileSchema);
