const express = require('express');
const router = express.Router();
const siteInventoryController = require('../controllers/siteInventoryController');
const { protect } = require('../middleware/auth');

router.get('/stock', protect, siteInventoryController.getInventory);
router.post('/stock', protect, siteInventoryController.upsertStock);

router.get('/transfers', protect, siteInventoryController.getTransfers);
router.post('/transfers', protect, siteInventoryController.createTransfer);
router.put('/transfers/receive', protect, siteInventoryController.receiveTransfer);

router.get('/grn', protect, siteInventoryController.getGRNs);
router.post('/grn', protect, siteInventoryController.createGRN);

module.exports = router;
