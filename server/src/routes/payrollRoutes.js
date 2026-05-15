const express = require('express');
const router = express.Router();
const {
  generatePayroll, generateAllPayroll, getPayrolls, getMyPayrolls, getEmployeePayrollPreview,
  reviewPayroll, approvePayroll, updatePayroll, markPaid,
  getEpfSummary, addOvertime, getOvertime,
  initiateSalaryPayHere, salaryPayHereNotify,
  updateEpfRecord, deletePayroll,
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');

router.post('/generate', protect, authorize('admin', 'manager'), generatePayroll);
router.post('/generate-all', protect, authorize('admin'), generateAllPayroll);
router.post('/overtime', protect, authorize('admin', 'manager'), addOvertime);
router.get('/overtime', protect, authorize('admin', 'manager'), getOvertime);
router.get('/preview/:employeeId', protect, authorize('admin', 'manager'), getEmployeePayrollPreview);
router.post('/payhere/notify', salaryPayHereNotify);
router.get('/epf-summary', protect, authorize('admin', 'manager'), getEpfSummary);
router.get('/my', protect, getMyPayrolls);
router.get('/', protect, authorize('admin', 'manager'), getPayrolls);
router.put('/:id/review', protect, authorize('admin', 'manager'), reviewPayroll);
router.put('/:id/approve', protect, authorize('admin', 'manager'), approvePayroll);
router.put('/:id/pay', protect, authorize('admin'), markPaid);
router.put('/:id/epf', protect, authorize('admin', 'manager'), updateEpfRecord);
router.put('/:id', protect, authorize('admin', 'manager'), updatePayroll);
router.post('/:id/payhere/init', protect, authorize('admin'), initiateSalaryPayHere);
router.delete('/:id', protect, authorize('admin'), deletePayroll);

module.exports = router;
