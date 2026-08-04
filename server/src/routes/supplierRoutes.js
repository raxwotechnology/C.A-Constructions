const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { protect } = require('../middleware/auth');

router.get('/', protect, supplierController.getSuppliers);
router.post('/', protect, supplierController.createSupplier);
router.put('/:id', protect, supplierController.updateSupplier);
router.get('/:id/ledger', protect, supplierController.getSupplierLedger);
router.post('/:id/payment', protect, supplierController.recordSupplierPayment);

router.get('/pos/all', protect, supplierController.getPurchaseOrders);
router.post('/pos', protect, supplierController.createPurchaseOrder);
router.patch('/pos/:id/status', protect, supplierController.updatePOStatus);

module.exports = router;
