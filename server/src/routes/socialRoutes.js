const express = require('express');
const router = express.Router();
const { getSocialAnalytics, postSocialAnalytics } = require('../controllers/socialController');
const { protect, authorize } = require('../middleware/auth');

// GET uses server env; POST accepts manual credentials from AI Analyzer UI
router.get('/', protect, getSocialAnalytics);
router.post('/', protect, postSocialAnalytics);

module.exports = router;
