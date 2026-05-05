const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    default: 'full-time'
  },
  location: { type: String, default: 'Colombo, Sri Lanka' },
  description: { type: String, required: true },
  requirements: [String],
  skills: [String],
  salaryRange: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'LKR' }
  },
  deadline: Date,
  status: {
    type: String,
    enum: ['open', 'closed', 'draft'],
    default: 'open'
  },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicantCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
