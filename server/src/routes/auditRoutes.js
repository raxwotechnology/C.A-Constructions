const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAuditLogs, getAuditStats } = require('../controllers/auditController');

router.use(protect, authorize('admin'));
router.get('/', getAuditLogs);
router.get('/stats', getAuditStats);

module.exports = router;
