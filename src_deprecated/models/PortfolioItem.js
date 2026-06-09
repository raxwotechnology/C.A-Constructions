const mongoose = require('mongoose');

const portfolioItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  technologies: [{ type: String }],
  result: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  colorFrom: { type: String, default: '#3b82f6' },
  colorTo: { type: String, default: '#1d4ed8' },
  caseStudyUrl: { type: String, default: '' },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('PortfolioItem', portfolioItemSchema);

