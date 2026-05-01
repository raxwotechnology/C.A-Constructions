const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadScreenshot } = require('../middleware/upload.middleware');

router.use(protect);

router.get('/today', ctrl.getToday);
router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.getAttendance);
router.post('/clock-in', ctrl.clockIn);
router.post('/clock-out', ctrl.clockOut);
router.put('/:id', authorize('admin'), ctrl.updateAttendance);
router.post('/screenshot', uploadScreenshot, ctrl.addScreenshot);

module.exports = router;
