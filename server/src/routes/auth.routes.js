const express = require('express');
const router = express.Router();
const { login, register, getMe, changePassword, updateProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

router.post('/login', [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

router.post('/register', [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);

router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
