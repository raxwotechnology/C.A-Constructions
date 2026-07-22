const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAgreements,
  getAgreement,
  createAgreement,
  updateAgreement,
  deleteAgreement,
  generatePreview,
  generateAgreementPdf,
  getAgreementTemplates,
  createAgreementTemplate,
  updateAgreementTemplate,
  deleteAgreementTemplate,
} = require('../controllers/agreementController');

// Static paths must be registered before `/:id` so "templates" is not parsed as an id.
router.get('/templates', protect, getAgreementTemplates);
router.post('/templates', protect, authorize('admin', 'manager'), createAgreementTemplate);
router.put('/templates/:templateId', protect, authorize('admin', 'manager'), updateAgreementTemplate);
router.delete('/templates/:templateId', protect, authorize('admin', 'manager'), deleteAgreementTemplate);

router.post('/generate-preview', protect, authorize('admin', 'manager'), generatePreview);
router.post('/generate-pdf', protect, authorize('admin', 'manager'), generateAgreementPdf);
router.get('/', protect, getAgreements);
router.get('/:id', protect, getAgreement);
router.post('/', protect, authorize('admin', 'manager'), createAgreement);
router.put('/:id', protect, authorize('admin', 'manager'), updateAgreement);
router.delete('/:id', protect, authorize('admin'), deleteAgreement);

module.exports = router;
