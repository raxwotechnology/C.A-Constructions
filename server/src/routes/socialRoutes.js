const express = require('express');
const router = express.Router();
const { getSocialAnalytics } = require('../controllers/socialController');
const { protect, authorize } = require('../middleware/auth');

// Admin/manager have full access; employee access is gated at UI by assigned platforms
router.get('/', protect, getSocialAnalytics);

module.exports = router;
