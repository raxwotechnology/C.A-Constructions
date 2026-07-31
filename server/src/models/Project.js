const mongoose = require('mongoose');
const { PROJECT_SERVICE_TYPES } = require('../constants/masterCategories');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    serviceType: {
      type: String,
      required: true,
      default: 'Residential Construction'
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clientName: { type: String, required: true, default: 'Client' },
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    siteSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: { type: String, required: true, default: 'Site' },
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
    startDate: { type: Date, required: true, default: Date.now },
    expectedCompletionDate: { type: Date, required: true, default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
    actualCompletionDate: { type: Date },
    progressPercentage: { type: Number, min: 0, max: 100, default: 0 },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Handover', 'planning', 'active', 'on_hold', 'on hold', 'completed', 'handover'],
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

projectSchema.pre('validate', function (next) {
  if (!this.name || !String(this.name).trim()) {
    this.name = 'New Project';
  }
  if (!this.code || !String(this.code).trim()) {
    const prefix = String(this.name || 'PRJ').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRJ') || 'PRJ';
    const suffix = Math.floor(1000 + Math.random() * 9000);
    this.code = `${prefix}-${Date.now().toString().slice(-4)}${suffix.toString().slice(-2)}`;
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
