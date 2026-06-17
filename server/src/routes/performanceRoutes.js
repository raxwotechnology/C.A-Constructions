const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upsertPerformance, getPerformance, updatePerformance, deletePerformance } = require('../controllers/performanceController');

router.get('/', protect, authorize('admin', 'manager'), getPerformance);
router.post('/', protect, authorize('admin', 'manager'), upsertPerformance);
router.put('/:id', protect, authorize('admin', 'manager'), updatePerformance);
router.delete('/:id', protect, authorize('admin', 'manager'), deletePerformance);

module.exports = router;
