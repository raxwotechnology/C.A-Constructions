const Booking = require('../models/Booking');
const Project = require('../models/Project');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

/** Maps free-text booking.service to Project.serviceType enum */
function mapBookingServiceToServiceType(service = '') {
  const s = String(service).toLowerCase();
  const pairs = [
    ['erp', 'ERP'],
    ['pos', 'POS'],
    ['hosting', 'Hosting'],
    ['website', 'Website'],
    ['web', 'Website'],
    ['maintenance', 'Maintenance'],
    ['custom', 'Custom'],
  ];
  for (const [needle, label] of pairs) {
    if (s.includes(needle)) return label;
  }
  return 'Other';
}

exports.createBooking = async (req, res, next) => {
  try {
    const booking = await Booking.create({
      ...req.body,
      client: req.user._id,
    });

    const adminUsers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true }).select('_id');
    await Promise.all(adminUsers.map((u) => createNotification({
      recipient: u._id,
      title: 'New Client Booking',
      message: `${req.user.name} submitted a new booking for ${booking.service}.`,
      type: 'booking',
      link: '/admin/bookings',
    })));

    res.status(201).json({ success: true, booking });
  } catch (err) { next(err); }
};

exports.getBookings = async (req, res, next) => {
  try {
    const query = req.user.role === 'client' ? { client: req.user._id } : {};
    const bookings = await Booking.find(query)
      .populate('client', 'name email')
      .populate('project', 'title status serviceType')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('client', 'name email branch');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const clientId = booking.client?._id || booking.client;
    const becomingConfirmed =
      req.body.status === 'confirmed' &&
      booking.status === 'confirmed' &&
      !booking.project;

    if (becomingConfirmed) {
      const budget = Number(booking.amount || booking.budget || 0);
      const serviceType = mapBookingServiceToServiceType(booking.service);
      const preferred = booking.preferredDate ? new Date(booking.preferredDate) : undefined;

      const projectPayload = {
        title: `${booking.service} — ${booking.client?.name || 'Client'}`,
        description: booking.brief?.trim() || `${booking.service} — confirmed from booking.`,
        client: clientId,
        serviceType,
        status: 'planning',
        priority: 'medium',
        budget: Number.isFinite(budget) ? budget : 0,
        progress: 0,
        assignedEmployees: [],
        salaryAllocations: [],
      };
      if (booking.client?.branch) projectPayload.branch = booking.client.branch;
      if (preferred) projectPayload.startDate = preferred;

      const project = await Project.create(projectPayload);

      booking.project = project._id;
      await booking.save();

      await createNotification({
        recipient: clientId,
        title: 'New Project Created',
        message: `Your project "${project.title}" has been created and is in ${project.status} stage.`,
        type: 'project',
        link: '/my-projects',
      });
    }

    await createNotification({
      recipient: clientId,
      title: 'Booking Updated',
      message: `Your booking for ${booking.service} is now ${booking.status}.`,
      type: 'booking',
      link: '/my-projects',
    });

    const adminUsers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true }).select('_id');
    await Promise.all(adminUsers.map((u) => createNotification({
      recipient: u._id,
      title: 'Booking Status Changed',
      message: `${booking.client?.name || 'Client'} booking (${booking.service}) is now ${booking.status}.`,
      type: 'booking',
      link: '/admin/bookings',
    })));

    const bookingOut = await Booking.findById(booking._id)
      .populate('client', 'name email')
      .populate('project', 'title status serviceType');

    res.json({ success: true, booking: bookingOut });
  } catch (err) { next(err); }
};
