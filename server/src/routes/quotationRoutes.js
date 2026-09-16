const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getQuotations, getQuotation, createQuotation, updateQuotation,
  confirmQuotation, convertToInvoice, deleteQuotation, sendQuotation, downloadQuotationPdf,
} = require('../controllers/quotationController');

router.use(protect);
router.get('/', getQuotations);
router.get('/:id/pdf', downloadQuotationPdf);
router.get('/:id', getQuotation);
router.post('/', authorize('admin'), createQuotation);
router.put('/:id', authorize('admin'), updateQuotation);
router.put('/:id/confirm', authorize('admin'), confirmQuotation);
router.post('/:id/convert-to-invoice', authorize('admin'), convertToInvoice);
router.post('/:id/send', authorize('admin'), sendQuotation);
router.delete('/:id', authorize('admin'), deleteQuotation);

module.exports = router;
