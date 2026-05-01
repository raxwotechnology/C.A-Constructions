const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  completedDate: { type: Date },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue'], default: 'pending' },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const progressLogSchema = new mongoose.Schema({
  logDate: { type: Date, required: true },
  progressPercentage: { type: Number, required: true, min: 0, max: 100 },
  notes: { type: String },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  projectType: {
    type: String,
    enum: ['web_development', 'mobile_app', 'api_development', 'design', 'testing', 'maintenance', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: { type: Date },
  expectedEndDate: { type: Date },
  actualEndDate: { type: Date },
  aiPredictedEndDate: { type: Date },
  aiConfidenceScore: { type: Number, default: 0 },
  budget: { type: Number, default: 0 },
  clientName: { type: String },
  milestones: [milestoneSchema],
  progressLogs: [progressLogSchema],
  tags: [{ type: String }],
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
