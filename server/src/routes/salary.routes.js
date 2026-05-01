const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salary.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// Salary structures
router.get('/structures', ctrl.getSalaries);
router.post('/structures', authorize('admin'), ctrl.setSalary);

// Payroll
router.get('/payroll', ctrl.getPayroll);
router.post('/payroll/process', authorize('admin'), ctrl.processPayroll);
router.patch('/payroll/:id/pay', authorize('admin'), ctrl.markPaid);

// Overtime
router.get('/overtime', ctrl.getOvertime);
router.post('/overtime', ctrl.addOvertime);
router.patch('/overtime/:id/approve', authorize('admin', 'manager'), ctrl.approveOvertime);

module.exports = router;
