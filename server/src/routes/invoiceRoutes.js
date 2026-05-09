const express = require('express');
const router  = express.Router();
const {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  recordPayment, recordAdvance,
  initiatePayment, payhereCallback, getPaymentHistory,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');

// Core CRUD
router.get('/',    protect, getInvoices);
router.get('/:id', protect, getInvoice);
router.post('/',   protect, authorize('admin', 'manager'), createInvoice);
router.put('/:id', protect, authorize('admin', 'manager'), updateInvoice);
router.delete('/:id', protect, authorize('admin'), deleteInvoice);

// Payment actions on invoice
router.post('/:id/payments',  protect, authorize('admin', 'manager'), recordPayment);
router.post('/:id/advances',  protect, authorize('admin', 'manager'), recordAdvance);

// PayHere
router.post('/payments/payhere/init',     protect, initiatePayment);
router.post('/payments/payhere/callback', payhereCallback);
router.get('/payments/history',           protect, getPaymentHistory);

module.exports = router;
