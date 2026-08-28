const mongoose = require('mongoose');

const dailyDiarySchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    date: { type: Date, default: Date.now, required: true },
    weather: { type: String, enum: ['Sunny', 'Rainy', 'Cloudy', 'Stormy'], default: 'Sunny' },
    siteSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Labor Attendance Breakdown
    labourAttendance: [
      {
        workerType: { type: String, enum: ['Mason', 'Helper', 'Carpenter', 'Bar Bender', 'Electrician', 'Plumber', 'Unskilled'], required: true },
        count: { type: Number, default: 0 },
        regularHours: { type: Number, default: 8 },
        otHours: { type: Number, default: 0 }
      }
    ],

    // Material Requisitions & Usage (MIN)
    materialUsage: [
      {
        materialName: { type: String, required: true },
        quantityUsed: { type: Number, required: true },
        unit: { type: String, required: true }
      }
    ],

    // Machinery & Heavy Plant Hours
    machineryUsage: [
      {
        machineName: { type: String, required: true }, // e.g. "JCB Excavator 01"
        hoursWorked: { type: Number, required: true },
        fuelConsumedLiters: { type: Number, default: 0 }
      }
    ],

    // Work Completed / Daily Progress Notes
    workCompletedSummary: { type: String, required: true },

    // HSE Safety Incident Logs
    hseIncidents: [
      {
        severity: { type: String, enum: ['Near Miss', 'Minor', 'Major', 'Critical'], default: 'Near Miss' },
        description: { type: String, required: true },
        actionTaken: { type: String }
      }
    ],

    inspectorLogs: { type: String },
    approvedByManager: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyDiary', dailyDiarySchema);
