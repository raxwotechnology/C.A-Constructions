const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAccounts, getAccountTransactions, getTransactionHistory, createAccount, updateAccount, deleteAccount, recordTransaction,
} = require('../controllers/bankAccountController');

router.use(protect, authorize('admin', 'manager'));
router.get('/history/transactions', getTransactionHistory);
router.get('/', getAccounts);
router.post('/', createAccount);
router.get('/:id/transactions', getAccountTransactions);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);
router.post('/:id/transaction', recordTransaction);

module.exports = router;
