const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAccounts, createAccount, updateAccount, deleteAccount, recordTransaction } = require('../controllers/bankAccountController');

router.use(protect, authorize('admin', 'manager'));
router.get('/', getAccounts);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);
router.post('/:id/transaction', recordTransaction);

module.exports = router;
