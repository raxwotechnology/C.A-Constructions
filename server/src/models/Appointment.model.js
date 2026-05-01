const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, default: 60 }, // in minutes
  price: { type: Number, required: true },
  category: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const appointmentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true },
  duration: { type: Number, default: 60 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  notes: { type: String },
  totalAmount: { type: Number, default: 0 },
  discountApplied: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  cancelledAt: { type: Date },
  cancelReason: { type: String },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = {
  Service: mongoose.model('Service', serviceSchema),
  Appointment: mongoose.model('Appointment', appointmentSchema)
};
