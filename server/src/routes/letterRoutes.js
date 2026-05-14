const express = require('express');
const router = express.Router();
const {
  generateLetter,
  getLetters,
  getLetter,
  getMyLetters,
  updateLetter,
  deleteLetter,
  getCompanyInfo,
  getLetterTemplates,
  createLetterTemplate,
  deleteLetterTemplate,
} = require('../controllers/letterController');
const { protect, authorize } = require('../middleware/auth');

router.post('/generate', protect, authorize('admin', 'manager'), generateLetter);
router.get('/company-info', protect, getCompanyInfo);
router.get('/templates', protect, authorize('admin', 'manager'), getLetterTemplates);
router.post('/templates', protect, authorize('admin', 'manager'), createLetterTemplate);
router.delete('/templates/:templateId', protect, authorize('admin', 'manager'), deleteLetterTemplate);
router.get('/', protect, authorize('admin', 'manager'), getLetters);
router.get('/my', protect, getMyLetters);
router.put('/:id', protect, authorize('admin', 'manager'), updateLetter);
router.delete('/:id', protect, authorize('admin', 'manager'), deleteLetter);
router.get('/:id', protect, getLetter);

module.exports = router;
