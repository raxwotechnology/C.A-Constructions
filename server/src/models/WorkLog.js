const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  hours: { type: Number, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const workLogSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true, default: Date.now },
  tasks: [taskSchema],
  blockers: { type: String },
  totalHours: { type: Number, default: 0 },
  status: { type: String, enum: ['submitted', 'flagged', 'reviewed'], default: 'submitted' },
  comments: [commentSchema],
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }
}, { timestamps: true });

module.exports = mongoose.model('WorkLog', workLogSchema);
