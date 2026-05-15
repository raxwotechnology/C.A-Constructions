const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAdvances, getEmployeeAdvanceSummary, createAdvance, recordRepayment, deleteAdvance } = require('../controllers/advanceController');

router.use(protect, authorize('admin', 'manager'));
router.get('/employee-summary/:employeeId', getEmployeeAdvanceSummary);
router.get('/', getAdvances);
router.post('/', createAdvance);
router.post('/:id/repay', recordRepayment);
router.delete('/:id', deleteAdvance);

module.exports = router;
