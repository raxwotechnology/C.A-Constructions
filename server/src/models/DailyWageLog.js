const mongoose = require('mongoose');

const dailyWageLogSchema = new mongoose.Schema(
  {
    logCode: { type: String, required: true, unique: true, uppercase: true },
    workerName: { type: String, required: true, trim: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    date: { type: Date, default: Date.now, required: true },
    
    workType: {
      type: String,
      enum: ['Daily Wage', 'Sub-Contract'],
      default: 'Daily Wage',
      required: true,
    },
    
    // Daily Wage Details
    skillLevel: {
      type: String,
      enum: ['Skilled Labour / Baas', 'Unskilled Labour / Helper', 'Custom'],
      default: 'Skilled Labour / Baas',
    },
    skillRate: { type: Number, default: 5000 },
    daysWorked: { type: Number, default: 1.0 },
    
    // Overtime
    otHours: { type: Number, default: 0 },
    otRate: { type: Number, default: 0 },
    otPay: { type: Number, default: 0 },
    
    // Allowances
    allowances: {
      foodRefreshments: { type: Number, default: 0 },
      travelTransport: { type: Number, default: 0 },
      nightOutstation: { type: Number, default: 0 },
    },
    totalAllowances: { type: Number, default: 0 },
    
    // Financial Adjustments
    advanceDeductions: { type: Number, default: 0 },
    linkedAdvance: { type: mongoose.Schema.Types.ObjectId, ref: 'Advance' },
    
    // Calculated Net Pay for Daily Wage
    netDailyPay: { type: Number, default: 0 },
    
    // Sub-Contract Details
    subContractDetails: {
      workCategory: {
        type: String,
        enum: ['Tiling', 'Brickwork', 'Painting', 'Plastering', 'Piece-rate', 'Other'],
        default: 'Tiling',
      },
      measuredSqft: { type: Number, default: 0 },
      measuredCubicFeet: { type: Number, default: 0 },
      ratePerSqft: { type: Number, default: 0 },
      totalMeasuredPay: { type: Number, default: 0 },
    },
    subContractPay: { type: Number, default: 0 },
    
    // Site Operating Expense Integration
    mealExpenseAutoLogged: { type: Boolean, default: false },
    financeEntryRef: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceEntry' },
    
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Paid'],
      default: 'Pending',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dailyWageLogSchema.pre('validate', function (next) {
  if (this.workType === 'Daily Wage') {
    const ot = (this.otHours || 0) * (this.otRate || 0);
    this.otPay = ot;
    const food = this.allowances?.foodRefreshments || 0;
    const travel = this.allowances?.travelTransport || 0;
    const night = this.allowances?.nightOutstation || 0;
    this.totalAllowances = food + travel + night;
    const gross = (this.daysWorked || 0) * (this.skillRate || 0) + this.otPay + this.totalAllowances;
    this.netDailyPay = Math.max(0, gross - (this.advanceDeductions || 0));
  } else if (this.workType === 'Sub-Contract') {
    const sqft = this.subContractDetails?.measuredSqft || 0;
    const rate = this.subContractDetails?.ratePerSqft || 0;
    const totalMeasured = sqft * rate;
    if (this.subContractDetails) {
      this.subContractDetails.totalMeasuredPay = totalMeasured;
    }
    this.subContractPay = Math.max(0, totalMeasured - (this.advanceDeductions || 0));
  }
  next();
});

module.exports = mongoose.model('DailyWageLog', dailyWageLogSchema);
