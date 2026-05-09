const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getTransactions, createTransaction, deleteTransaction } = require('../controllers/pettyCashController');

router.use(protect, authorize('admin', 'manager'));
router.get('/', getTransactions);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
