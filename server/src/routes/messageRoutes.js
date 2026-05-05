const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getContacts,
  getThreads,
  getThreadMessages,
  sendMessage,
} = require('../controllers/messageController');

router.get('/contacts', protect, getContacts);
router.get('/threads', protect, getThreads);
router.get('/threads/:userId', protect, getThreadMessages);
router.post('/', protect, sendMessage);

module.exports = router;
