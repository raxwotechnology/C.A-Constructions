const mongoose = require('mongoose');

const requestItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  category: { type: String, default: 'Materials' },
  requestedQty: { type: Number, required: true, min: 1 },
  unit: { type: String, default: 'Bags' },
  currentStockQty: { type: Number, default: 0 },
});

const materialRequestSchema = new mongoose.Schema(
  {
    requestNo: { type: String, required: true, unique: true, uppercase: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    siteName: { type: String, default: '' },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supervisorName: { type: String, default: '' },
    items: [requestItemSchema],
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'fulfilled'],
      default: 'pending',
    },
    notes: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MaterialRequest', materialRequestSchema);
