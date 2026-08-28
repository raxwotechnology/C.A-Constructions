const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  markAttendance,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getToday,
  getAttendance,
  getMyAttendance,
  getAttendanceAnalytics,
  updateAttendance,
} = require('../controllers/attendanceController');

const allEmployeeRoles = ['developer', 'designer', 'marketing', 'manager', 'admin'];

// ── Employee self-service routes ─────────────────────────────────────────────
router.get('/today', protect, authorize(...allEmployeeRoles), getToday);
router.post('/clock-in', protect, authorize(...allEmployeeRoles), clockIn);
router.post('/clock-out', protect, authorize(...allEmployeeRoles), clockOut);
router.post('/break/start', protect, authorize(...allEmployeeRoles), startBreak);
router.post('/break/end', protect, authorize(...allEmployeeRoles), endBreak);
router.get('/my', protect, authorize(...allEmployeeRoles), getMyAttendance);

// ── Admin / Manager routes ───────────────────────────────────────────────────
router.post('/', protect, authorize('admin', 'manager'), markAttendance);
router.get('/', protect, authorize('admin', 'manager'), getAttendance);
router.get('/analytics', protect, authorize('admin', 'manager'), getAttendanceAnalytics);
router.put('/:id', protect, authorize('admin', 'manager'), updateAttendance);

module.exports = router;
