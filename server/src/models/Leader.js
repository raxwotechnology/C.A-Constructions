const mongoose = require('mongoose');

const leaderSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  role:     { type: String, required: true, trim: true },
  dept:     { type: String, required: true, trim: true },
  initials: { type: String, default: '' },
  color:    { type: String, default: 'bg-blue-500' },
  imageUrl: { type: String, default: '' },
  active:   { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Leader', leaderSchema);
