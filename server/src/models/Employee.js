const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: { type: String, required: true },
    nic: { type: String, required: true },
    epfNumber: { type: String },
    designation: { type: String, required: true },
    department: { type: String, enum: ['Engineering', 'Site Operations', 'Finance', 'HR', 'Executive'], default: 'Site Operations' },
    joinedDate: { type: Date, required: true },
    
    // Compensation Structure (Sri Lanka Statutory)
    basicSalary: { type: Number, required: true, default: 0 },
    fixedAllowances: { type: Number, default: 0 },
    otRatePerHour: { type: Number, default: 0 },
    doubleOtRatePerHour: { type: Number, default: 0 },
    
    // EPF / ETF / APIT Tax Settings
    isEpfEligible: { type: Boolean, default: true },
    isApitTaxEligible: { type: Boolean, default: true },
    bankDetails: {
      bankName: { type: String },
      branchName: { type: String },
      accountNumber: { type: String }
    },
    status: { type: String, enum: ['Active', 'On Leave', 'Resigned', 'Terminated'], default: 'Active' },
    warningLetters: [
      {
        date: { type: Date, default: Date.now },
        reason: { type: String },
        issuedBy: { type: String }
      }
    ],
    exitChecklist: {
      equipmentHandedOver: { type: Boolean, default: false },
      finalSettlementDone: { type: Boolean, default: false },
      epfFormCSubmitted: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', employeeSchema);
