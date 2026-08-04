const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    employeeNo: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: { type: String, required: true },
    nic: { type: String, default: '' },
    epfNumber: { type: String, default: '' },
    designation: { type: String, default: 'Staff' },
    department: {
      type: String,
      default: 'Civil & Structural Engineering',
      trim: true,
    },
    joinedDate: { type: Date, default: Date.now },
    
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
    status: {
      type: String,
      enum: ['Active', 'active', 'On Leave', 'on_leave', 'Resigned', 'resigned', 'Terminated', 'terminated', 'Pending', 'pending', 'Inactive', 'inactive'],
      default: 'Active'
    },
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

// Pre-validate hook to handle all 5 frontend-backend payload mismatches automatically
employeeSchema.pre('validate', function (next) {
  // Sync user & userId
  if (this.user && !this.userId) this.userId = this.user;
  if (this.userId && !this.user) this.user = this.userId;

  // 1. Path 'employeeId' is required -> Auto-generate if missing
  if (!this.employeeId || !this.employeeId.trim()) {
    this.employeeId = 'EMP' + Date.now().toString().slice(-4);
  }
  if (!this.employeeNo || !this.employeeNo.trim()) {
    this.employeeNo = this.employeeId;
  }

  // 2. Path 'fullName' is required -> Fallback from name or employeeName
  if (!this.fullName || !this.fullName.trim() || this.fullName === 'Employee') {
    const rawName = this._doc?.name || this._doc?.employeeName || this._doc?.first_name || this.name;
    if (rawName) this.fullName = rawName;
    else if (!this.fullName) this.fullName = 'Employee';
  }

  // 3 & 4. Department sanitization
  if (this.department === 'active' || this.department === 'Active') {
    this.department = 'Civil & Structural Engineering';
    if (!this.status || this.status === 'Active') this.status = 'Active';
  } else if (!this.department || !String(this.department).trim()) {
    this.department = 'Civil & Structural Engineering';
  }

  // 5. Status sanitization
  if (this.status) {
    const s = String(this.status).toLowerCase();
    if (s === 'active') this.status = 'Active';
    else if (s === 'resigned') this.status = 'Resigned';
    else if (s === 'terminated') this.status = 'Terminated';
    else if (s === 'on_leave' || s === 'on leave') this.status = 'On Leave';
  } else {
    this.status = 'Active';
  }

  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
