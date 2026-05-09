const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['present', 'present_short', 'absent', 'leave', 'half_day', 'short_leave', 'late'],
    default: 'present',
  },
  checkIn: Date,
  checkOut: Date,
  breakTimes: [{
    breakIn: Date,
    breakOut: Date,
    notes: String,
  }],
  totalWorkedHours: { type: Number, default: 0 },
  otHours: { type: Number, default: 0 },
  isHalfDay: { type: Boolean, default: false },
  isFullDay: { type: Boolean, default: true },
  notes: String,
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
