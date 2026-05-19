const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getLoans, createLoan, updateLoan, recordPayment, deleteLoan, getEmployeeLoanSummary } = require('../controllers/loanController');

router.use(protect, authorize('admin'));
router.get('/', getLoans);
router.get('/employee-summary/:employeeId', getEmployeeLoanSummary);
router.post('/', createLoan);
router.put('/:id', updateLoan);
router.post('/:id/pay', recordPayment);
router.delete('/:id', deleteLoan);

module.exports = router;
