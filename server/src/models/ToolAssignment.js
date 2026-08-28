const mongoose = require('mongoose');

const toolAssignmentSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  toolName: { type: String, required: true, trim: true },
  toolType: {
    type: String,
    enum: ['design', 'development', 'marketing', 'communication', 'ai', 'project_management', 'other'],
    default: 'other',
  },
  accountEmail: { type: String, default: '' },
  accountPassword: { type: String, default: '' }, // Store encrypted or as admin note
  accessUrl: { type: String, default: '' },
  licenseKey: { type: String, default: '' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'revoked', 'pending'], default: 'active' },
  notes: { type: String, default: '' },
  expiresAt: { type: Date },
  revokedAt: { type: Date },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ToolAssignment', toolAssignmentSchema);
