const express = require('express');
const router = express.Router();
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { createBooking, getBookings, updateBooking } = require('../controllers/bookingController');

router.post('/', optionalAuth, createBooking);
router.get('/', protect, getBookings);
router.put('/:id', protect, authorize('admin', 'manager'), updateBooking);

module.exports = router;
