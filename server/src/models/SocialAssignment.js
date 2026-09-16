const mongoose = require('mongoose');

const socialAssignmentSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['facebook', 'instagram', 'youtube', 'tiktok', 'linkedin', 'all'],
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  note: { type: String, default: '' },
}, { timestamps: true });

// Unique assignment: one employee per platform
socialAssignmentSchema.index({ platform: 1, employee: 1 }, { unique: true });

module.exports = mongoose.model('SocialAssignment', socialAssignmentSchema);
