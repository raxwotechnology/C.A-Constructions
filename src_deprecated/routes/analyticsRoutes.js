const express = require('express');
const router = express.Router();
const { getDashboard, getNotifications, markRead, markSingleRead, getNotificationById, broadcastAnnouncement, sendBirthdayNotifications } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('admin', 'manager'), getDashboard);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read', protect, markRead);
router.get('/notifications/:id', protect, getNotificationById);
router.put('/notifications/:id/read', protect, markSingleRead);
router.post('/notifications/broadcast', protect, authorize('admin'), broadcastAnnouncement);
router.post('/notifications/birthdays', protect, authorize('admin'), sendBirthdayNotifications);

module.exports = router;
