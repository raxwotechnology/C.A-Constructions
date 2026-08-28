const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/chequeController');

router.get('/', protect, authorize('admin', 'manager'), ctrl.listCheques);
router.post('/', protect, authorize('admin', 'manager'), ctrl.createCheque);
router.get('/:id', protect, authorize('admin', 'manager'), ctrl.getCheque);
router.put('/:id', protect, authorize('admin', 'manager'), ctrl.updateCheque);
router.delete('/:id', protect, authorize('admin', 'manager'), ctrl.deleteCheque);

module.exports = router;
