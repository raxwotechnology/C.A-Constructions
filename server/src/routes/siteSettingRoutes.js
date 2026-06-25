const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getSiteSettings, updateSiteSettings, downloadDatabase } = require('../controllers/siteSettingController');

router.get('/download-db', protect, authorize('admin'), downloadDatabase);
router.get('/', getSiteSettings);
router.put('/', protect, authorize('admin'), updateSiteSettings);

module.exports = router;
