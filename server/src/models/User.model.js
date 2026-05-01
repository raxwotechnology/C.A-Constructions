const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, select: false },
  userType: {
    type: String,
    enum: ['admin', 'developer', 'manager', 'marketing_designer', 'customer'],
    default: 'developer'
  },
  isActive: { type: Boolean, default: true },
  avatar: { type: String, default: null },
  // Developer/Manager/Designer specific
  employeeId: { type: String, unique: true, sparse: true },
  department: { type: String, default: null },
  position: { type: String, default: null },
  skills: [{ type: String }],
  experience: { type: String, default: null },
  hourlyRate: { type: Number, default: 0 },
  salary: { type: Number, default: 0 },
  joiningDate: { type: Date, default: null },
  // Documents
  cvFile: { type: String, default: null },
  offerLetter: { type: String, default: null },
  companyAgreement: { type: String, default: null },
  photo: { type: String, default: null },
  dateOfBirth: { type: Date, default: null },
  // Customer specific
  address: { type: String, default: null },
  discount: { type: Number, default: 0 },
  lastLogin: { type: Date, default: null },
}, {
  timestamps: true
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate employee ID
userSchema.pre('save', async function (next) {
  if (!this.employeeId && this.userType !== 'customer' && this.userType !== 'admin') {
    const prefix = { developer: 'DEV', manager: 'MGR', marketing_designer: 'MKT' };
    const count = await mongoose.model('User').countDocuments({ userType: this.userType });
    this.employeeId = `${prefix[this.userType] || 'EMP'}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
