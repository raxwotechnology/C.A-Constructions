const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAdvances, getAdvance, getEmployeeAdvanceSummary, createAdvance, updateAdvance, recordRepayment, deleteAdvance } = require('../controllers/advanceController');

router.use(protect, authorize('admin', 'manager'));
router.get('/employee-summary/:employeeId', getEmployeeAdvanceSummary);
router.get('/', getAdvances);
router.get('/:id', getAdvance);
router.post('/', createAdvance);
router.put('/:id', updateAdvance);
router.post('/:id/repay', recordRepayment);
router.delete('/:id', deleteAdvance);

module.exports = router;
