const express = require('express');
const router = express.Router();
const { exportDatabaseBackup, listBackups } = require('../controllers/backupController');
const { protect, authorize } = require('../middleware/auth');

router.post('/export', protect, authorize('admin', 'CEO'), exportDatabaseBackup);
router.get('/list', protect, authorize('admin', 'CEO'), listBackups);

module.exports = router;
