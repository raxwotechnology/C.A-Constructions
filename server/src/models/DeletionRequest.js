const mongoose = require('mongoose');

const deletionRequestSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByName: { type: String, required: true },
    userRole: { type: String, required: true },
    module: { type: String, required: true }, // e.g., 'Invoice', 'Expense', 'Progress Log', 'Worker Detail', 'Quotation', 'Asset', 'Project'
    entityId: { type: String, required: true },
    entityName: { type: String, required: true },
    reason: { type: String, default: 'Deletion requested by manager/staff.' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeletionRequest', deletionRequestSchema);
