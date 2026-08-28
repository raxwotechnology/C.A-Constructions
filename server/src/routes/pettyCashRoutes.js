const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getTransactions, createTransaction, deleteTransaction, updateTransaction } = require('../controllers/pettyCashController');

router.use(protect, authorize('admin', 'manager'));
router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
