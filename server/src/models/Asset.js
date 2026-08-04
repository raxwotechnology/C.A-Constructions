const mongoose = require('mongoose');
const { ASSET_CATEGORIES } = require('../constants/masterCategories');

const assetSchema = new mongoose.Schema(
  {
    assetCode: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ASSET_CATEGORIES,
      required: true
    },
    registrationNumber: { type: String }, // e.g. "WP LA-4589" or "JCB-892"
    assignedDriverOrOperator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    assetValue: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    
    // Status & Meter Readings
    status: { type: String, enum: ['Operational', 'Under Service', 'Breakdown', 'Idle'], default: 'Operational' },
    currentOdometerKm: { type: Number, default: 0 },
    currentEngineHours: { type: Number, default: 0 },
    
    // Fuel Consumption Records
    fuelLog: [
      {
        date: { type: Date, default: Date.now },
        litersAdded: { type: Number, required: true },
        costPerLiter: { type: Number, required: true },
        totalCost: { type: Number, required: true },
        meterReading: { type: Number, required: true }
      }
    ],

    // Maintenance & Expiry Reminders
    revenueLicenseExpiry: { type: Date },
    insuranceExpiry: { type: Date },
    lastServiceDate: { type: Date },
    nextServiceDueKmOrHours: { type: Number },
    maintenanceHistory: [
      {
        serviceDate: { type: Date, default: Date.now },
        serviceDetails: { type: String, required: true },
        cost: { type: Number, default: 0 },
        vendor: { type: String }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);
