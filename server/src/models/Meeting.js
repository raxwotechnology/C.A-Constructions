const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  startTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  agenda: { type: String },
  zoomMeetingId: { type: String, required: true },
  startUrl: { type: String, required: true },
  joinUrl: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['upcoming', 'active', 'ended', 'inactive'], default: 'upcoming' },
  provider: { type: String, enum: ['zoom', 'jitsi'], default: 'zoom' },
  meetingType: { type: String, enum: ['internal', 'client'], default: 'internal' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
