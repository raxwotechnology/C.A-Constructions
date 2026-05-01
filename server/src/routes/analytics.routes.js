const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin', 'manager'));

router.get('/dashboard', ctrl.getDashboardStats);
router.get('/ai-predictions', ctrl.getAIPredictions);
router.get('/revenue', ctrl.getRevenueAnalytics);

module.exports = router;
