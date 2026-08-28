const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAccounts, getAccountTransactions, getTransactionHistory, createAccount, updateAccount, deleteAccount, recordTransaction, deleteTransaction
} = require('../controllers/bankAccountController');

router.get('/debug', async (req, res) => {
  const BankAccount = require('../models/BankAccount');
  const accounts = await BankAccount.find();
  res.json(accounts);
});

router.use(protect, authorize('admin', 'manager'));
router.get('/history/transactions', getTransactionHistory);
router.get('/', getAccounts);
router.post('/', createAccount);
router.get('/:id/transactions', getAccountTransactions);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);
router.post('/:id/transaction', recordTransaction);
router.delete('/:accountId/transaction/:transactionId', deleteTransaction);

module.exports = router;
