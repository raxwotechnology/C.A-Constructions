const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { submitFeedback, getFeedbacks, getPublicFeedbacks, reactFeedback, respondFeedback } = require('../controllers/feedbackController');

router.get('/public', getPublicFeedbacks);
router.post('/', submitFeedback);
router.get('/', protect, getFeedbacks);
router.put('/:id/reaction', protect, reactFeedback);
router.put('/:id/respond', protect, authorize('admin', 'manager'), respondFeedback);
router.put('/:id/status', protect, authorize('admin', 'manager'), require('../controllers/feedbackController').updateFeedbackStatus);

module.exports = router;
