const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo'
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: Date,
  completedAt: Date,
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  budget: { type: Number, default: 0 },
  budgetCurrency: { type: String, default: 'LKR' },
  startDate: Date,
  deadline: Date,
  completedAt: Date,
  progress: { type: Number, default: 0, min: 0, max: 100 },
  tasks: [taskSchema],
  milestones: [{
    title: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date,
  }],
  technologies: [String],
  tags: [String],
  files: [{
    name: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
