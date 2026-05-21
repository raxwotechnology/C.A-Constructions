const express = require('express');
const router = express.Router();
const { getEmailLogs } = require('../controllers/emailLogController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getEmailLogs);

module.exports = router;
