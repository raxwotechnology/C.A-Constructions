const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');
const { protect } = require('../middleware/auth');

router.get('/vendors', protect, mealController.getVendors);
router.post('/vendors', protect, mealController.createVendor);

router.get('/entries', protect, mealController.getMealEntries);
router.post('/entries', protect, mealController.createMealEntry);

router.get('/settlements', protect, mealController.getSettlements);
router.post('/settlements', protect, mealController.createSettlement);
router.get('/settlements/:id/print', protect, mealController.getSettlementPrintDetails);

module.exports = router;
