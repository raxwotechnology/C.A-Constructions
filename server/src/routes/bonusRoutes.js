const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const bonusController = require('../controllers/bonusController');

router.use(protect);
router.use(authorize('admin', 'manager'));

router.post('/', bonusController.createTarget);
router.get('/', bonusController.getTargets);
router.put('/:id/achieve', bonusController.markAchieved);

module.exports = router;
