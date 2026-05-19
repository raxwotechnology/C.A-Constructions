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

router.post('/generate', protect, authorize('admin'), generatePayroll);
router.post('/generate-all', protect, authorize('admin'), generateAllPayroll);
router.post('/overtime', protect, authorize('admin'), addOvertime);
router.get('/overtime', protect, authorize('admin'), getOvertime);
router.get('/preview/:employeeId', protect, authorize('admin'), getEmployeePayrollPreview);
router.post('/payhere/notify', salaryPayHereNotify);
router.get('/epf-summary', protect, authorize('admin'), getEpfSummary);
router.get('/my', protect, getMyPayrolls);
router.get('/', protect, authorize('admin'), getPayrolls);
router.put('/:id/review', protect, authorize('admin'), reviewPayroll);
router.put('/:id/approve', protect, authorize('admin'), approvePayroll);
router.put('/:id/pay', protect, authorize('admin'), markPaid);
router.put('/:id/epf', protect, authorize('admin'), updateEpfRecord);
router.put('/:id', protect, authorize('admin'), updatePayroll);
router.post('/:id/payhere/init', protect, authorize('admin'), initiateSalaryPayHere);
router.delete('/:id', protect, authorize('admin'), deletePayroll);

module.exports = router;
