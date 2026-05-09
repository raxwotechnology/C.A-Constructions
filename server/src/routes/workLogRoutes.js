const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const workLogController = require('../controllers/workLogController');

router.use(protect);

// Employee routes
router.post('/my', authorize('developer', 'designer', 'marketing', 'manager', 'admin'), workLogController.submitWorkLog);
router.get('/my', authorize('developer', 'designer', 'marketing', 'manager', 'admin'), workLogController.getMyWorkLogs);

// Admin/Manager routes
router.get('/', authorize('admin', 'manager'), workLogController.getAllWorkLogs);
router.post('/:id/comments', authorize('admin', 'manager'), workLogController.addComment);
router.put('/:id/status', authorize('admin', 'manager'), workLogController.updateStatus);

module.exports = router;
