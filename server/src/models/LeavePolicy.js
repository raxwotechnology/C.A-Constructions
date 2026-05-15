const mongoose = require('mongoose');

const leaveTypeQuotaSchema = new mongoose.Schema({
  leaveType: {
    type: String,
    enum: ['annual', 'medical', 'casual', 'half_day', 'short_leave', 'no_pay', 'maternity', 'paternity'],
    required: true
  },
  quota: { type: Number, default: 0 },          // days per year (hours for short_leave)
  carryForward: { type: Boolean, default: false },
  carryForwardCap: { type: Number, default: 0 }, // max days to carry forward (0 = unlimited)
  requireDocument: { type: Boolean, default: false },
  requireReason: { type: Boolean, default: false },
  // Salary deduction when this leave type quota is exceeded
  deductSalaryOnExcess: { type: Boolean, default: false },
  deductionPerExtraDay: { type: Number, default: 0 }, // LKR per extra day
}, { _id: false });

const leavePolicySchema = new mongoose.Schema({
  name: { type: String, required: true },        // e.g. "Permanent Staff", "Probation"
  employmentType: { type: String, default: 'all' },
  department: { type: String, default: '' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  leaveYear: { type: String, default: 'jan-dec' }, // or 'apr-mar' etc
  quotas: [leaveTypeQuotaSchema],
  isDefault: { type: Boolean, default: false },
  // Global salary deduction for ALL excess leaves (overridden by per-type settings)
  salaryDeductionEnabled: { type: Boolean, default: false },
  deductionPerExtraLeaveDay: { type: Number, default: 0 }, // LKR per extra day (global fallback)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
