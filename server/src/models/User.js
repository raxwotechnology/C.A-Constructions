const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userRoles = [
  'admin', 'manager', 'engineer', 'supervisor', 'accountant', 'worker', 'subcontractor', 'supplier', 'client', 'ceo', 'developer', 'designer', 'marketing',
  'Admin', 'CEO', 'Project Manager', 'Engineer', 'Supervisor', 'Accountant', 'Worker', 'Subcontractor', 'Supplier', 'Client'
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: false, sparse: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      default: 'admin',
      required: true
    },
    allowedTabs: [{ type: String }],
    phone: { type: String, trim: true, default: '' },
    nic: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    company: { type: String, default: 'R A Creations / R A Constructions' },
    otpCode: { type: String, select: false },
    otpExpire: { type: Date, select: false },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  // Prevent double-hashing if password is already a bcrypt hash
  if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  // If stored password is already bcrypt hash (starts with $2a$ or $2b$)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return await bcrypt.compare(enteredPassword, this.password);
  }
  // Fallback for legacy plain text passwords during migration
  return enteredPassword === this.password;
};

if (mongoose.models && mongoose.models.User) {
  delete mongoose.models.User;
}

module.exports = mongoose.model('User', userSchema);
module.exports.USER_ROLES = userRoles;
