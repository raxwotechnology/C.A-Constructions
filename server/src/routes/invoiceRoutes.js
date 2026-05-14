const express = require('express');
const router  = express.Router();
const {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  recordPayment, recordAdvance,
  initiatePayment, payhereCallback, getPaymentHistory,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

// PayHere
router.get('/payments/history',           protect, getPaymentHistory);
router.post('/payments/payhere/init',     protect, initiatePayment);
router.post('/payments/payhere/callback', payhereCallback);

// Core CRUD
router.get('/',    protect, getInvoices);
router.post('/',   protect, authorize('admin', 'manager'), createInvoice);

// These dynamic routes must come AFTER static routes like /payments/history
router.get('/:id', protect, getInvoice);
router.put('/:id', protect, authorize('admin', 'manager'), updateInvoice);
router.delete('/:id', protect, authorize('admin', 'manager'), deleteInvoice);

// Payment actions on invoice
router.post('/:id/payments',  protect, authorize('admin', 'manager'), recordPayment);
router.post('/:id/advances',  protect, authorize('admin', 'manager'), recordAdvance);

module.exports = router;
