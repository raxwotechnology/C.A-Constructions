const Booking = require('../models/Booking');
const Project = require('../models/Project');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

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
      .populate('project', 'title status')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('client', 'name email');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (req.body.status === 'confirmed' && !booking.project) {
      const project = await Project.create({
        title: `${booking.service} - ${booking.client.name}`,
        description: booking.brief || `${booking.service} booking`,
        client: booking.client._id,
        status: 'planning',
        priority: 'medium',
        budget: booking.amount || booking.budget || 0,
        progress: 0,
      });
      booking.project = project._id;
      await booking.save();
    }

    await createNotification({
      recipient: booking.client._id,
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

    res.json({ success: true, booking });
  } catch (err) { next(err); }
};
