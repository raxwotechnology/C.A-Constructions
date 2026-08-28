const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getMyRewards,
  getCatalog,
  previewVoucher,
  redeemVoucher,
  adminGetRules,
  adminUpsertRule,
  adminGetVouchers,
  adminCreateVoucherTemplate,
  adminUpdateVoucher,
  adminDeleteVoucher,
  adminAnalytics,
  adminClientLeaderboard,
} = require('../controllers/rewardController');

router.get('/me', protect, authorize('client'), getMyRewards);
router.get('/catalog', protect, authorize('client'), getCatalog);
router.post('/vouchers/preview', protect, authorize('client'), previewVoucher);
router.post('/vouchers/redeem', protect, authorize('client'), redeemVoucher);

router.get('/admin/rules', protect, authorize('admin', 'manager'), adminGetRules);
router.post('/admin/rules', protect, authorize('admin', 'manager'), adminUpsertRule);
router.get('/admin/vouchers', protect, authorize('admin', 'manager'), adminGetVouchers);
router.post('/admin/vouchers', protect, authorize('admin', 'manager'), adminCreateVoucherTemplate);
router.put('/admin/vouchers/:id', protect, authorize('admin', 'manager'), adminUpdateVoucher);
router.delete('/admin/vouchers/:id', protect, authorize('admin', 'manager'), adminDeleteVoucher);
router.get('/admin/analytics', protect, authorize('admin', 'manager'), adminAnalytics);
router.get('/admin/leaderboard', protect, authorize('admin', 'manager'), adminClientLeaderboard);

module.exports = router;
