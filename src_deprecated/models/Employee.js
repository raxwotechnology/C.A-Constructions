const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeNo: { type: String, unique: true, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  basicSalary: { type: Number, required: true, default: 0 },
  allowances: { type: Number, default: 0 },
  epfNumber: { type: String, default: '' },
  etfNumber: { type: String, default: '' },
  joinedDate: { type: Date, required: true },
  probationEnd: Date,
  status: {
    type: String,
    enum: ['active', 'on_leave', 'resigned', 'terminated'],
    default: 'active'
  },
  // Personal Info
  nic: { type: String, default: '' },
  dob: Date,
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  address: { type: String, default: '' },
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
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  skills: [String],
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
