const express = require('express');
const router = express.Router();
const { getInvoices, getInvoice, createInvoice, updateInvoice, initiatePayment, payhereCallback, getPaymentHistory } = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

// Invoices
router.get('/', protect, getInvoices);
router.get('/:id', protect, getInvoice);
router.post('/', protect, authorize('admin', 'manager'), createInvoice);
router.put('/:id', protect, authorize('admin', 'manager'), updateInvoice);

// Payments
router.post('/payments/payhere/init', protect, initiatePayment);
router.post('/payments/payhere/callback', payhereCallback); // public webhook
router.get('/payments/history', protect, getPaymentHistory);

module.exports = router;
