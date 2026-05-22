const Meeting = require('../models/Meeting');
const { createZoomMeeting, getZoomMeetingParticipants, deleteZoomMeeting } = require('../services/zoomService');
const crypto = require('crypto');

// Generate a unique Jitsi Meet room ID as fallback
function generateJitsiLink(topic) {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
  const uid = crypto.randomBytes(4).toString('hex');
  const room = `raxwo-${slug}-${uid}`;
  return {
    id: `jitsi-${uid}`,
    join_url: `https://meet.jit.si/${room}`,
    start_url: `https://meet.jit.si/${room}#config.startWithVideoMuted=false`,
    provider: 'jitsi'
  };
}

exports.createMeeting = async (req, res, next) => {
  try {
    const { topic, startTime, duration, agenda } = req.body;

    if (!topic || !startTime || !duration) {
      return res.status(400).json({ success: false, message: 'Topic, start time, and duration are required' });
    }

    // Convert datetime-local value to proper ISO format
    const isoStartTime = new Date(startTime).toISOString();

    let meetingData = null;
    let provider = 'zoom';

    // Try Zoom first
    try {
      const zoomResponse = await createZoomMeeting(topic, isoStartTime, Number(duration), agenda);
      meetingData = {
        id: String(zoomResponse.id),
        join_url: zoomResponse.join_url,
        start_url: zoomResponse.start_url,
        provider: 'zoom'
      };
      console.log('[Meetings] ✅ Zoom meeting created:', zoomResponse.id);
    } catch (zoomErr) {
      const zoomErrData = zoomErr.response?.data;
      console.warn('[Meetings] ⚠️ Zoom failed, falling back to Jitsi Meet:', zoomErrData?.message || zoomErr.message);
      meetingData = generateJitsiLink(topic);
      provider = 'jitsi';
    }

    // Create DB record
    const meeting = await Meeting.create({
      topic,
      startTime: isoStartTime,
      duration: Number(duration),
      agenda,
      zoomMeetingId: meetingData.id,
      startUrl: meetingData.start_url,
      joinUrl: meetingData.join_url,
      provider,
      createdBy: req.user._id,
      status: 'upcoming'
    });

    const providerMsg = provider === 'jitsi'
      ? ' (Zoom unavailable — using Jitsi Meet. Update Zoom credentials in .env to enable Zoom.)'
      : '';

    res.status(201).json({
      success: true,
      meeting,
      provider,
      notice: providerMsg || undefined
    });
  } catch (err) { next(err); }
};

exports.getMeetings = async (req, res, next) => {
  try {
    const meetings = await Meeting.find().sort({ startTime: -1 }).populate('createdBy', 'name');

    const now = new Date();

    const formatted = meetings.map(m => {
      const start = new Date(m.startTime);
      const end = new Date(start.getTime() + m.duration * 60000);
      let dynamicStatus = m.status;

      if (m.status !== 'inactive' && m.status !== 'ended') {
        if (now < start) {
          dynamicStatus = 'upcoming';
        } else if (now >= start && now <= end) {
          dynamicStatus = 'active';
        } else {
          dynamicStatus = 'ended';
        }
      }

      return {
        ...m.toObject(),
        status: dynamicStatus
      };
    });

    res.json({ success: true, meetings: formatted });
  } catch (err) { next(err); }
};

exports.getAttendees = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    // Only Zoom meetings have attendee reports
    if (meeting.provider === 'jitsi' || !meeting.zoomMeetingId.startsWith('jitsi-') === false) {
      return res.json({ success: true, participants: [], notice: 'Attendee reports only available for Zoom meetings.' });
    }

    const participants = await getZoomMeetingParticipants(meeting.zoomMeetingId);
    res.json({ success: true, participants });
  } catch (err) { next(err); }
};

exports.deleteMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    // Only try to delete from Zoom if it was a Zoom meeting
    if (meeting.provider !== 'jitsi' && !String(meeting.zoomMeetingId).startsWith('jitsi-')) {
      try {
        await deleteZoomMeeting(meeting.zoomMeetingId);
      } catch(e) {
        console.log('[Meetings] Zoom meeting delete error (safe to ignore):', e.message);
      }
    }

    meeting.status = 'inactive';
    await meeting.save();

    res.json({ success: true, message: 'Meeting deleted' });
  } catch (err) { next(err); }
};
