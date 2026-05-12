const mongoose = require('mongoose');

const attendancePolicySchema = new mongoose.Schema({
  name:       { type: String, required: true },
  employee:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },  // employee-specific (optional)
  branch:     { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  isDefault:  { type: Boolean, default: false },

  // Working hours
  workStartTime:   { type: String, default: '09:00' },  // HH:mm
  workEndTime:     { type: String, default: '18:00' },
  workHoursPerDay: { type: Number, default: 8 },
  workDaysPerWeek: { type: Number, default: 5 },
  workDays:        { type: [String], default: ['Mon','Tue','Wed','Thu','Fri'] },

  // Grace & overtime
  lateGraceMinutes:      { type: Number, default: 15 },   // minutes allowed before marking late
  halfDayThresholdHours: { type: Number, default: 4 },    // below this = half day
  overtimeEligible:      { type: Boolean, default: false },
  overtimeRateMultiplier:{ type: Number, default: 1.5 },

  // Deductions
  latePenaltyEnabled:         { type: Boolean, default: false },
  latePenaltyDeductionPerDay: { type: Number, default: 0 },   // LKR per late day
  absentDeductionPerDay:      { type: Number, default: 0 },   // LKR per absent day

  // Short leave
  shortLeaveMaxPerMonth: { type: Number, default: 2 },
  shortLeaveDurationHours:{ type: Number, default: 2 },

  notes:     { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('AttendancePolicy', attendancePolicySchema);
