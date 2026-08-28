const express = require('express');
const router = express.Router();
const { generatePayroll, generateAllPayroll, getPayrolls, getMyPayrolls, approvePayroll, markPaid, getEpfSummary, addOvertime, getOvertime, initiateSalaryPayHere, salaryPayHereNotify } = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');

router.post('/generate', protect, authorize('admin', 'manager'), generatePayroll);
router.post('/generate-all', protect, authorize('admin'), generateAllPayroll);
router.post('/overtime', protect, authorize('admin', 'manager'), addOvertime);
router.get('/overtime', protect, authorize('admin', 'manager'), getOvertime);
router.post('/payhere/notify', salaryPayHereNotify);
router.get('/epf-summary', protect, authorize('admin', 'manager'), getEpfSummary);
router.get('/my', protect, getMyPayrolls);
router.get('/', protect, authorize('admin', 'manager'), getPayrolls);
router.put('/:id/approve', protect, authorize('admin', 'manager'), approvePayroll);
router.put('/:id/pay', protect, authorize('admin'), markPaid);
router.post('/:id/payhere/init', protect, authorize('admin'), initiateSalaryPayHere);

module.exports = router;
