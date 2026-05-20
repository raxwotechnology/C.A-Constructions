const mongoose = require('mongoose');

const letterTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, default: 'custom' },
    category: { type: String, default: 'General', trim: true },
    description: { type: String, trim: true, default: '' },
    content: { type: String, default: '' },
    structuredData: { type: mongoose.Schema.Types.Mixed, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LetterTemplate', letterTemplateSchema);
