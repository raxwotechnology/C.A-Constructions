const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { submitFeedback, getFeedbacks, getPublicFeedbacks, reactFeedback, respondFeedback } = require('../controllers/feedbackController');

router.get('/public', getPublicFeedbacks);
router.post('/', protect, authorize('client'), submitFeedback);
router.get('/', protect, getFeedbacks);
router.put('/:id/reaction', protect, reactFeedback);
router.put('/:id/respond', protect, authorize('admin', 'manager'), respondFeedback);

module.exports = router;
