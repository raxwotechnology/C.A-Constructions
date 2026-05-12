const mongoose = require('mongoose');

const agreementTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    agreementType: { type: String, default: 'custom' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AgreementTemplate', agreementTemplateSchema);
