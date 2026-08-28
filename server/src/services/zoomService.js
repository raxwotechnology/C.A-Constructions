const axios = require('axios');

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

async function getZoomAccessToken() {
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`;
  const authHeader = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  
  const response = await axios.post(tokenUrl, {}, {
    headers: {
      Authorization: `Basic ${authHeader}`
    }
  });
  return response.data.access_token;
}

exports.createZoomMeeting = async (topic, startTime, duration, agenda) => {
  const token = await getZoomAccessToken();
  const response = await axios.post('https://api.zoom.us/v2/users/me/meetings', {
    topic,
    type: 2, // Scheduled meeting
    start_time: startTime,
    duration,
    agenda,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: true,
      mute_upon_entry: true,
      waiting_room: false
    }
  }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

exports.getZoomMeeting = async (meetingId) => {
  const token = await getZoomAccessToken();
  const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

exports.getZoomMeetingParticipants = async (meetingId) => {
  const token = await getZoomAccessToken();
  try {
    const response = await axios.get(`https://api.zoom.us/v2/report/meetings/${meetingId}/participants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.participants || [];
  } catch (err) {
    // If meeting hasn't started or no report available, Zoom API returns 404 or 400
    return [];
  }
};

exports.deleteZoomMeeting = async (meetingId) => {
  const token = await getZoomAccessToken();
  await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
