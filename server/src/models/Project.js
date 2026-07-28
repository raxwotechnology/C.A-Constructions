const mongoose = require('mongoose');

const salaryAllocationSchema = new mongoose.Schema({
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeName: String,
  role:         { type: String, default: '' },        // Role on this project
  amount:       { type: Number, default: 0 },          // Fixed salary allocation (LKR)
  commission:   { type: Number, default: 0 },          // Commission (LKR)
  commissionPct:{ type: Number, default: 0 },          // Commission % alternative
  paid:         { type: Boolean, default: false },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: String,
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate:     Date,
  completedAt: Date,
  progress:    { type: Number, default: 0, min: 0, max: 100 },
  notes:       { type: String, default: '' },
}, { timestamps: true });

const projectNoteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
}, { timestamps: true });

const projectLinkSchema = new mongoose.Schema({
  label: { type: String, required: true },
  url:   { type: String, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true, timestamps: true });

const projectDocSchema = new mongoose.Schema({
  name:       String,
  url:        String,
  fileType:   String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByName: String,
  uploadedAt: { type: Date, default: Date.now },
});

const projectSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  description:     { type: String, default: '' },
  serviceType: {
    type: String,
    enum: [
      'Earthworks', 'Structural Work', 'MEP (Mechanical, Electrical, Plumbing)',
      'Finishing', 'Material Supply', 'Machinery Rental', 'ERP', 'POS', 'Hosting', 'Website', 'Maintenance', 'Custom', 'Other'
    ],
    default: 'Structural Work'
  },

  // ── Site Location & GPS Geofencing ─────────────────────────────────────
  siteLocation: {
    lat: { type: Number, default: 6.9271 },
    lng: { type: Number, default: 79.8612 },
    address: { type: String, default: '' },
    geofenceRadiusMeter: { type: Number, default: 250 },
  },

  // ── Site Financials & Escrow ───────────────────────────────────────────
  escrowBalance: { type: Number, default: 0 },
  siteExpenses: {
    rawMaterial: { type: Number, default: 0 },
    equipmentRental: { type: Number, default: 0 },
    dailyWagePayroll: { type: Number, default: 0 },
    fuelTransport: { type: Number, default: 0 },
    subcontractorClaims: { type: Number, default: 0 },
    pettyCash: { type: Number, default: 0 },
    extraIncome: { type: Number, default: 0 }
  },

  // ── Variation Change Requests ─────────────────────────────────────────
  variationRequests: [{
    title: { type: String, required: true },
    description: String,
    amount: { type: Number, required: true },
    requestedBy: { type: String, enum: ['client', 'pm', 'supervisor'], default: 'pm' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    approvedAt: Date,
  }],

  // ── Relations ─────────────────────────────────────────────────────────────
  client:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invoice:         { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },   // primary linked invoice
  linkedInvoices:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
  paymentStatus: {
    type: String,
    enum: ['none', 'unpaid', 'partial', 'paid'],
    default: 'none',
  },
  projectManager:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  branch:          { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

  // ── Status & Dates ────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'completed_payment_pending', 'paid_completed', 'overdue', 'cancelled'],
    default: 'planning'
  },
  priority:      { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  startDate:     Date,
  deadline:      Date,
  completedAt:   Date,
  progress:      { type: Number, default: 0, min: 0, max: 100 },

  // ── Financials ────────────────────────────────────────────────────────────
  budget:        { type: Number, default: 0 },
  budgetCurrency:{ type: String, default: 'LKR' },
  salaryAllocations: [salaryAllocationSchema],

  // ── Content ───────────────────────────────────────────────────────────────
  tasks:         [taskSchema],
  milestones:    [{
    title: String, dueDate: Date,
    completed: { type: Boolean, default: false }, completedAt: Date,
    photos: [String],
  }],
  notes:         [projectNoteSchema],
  links:         [projectLinkSchema],
  documents:     [projectDocSchema],
  technologies:  [String],
  tags:          [String],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
