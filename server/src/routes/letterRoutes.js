const express = require('express');
const router = express.Router();
const { generateLetter, getLetters, getLetter, getMyLetters, updateLetter, getCompanyInfo } = require('../controllers/letterController');
const { protect, authorize } = require('../middleware/auth');

router.post('/generate', protect, authorize('admin', 'manager'), generateLetter);
router.get('/company-info', protect, getCompanyInfo);
router.get('/', protect, authorize('admin', 'manager'), getLetters);
router.put('/:id', protect, authorize('admin', 'manager'), updateLetter);
router.get('/my', protect, getMyLetters);
router.get('/:id', protect, getLetter);

module.exports = router;
