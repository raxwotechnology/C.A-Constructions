const mongoose = require('mongoose');
const { PROJECT_SERVICE_TYPES } = require('../constants/masterCategories');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    serviceType: {
      type: String,
      enum: PROJECT_SERVICE_TYPES.map(t => t.labelEn),
      required: true
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clientName: { type: String, required: true },
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    siteSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: { type: String, required: true },
    contractStandard: { type: String, default: 'SBD-03' },
    
    // Financial Tracking (Budget vs Actual)
    contractValue: { type: Number, required: true, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    retentionPercentage: { type: Number, default: 5 },
    retentionAmount: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    totalBilled: { type: Number, default: 0 },
    totalCollected: { type: Number, default: 0 },

    // Sqft & Cubic Feet Measurements
    sqftArea: { type: Number, default: 0 },
    cubicFeetArea: { type: Number, default: 0 },

    // Income vs Expense Tracking & Net Profit/Loss
    totalIncome: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    netProfitLoss: { type: Number, default: 0 },

    // Timeline & Progress
    startDate: { type: Date, required: true },
    expectedCompletionDate: { type: Date, required: true },
    actualCompletionDate: { type: Date },
    progressPercentage: { type: Number, min: 0, max: 100, default: 0 },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Handover'],
      default: 'Planning'
    },

    // Galleries & Snag Lists
    sitePhotoGallery: [
      {
        url: { type: String },
        caption: { type: String },
        tag: { type: String, enum: ['Foundation', 'Structure', 'Roofing', 'Finishing', 'MEP', 'Safety', 'General'] },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    handoverSnagList: [
      {
        item: { type: String, required: true },
        location: { type: String },
        severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
        status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
