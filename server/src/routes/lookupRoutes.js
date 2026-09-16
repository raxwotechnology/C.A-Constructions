const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { searchLookup } = require('../controllers/lookupController');

router.use(protect, authorize('admin', 'manager'));
router.get('/:type', searchLookup);

module.exports = router;
