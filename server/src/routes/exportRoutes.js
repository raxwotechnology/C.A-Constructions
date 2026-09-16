const express = require('express');
const router = express.Router();
const { exportToExcel, exportToPDF } = require('../controllers/exportController');
const { protect } = require('../middleware/auth');

// PDF and Excel Export Routes
router.get('/excel/:moduleName', protect, exportToExcel);
router.get('/pdf/:moduleName', protect, exportToPDF);

module.exports = router;
