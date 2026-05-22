const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createMeeting,
  getMeetings,
  getAttendees,
  deleteMeeting,
} = require('../controllers/meetingController');

router.get('/', protect, getMeetings);
router.post('/create', protect, authorize('admin', 'manager'), createMeeting);
router.get('/:id/attendees', protect, authorize('admin', 'manager'), getAttendees);
router.delete('/:id', protect, authorize('admin', 'manager'), deleteMeeting);

// Debug endpoint — remove in production
router.get('/debug/zoom-test', protect, authorize('admin'), async (req, res) => {
  try {
    const axios = require('axios');
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
      return res.status(500).json({ success: false, message: 'Zoom env vars missing', accountId: !!accountId, clientId: !!clientId, clientSecret: !!clientSecret });
    }

    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });

    try {
      const tokenRes = await axios.post(tokenUrl, {}, {
        headers: { Authorization: `Basic ${authHeader}` },
        httpsAgent: agent,
      });
      const token = tokenRes.data.access_token;
      return res.json({ success: true, message: 'Zoom token obtained successfully', tokenType: tokenRes.data.token_type, expiresIn: tokenRes.data.expires_in });
    } catch (tokenErr) {
      return res.status(400).json({ success: false, message: 'Zoom token failed', error: tokenErr.response?.data || tokenErr.message });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
