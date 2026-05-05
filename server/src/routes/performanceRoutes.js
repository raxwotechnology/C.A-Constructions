const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upsertPerformance, getPerformance } = require('../controllers/performanceController');

router.get('/', protect, authorize('admin', 'manager'), getPerformance);
router.post('/', protect, authorize('admin', 'manager'), upsertPerformance);

module.exports = router;
