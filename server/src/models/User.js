const mongoose = require('mongoose');

const userRoles = [
  'Admin',
  'CEO',
  'Project Manager',
  'Engineer',
  'Supervisor',
  'Accountant',
  'Worker',
  'Subcontractor',
  'Supplier',
  'Client'
];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: userRoles,
      default: 'Worker',
      required: true
    },
    phone: { type: String, trim: true },
    nic: { type: String, trim: true },
    address: { type: String, trim: true },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    company: { type: String, default: 'R A Creations / R A Constructions' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
module.exports.USER_ROLES = userRoles;
