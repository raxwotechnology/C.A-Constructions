const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/financial.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin', 'manager'));

router.get('/summary', ctrl.getFinancialSummary);
router.get('/revenue', ctrl.getRevenue);
router.post('/revenue', ctrl.addRevenue);
router.put('/revenue/:id', ctrl.updateRevenue);
router.delete('/revenue/:id', ctrl.deleteRevenue);
router.get('/expenses', ctrl.getExpenses);
router.post('/expenses', ctrl.addExpense);
router.put('/expenses/:id', ctrl.updateExpense);
router.delete('/expenses/:id', ctrl.deleteExpense);

module.exports = router;
