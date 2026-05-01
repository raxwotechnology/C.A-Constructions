const Attendance = require('../models/Attendance.model');
const User = require('../models/User.model');

exports.clockIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await Attendance.findOne({ employee: req.user._id, date: today });
    if (existing && existing.clockIn) return res.status(400).json({ success: false, message: 'Already clocked in today' });

    const { isWFH, location, typingPattern, mousePattern, deviceFingerprint } = req.body;
    let attendance;
    if (existing) {
      Object.assign(existing, { clockIn: new Date(), isWFH: isWFH || false, location, typingPattern, mousePattern, deviceFingerprint });
      attendance = await existing.save();
    } else {
      attendance = await Attendance.create({ employee: req.user._id, date: today, clockIn: new Date(), status: 'present', isWFH: isWFH || false, location, typingPattern, mousePattern, deviceFingerprint });
    }
    res.status(201).json({ success: true, message: 'Clocked in successfully', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.clockOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ employee: req.user._id, date: today });
    if (!attendance || !attendance.clockIn) return res.status(400).json({ success: false, message: 'Not clocked in today' });
    if (attendance.clockOut) return res.status(400).json({ success: false, message: 'Already clocked out' });

    attendance.clockOut = new Date();
    const diffMs = attendance.clockOut - attendance.clockIn;
    attendance.hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    if (attendance.hoursWorked > 8) attendance.overtimeHours = Math.round((attendance.hoursWorked - 8) * 100) / 100;
    await attendance.save();
    res.json({ success: true, message: 'Clocked out successfully', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getToday = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ employee: req.user._id, date: today });
    res.json({ success: true, data: attendance || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (req.user.userType !== 'admin') filter.employee = req.user._id;
    else if (employeeId) filter.employee = employeeId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter).populate('employee', 'fullName employeeId photo userType').skip(skip).limit(parseInt(limit)).sort({ date: -1 });
    res.json({ success: true, data: records, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('employee', 'fullName employeeId');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const d = new Date();
    const targetMonth = parseInt(month) || d.getMonth() + 1;
    const targetYear = parseInt(year) || d.getFullYear();
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);
    const filter = { date: { $gte: startDate, $lte: endDate } };
    if (req.user.userType !== 'admin') filter.employee = req.user._id;
    const stats = await Attendance.aggregate([{ $match: filter }, { $group: { _id: { employee: '$employee', status: '$status' }, count: { $sum: 1 }, totalHours: { $sum: '$hoursWorked' } } }]);
    res.json({ success: true, data: stats, month: targetMonth, year: targetYear });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addScreenshot = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No screenshot uploaded' });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ employee: req.user._id, date: today });
    if (!attendance) return res.status(404).json({ success: false, message: 'No attendance record for today' });
    attendance.screenshots.push(`screenshots/${req.file.filename}`);
    await attendance.save();
    res.json({ success: true, message: 'Screenshot uploaded', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
