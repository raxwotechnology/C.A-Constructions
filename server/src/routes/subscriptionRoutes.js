const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadAgreement } = require('../middleware/upload');
const ctrl = require('../controllers/subscriptionController');

// ── Admin routes ────────────────────────────────────────
router.get('/billing-overview', protect, authorize('admin', 'manager'), ctrl.getBillingOverview);
router.post('/process-overdue', protect, authorize('admin'), ctrl.processOverdue);

// ── CRUD ────────────────────────────────────────────────
router.get('/', protect, ctrl.getSubscriptions);
router.get('/my-summary', protect, authorize('client'), ctrl.getMySubscriptionSummary);
router.get('/:id', protect, ctrl.getSubscription);
router.post('/', protect, authorize('admin'), ctrl.createSubscription);
router.put('/:id', protect, authorize('admin'), ctrl.updateSubscription);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteSubscription);

// ── Payments ────────────────────────────────────────────
router.post('/:id/payments', protect, authorize('admin'), ctrl.recordPayment);

// ── Agreements ──────────────────────────────────────────
router.post('/:id/agreements', protect, authorize('admin'), uploadAgreement, ctrl.addAgreement);
router.delete('/:id/agreements/:agreementId', protect, authorize('admin'), ctrl.removeAgreement);

module.exports = router;
