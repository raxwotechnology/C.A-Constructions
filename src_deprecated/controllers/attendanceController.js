const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

exports.markAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, status = 'present', checkIn, checkOut, notes = '' } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: new Date(targetDate.toDateString()) },
      {
        employee: employeeId,
        date: new Date(targetDate.toDateString()),
        status,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        notes,
        markedBy: req.user._id,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, attendance });
  } catch (err) { next(err); }
};

exports.getAttendance = async (req, res, next) => {
  try {
    const { month, year, employeeId } = req.query;
    const query = {};
    if (employeeId) query.employee = employeeId;
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const records = await Attendance.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .sort({ date: -1 });
    res.json({ success: true, count: records.length, records });
  } catch (err) { next(err); }
};

exports.getMyAttendance = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });
    const records = await Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(90);
    res.json({ success: true, records });
  } catch (err) { next(err); }
};
