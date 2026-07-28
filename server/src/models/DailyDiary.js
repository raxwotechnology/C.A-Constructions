const mongoose = require('mongoose');

const dailyDiarySchema = new mongoose.Schema({
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  date: { type: Date, required: true },
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // 12 Interactive Sections
  s1_attendanceSummary: {
    engineers: { type: Number, default: 0 },
    supervisors: { type: Number, default: 0 },
    skilledLabours: { type: Number, default: 0 },
    unskilledLabours: { type: Number, default: 0 },
    subcontractorWorkers: { type: Number, default: 0 },
    notes: String,
  },
  s2_materialsReceivedUsed: [{
    material: String,
    receivedQty: Number,
    usedQty: Number,
    unit: String,
  }],
  s3_machineryEquipment: [{
    machineName: String,
    hoursOperated: Number,
    hoursIdle: Number,
    status: { type: String, enum: ['operational', 'breakdown', 'maintenance', 'idle'], default: 'operational' },
  }],
  s4_weather: {
    condition: { type: String, enum: ['sunny', 'cloudy', 'rainy', 'heavy_rain', 'storm'], default: 'sunny' },
    temperatureC: { type: Number, default: 32 },
    workStoppageHours: { type: Number, default: 0 },
    impactNote: String,
  },
  s5_incidentsAccidents: [{
    severity: { type: String, enum: ['minor', 'near_miss', 'serious', 'critical'], default: 'minor' },
    description: String,
    actionTaken: String,
  }],
  s6_workProgressMilestones: [{
    activity: String,
    locationSection: String,
    progressPercentage: Number,
  }],
  s7_delaysObstructions: [{
    cause: String,
    delayHours: Number,
    mitigationPlan: String,
  }],
  s8_siteVisitors: [{
    name: String,
    designationOrganization: String,
    purpose: String,
  }],
  s9_progressPhotos: [String],
  s10_qualityInspections: [{
    inspectionType: String,
    result: { type: String, enum: ['passed', 'failed', 'conditional'], default: 'passed' },
    remarks: String,
  }],
  s11_subcontractorWork: [{
    subcontractorName: String,
    workScope: String,
    completionPercentage: Number,
  }],
  s12_supervisorRemarksSignature: {
    remarks: String,
    signedAt: Date,
    supervisorName: String,
  },

  isOfflineSynced: { type: Boolean, default: false },
}, { timestamps: true });

dailyDiarySchema.index({ site: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyDiary', dailyDiarySchema);
