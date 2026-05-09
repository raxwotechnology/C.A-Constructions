const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAgreements, getAgreement, createAgreement, updateAgreement, deleteAgreement, generatePreview
} = require('../controllers/agreementController');

router.get('/', protect, getAgreements);
router.get('/:id', protect, getAgreement);
router.post('/', protect, authorize('admin', 'manager'), createAgreement);
router.post('/generate-preview', protect, authorize('admin', 'manager'), generatePreview);
router.put('/:id', protect, authorize('admin', 'manager'), updateAgreement);
router.delete('/:id', protect, authorize('admin'), deleteAgreement);

module.exports = router;
