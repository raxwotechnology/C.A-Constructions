const express = require('express');
const router = express.Router();
const { requestLeave, getLeaves, getMyLeaves, updateLeaveStatus, assignLeave } = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, requestLeave);
router.post('/assign', protect, authorize('admin', 'manager'), assignLeave);
router.get('/', protect, authorize('admin', 'manager'), getLeaves);
router.get('/my', protect, getMyLeaves);
router.put('/:id/status', protect, authorize('admin', 'manager'), updateLeaveStatus);

module.exports = router;
