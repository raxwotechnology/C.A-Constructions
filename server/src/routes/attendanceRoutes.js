const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { markAttendance, getAttendance, getMyAttendance, getAttendanceAnalytics } = require('../controllers/attendanceController');

router.post('/', protect, authorize('admin', 'manager'), markAttendance);
router.get('/', protect, authorize('admin', 'manager'), getAttendance);
router.get('/analytics', protect, authorize('admin', 'manager'), getAttendanceAnalytics);
router.get('/my', protect, authorize('developer', 'designer', 'marketing'), getMyAttendance);

module.exports = router;
