const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  hoursWorked: { type: Number, default: 0 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const targetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  targetValue: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  unit: { type: String, default: 'units' },
  bonusAmount: { type: Number, default: 0 },
  deadline: Date,
  status: { type: String, enum: ['active', 'completed', 'missed'], default: 'active' },
  completedAt: Date,
  setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const employeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeNo: { type: String, unique: true, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  basicSalary: { type: Number, required: true, default: 0 },
  allowances: { type: Number, default: 0 },
  maxLeavesPerYear: { type: Number, default: 24 },
  leavesTaken: { type: Number, default: 0 },
  epfNumber: { type: String, default: '' },
  etfNumber: { type: String, default: '' },
  joinedDate: { type: Date, required: true },
  probationEnd: Date,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  status: {
    type: String,
    enum: ['active', 'on_leave', 'resigned', 'terminated'],
    default: 'active'
  },
  // Personal Info
  idType: { type: String, enum: ['nic', 'driving_license', 'passport'], default: 'nic' },
  idNumber: { type: String, default: '' },
  nic: { type: String, default: '' },
  dob: Date,
  primaryPhone: { type: String, default: '' },
  secondaryPhone: { type: String, default: '' },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  address: { type: String, default: '' },
  // Document URLs
  cvUrl: { type: String, default: '' },
  agreementUrl: { type: String, default: '' },
  nicPhotoUrl: { type: String, default: '' },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
  // Bank Details
  bank: { type: String, default: '' },
  bankBranch: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  // Documents
  documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  skills: [String],
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Work Logs
  workLogs: [workLogSchema],
  // Targets & Bonus
  targets: [targetSchema],
  // Advance / Loan
  advanceBalance: { type: Number, default: 0 },
  loanBalance: { type: Number, default: 0 },
}, { timestamps: true });

// Auto-generate employee number
employeeSchema.pre('save', async function (next) {
  if (!this.employeeNo) {
    const count = await mongoose.model('Employee').countDocuments();
    this.employeeNo = `EMP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
