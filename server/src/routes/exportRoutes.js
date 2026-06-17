const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { exportJson, exportPdf, exportHtml, adminEmployeeExport } = require('../controllers/exportController');

const STAFF_EXPORT_ROLES = ['developer', 'designer', 'marketing'];

router.get('/admin/:employeeId/:category/:format', protect, authorize('admin', 'manager'), adminEmployeeExport);
router.get('/:category/html', protect, authorize(...STAFF_EXPORT_ROLES), exportHtml);
router.get('/:category/pdf', protect, authorize(...STAFF_EXPORT_ROLES), exportPdf);
router.get('/:category/json', protect, authorize(...STAFF_EXPORT_ROLES), exportJson);

module.exports = router;
