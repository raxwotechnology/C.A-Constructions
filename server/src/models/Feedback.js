const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String },
  email: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  rating: { type: Number, min: 1, max: 5, required: true },
  message: { type: String, required: true, trim: true },
  response: { type: String, default: '' },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'new', 'reviewed', 'resolved'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
