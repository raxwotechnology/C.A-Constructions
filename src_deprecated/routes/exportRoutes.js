const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { exportJson, exportPdf, adminEmployeeExport } = require('../controllers/exportController');

router.get('/:category/json', protect, authorize('developer'), exportJson);
router.get('/:category/pdf', protect, authorize('developer'), exportPdf);
router.get('/admin/:employeeId/:category/:format', protect, authorize('admin', 'manager'), adminEmployeeExport);

module.exports = router;

