const express = require('express');
const router = express.Router();
const { getEmailLogs, resendEmail } = require('../controllers/emailLogController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getEmailLogs);
router.post('/:id/resend', resendEmail);

module.exports = router;
