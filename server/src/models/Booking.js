const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isGuest: { type: Boolean, default: false },
  guestName: { type: String },
  guestEmail: { type: String },
  guestPhone: { type: String },
  service: { type: String, required: true, trim: true },
  brief: { type: String, default: '' },
  preferredDate: Date,
  budget: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid',
  },
  amount: { type: Number, default: 0 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
