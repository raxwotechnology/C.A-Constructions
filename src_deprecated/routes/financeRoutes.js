const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { addEntry, getEntries, getOverview, exportData } = require('../controllers/financeController');

router.get('/overview', protect, authorize('admin', 'manager'), getOverview);
router.get('/entries', protect, authorize('admin', 'manager'), getEntries);
router.post('/entries', protect, authorize('admin'), addEntry);
router.get('/export', protect, authorize('admin', 'manager'), exportData);

module.exports = router;

