const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { markAttendance, getAttendance, getMyAttendance } = require('../controllers/attendanceController');

router.post('/', protect, authorize('admin', 'manager'), markAttendance);
router.get('/', protect, authorize('admin', 'manager'), getAttendance);
router.get('/my', protect, authorize('developer'), getMyAttendance);

module.exports = router;
