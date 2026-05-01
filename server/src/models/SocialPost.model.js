const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  platform: {
    type: [String],
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'],
    default: ['instagram']
  },
  media: [{ type: String }],
  status: { type: String, enum: ['draft', 'scheduled', 'published', 'failed'], default: 'draft' },
  scheduledAt: { type: Date },
  publishedAt: { type: Date },
  hashtags: [{ type: String }],
  aiGenerated: { type: Boolean, default: false },
  engagementScore: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SocialPost', socialPostSchema);
