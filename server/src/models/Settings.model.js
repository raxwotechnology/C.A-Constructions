const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Raxwo Technologies' },
  contactEmail: { type: String, default: 'support@raxwo.com' },
  contactPhone: { type: String, default: '+1 (555) 123-4567' },
  address: { type: String, default: '123 Tech Lane, Innovation City' },
  facebookUrl: { type: String, default: 'https://facebook.com/raxwo' },
  twitterUrl: { type: String, default: 'https://twitter.com/raxwo' },
  linkedinUrl: { type: String, default: 'https://linkedin.com/company/raxwo' },
  instagramUrl: { type: String, default: 'https://instagram.com/raxwo' },
  footerText: { type: String, default: 'Empowering businesses with cutting-edge software solutions.' },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
