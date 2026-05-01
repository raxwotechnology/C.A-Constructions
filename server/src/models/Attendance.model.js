const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  clockIn: { type: Date },
  clockOut: { type: Date },
  hoursWorked: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'wfh', 'half_day', 'on_leave'],
    default: 'present'
  },
  isWFH: { type: Boolean, default: false },
  location: { type: String, default: 'office' },
  // AI Biometric fields
  typingPattern: { type: Object, default: null },
  mousePattern: { type: Object, default: null },
  deviceFingerprint: { type: String, default: null },
  biometricScore: { type: Number, default: 0 },
  biometricVerified: { type: Boolean, default: false },
  // Work screenshots
  screenshots: [{ type: String }],
  notes: { type: String },
  overtimeHours: { type: Number, default: 0 },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true
});

// Compound index for employee + date uniqueness
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
