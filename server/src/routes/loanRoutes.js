const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getLoans, createLoan, recordPayment, deleteLoan } = require('../controllers/loanController');

router.use(protect, authorize('admin', 'manager'));
router.get('/', getLoans);
router.post('/', createLoan);
router.post('/:id/pay', recordPayment);
router.delete('/:id', deleteLoan);

module.exports = router;
