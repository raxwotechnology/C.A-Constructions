const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { initiatePayment, payhereNotify } = require('../controllers/paymentController');

router.post('/payhere/init', protect, initiatePayment);
router.post('/payhere/notify', payhereNotify); // Webhook — no auth

module.exports = router;
