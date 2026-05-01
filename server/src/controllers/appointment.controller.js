const { Appointment, Service } = require('../models/Appointment.model');
const User = require('../models/User.model');

// SERVICES
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: services });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: service });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: service });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteService = async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Service deleted' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// APPOINTMENTS
exports.getAppointments = async (req, res) => {
  try {
    const { status, customerId, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (customerId) filter.customer = customerId;
    if (req.user.userType === 'customer') filter.customer = req.user._id;
    if (startDate || endDate) { filter.appointmentDate = {}; if (startDate) filter.appointmentDate.$gte = new Date(startDate); if (endDate) filter.appointmentDate.$lte = new Date(endDate); }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment.find(filter).populate('customer', 'fullName email phone').populate('service', 'name price duration').populate('assignedStaff', 'fullName').skip(skip).limit(parseInt(limit)).sort({ appointmentDate: -1 });
    res.json({ success: true, data: appointments, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createAppointment = async (req, res) => {
  try {
    const customer = req.user.userType === 'customer' ? req.user._id : req.body.customer;
    const service = await Service.findById(req.body.service);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    const customer_data = await User.findById(customer);
    const discount = customer_data?.discount || 0;
    const discountAmount = (service.price * discount) / 100;
    const appointment = await Appointment.create({ ...req.body, customer, totalAmount: service.price, discountApplied: discountAmount, finalAmount: service.price - discountAmount });
    res.status(201).json({ success: true, message: 'Appointment booked', data: appointment });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('customer service assignedStaff');
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: appointment });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled', cancelledAt: new Date(), cancelReason: req.body.reason }, { new: true });
    res.json({ success: true, message: 'Appointment cancelled', data: appointment });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const total = await Appointment.countDocuments();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const today = await Appointment.countDocuments({ appointmentDate: { $gte: todayStart, $lte: todayEnd } });
    res.json({ success: true, data: { byStatus: stats, total, today } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
