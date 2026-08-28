const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getTargets, createTarget, updateTarget, deleteTarget, getTargetStats,
} = require('../controllers/targetController');

router.get('/stats', protect, authorize('admin', 'manager'), getTargetStats);
router.get('/',      protect, authorize('admin', 'manager'), getTargets);
router.post('/',     protect, authorize('admin', 'manager'), createTarget);
router.put('/:id',   protect, authorize('admin', 'manager'), updateTarget);
router.delete('/:id',protect, authorize('admin', 'manager'), deleteTarget);

module.exports = router;
