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
    budgetUsedPercent: { type: Number, default: 0 },
    costVariance: { type: Number, default: 0 },
    isOverrun: { type: Boolean, default: false },

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

    title: { type: String },
    description: { type: String },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical', 'Low', 'Medium', 'High', 'Critical'],
      default: 'medium'
    },
    budget: { type: Number, default: 0 },
    deadline: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    linkedInvoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    salaryAllocations: [{
      employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      employeeName: { type: String },
      amount: { type: Number, default: 0 },
      commission: { type: Number, default: 0 }
    }],
    documents: [{
      name: String,
      url: String,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedByName: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    links: [{
      label: String,
      url: String
    }],
    notes: [{
      content: String,
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdByName: String,
      createdAt: { type: Date, default: Date.now }
    }],
    paymentStatus: { type: String, default: 'unpaid' },

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
  { timestamps: true, strict: false }
);

projectSchema.pre('validate', function (next) {
  if (this.title && !this.name) {
    this.name = this.title;
  }
  if (this.name && !this.title) {
    this.title = this.name;
  }
  if (!this.name || !String(this.name).trim()) {
    this.name = 'New Project';
  }
  if (!this.title || !String(this.title).trim()) {
    this.title = this.name;
  }
  if (!this.code || !String(this.code).trim()) {
    const prefix = String(this.name || 'PRJ').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRJ') || 'PRJ';
    const suffix = Math.floor(1000 + Math.random() * 9000);
    this.code = `${prefix}-${Date.now().toString().slice(-4)}${suffix.toString().slice(-2)}`;
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
