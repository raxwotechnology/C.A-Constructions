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
    const isGuest = !req.user;
    const bookingPayload = {
      ...req.body,
      isGuest,
    };

    if (!isGuest) {
      bookingPayload.client = req.user._id;
    } else {
      if (!req.body.guestName || !req.body.guestEmail) {
        return res.status(400).json({ success: false, message: 'Name and email are required for guest bookings' });
      }
    }

    const booking = await Booking.create(bookingPayload);

    const adminUsers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true }).select('_id');
    const bookerName = isGuest ? req.body.guestName : req.user.name;
    await Promise.all(adminUsers.map((u) => createNotification({
      recipient: u._id,
      title: isGuest ? 'New Guest Booking' : 'New Client Booking',
      message: `${bookerName} submitted a new booking for ${booking.service}.`,
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
    const isGuest = booking.isGuest;
    const clientName = isGuest ? booking.guestName : (booking.client?.name || 'Client');

    const becomingConfirmed =
      req.body.status === 'confirmed' &&
      booking.status === 'confirmed' &&
      !booking.project;

    if (becomingConfirmed) {
      const budget = Number(booking.amount || booking.budget || 0);
      const serviceType = mapBookingServiceToServiceType(booking.service);
      const preferred = booking.preferredDate ? new Date(booking.preferredDate) : undefined;

      const projectPayload = {
        title: `${booking.service} — ${clientName}`,
        description: booking.brief?.trim() || `${booking.service} — confirmed from booking.`,
        serviceType,
        status: 'planning',
        priority: 'medium',
        budget: Number.isFinite(budget) ? budget : 0,
        progress: 0,
        assignedEmployees: [],
        salaryAllocations: [],
      };
      if (clientId) projectPayload.client = clientId;
      if (booking.client?.branch) projectPayload.branch = booking.client.branch;
      if (preferred) projectPayload.startDate = preferred;

      const project = await Project.create(projectPayload);

      booking.project = project._id;
      await booking.save();

      if (clientId) {
        await createNotification({
          recipient: clientId,
          title: 'New Project Created',
          message: `Your project "${project.title}" has been created and is in ${project.status} stage.`,
          type: 'project',
          link: '/my-projects',
        });
      }
    }

    if (clientId) {
      await createNotification({
        recipient: clientId,
        title: 'Booking Updated',
        message: `Your booking for ${booking.service} is now ${booking.status}.`,
        type: 'booking',
        link: '/my-projects',
      });
    }

    const adminUsers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true }).select('_id');
    await Promise.all(adminUsers.map((u) => createNotification({
      recipient: u._id,
      title: 'Booking Status Changed',
      message: `${clientName} booking (${booking.service}) is now ${booking.status}.`,
      type: 'booking',
      link: '/admin/bookings',
    })));

    const bookingOut = await Booking.findById(booking._id)
      .populate('client', 'name email')
      .populate('project', 'title status serviceType');

    res.json({ success: true, booking: bookingOut });
  } catch (err) { next(err); }
};
