const express = require('express');
const router = express.Router();
const { getEmailLogs, resendEmail, sendCustomEmail, testSmtp } = require('../controllers/emailLogController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getEmailLogs);
router.post('/send-custom', sendCustomEmail);
router.post('/test-smtp', testSmtp);
router.post('/:id/resend', resendEmail);

module.exports = router;
