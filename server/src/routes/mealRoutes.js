const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');
const { protect } = require('../middleware/auth');

router.get('/vendors', protect, mealController.getVendors);
router.post('/vendors', protect, mealController.createVendor);
router.put('/vendors/:id', protect, mealController.updateVendor);
router.delete('/vendors/:id', protect, mealController.deleteVendor);

router.get('/entries', protect, mealController.getMealEntries);
router.post('/entries', protect, mealController.createMealEntry);
router.put('/entries/:id', protect, mealController.updateMealEntry);
router.delete('/entries/:id', protect, mealController.deleteMealEntry);

router.get('/settlements', protect, mealController.getSettlements);
router.post('/settlements', protect, mealController.createSettlement);
router.get('/settlements/:id/print', protect, mealController.getSettlementPrintDetails);

module.exports = router;
