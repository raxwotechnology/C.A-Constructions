const Notification = require('../models/Notification.model');
const User = require('../models/User.model');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch db notifications specific to the user or broadcast
    const notifications = await Notification.find({
      $or: [{ userId }, { userId: null }]
    }).sort({ createdAt: -1 }).lean();

    // Dynamically calculate birthdays for today
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const birthdayUsers = await User.find({
      isActive: true,
      dateOfBirth: { $ne: null }
    }).select('fullName dateOfBirth userType');

    const dynamicBirthdays = birthdayUsers.filter(u => {
      const dob = new Date(u.dateOfBirth);
      return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
    }).map(u => ({
      _id: `bd-${u._id}`,
      title: 'Birthday Alert! 🎉',
      message: `Today is ${u.fullName}'s birthday! Wish them a great day.`,
      type: 'birthday',
      isRead: false,
      createdAt: new Date(),
    }));

    // Combine them
    const allNotifications = [...dynamicBirthdays, ...notifications];

    res.json({ success: true, data: allNotifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const id = req.params.id;
    if (id.startsWith('bd-')) {
      return res.json({ success: true, message: 'Dynamic notification acknowledged' });
    }
    await Notification.findByIdAndUpdate(id, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
