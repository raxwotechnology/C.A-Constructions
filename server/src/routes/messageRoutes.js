const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getContacts,
  getThreads,
  getThreadMessages,
  sendMessage,
  createGroup,
} = require('../controllers/messageController');

router.get('/contacts', protect, getContacts);
router.get('/threads', protect, getThreads);
router.get('/threads/:id', protect, getThreadMessages);
router.post('/', protect, sendMessage);
router.post('/groups', protect, createGroup);

module.exports = router;
