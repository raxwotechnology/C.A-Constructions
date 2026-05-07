const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

exports.markAttendance = async (req, res, next) => {
  try {
    const {
      employeeId, date, status = 'present', checkIn, checkOut, breakTimes = [],
      isHalfDay = false, isFullDay = true, notes = '',
    } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: new Date(targetDate.toDateString()) },
      {
        employee: employeeId,
        date: new Date(targetDate.toDateString()),
        status,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        breakTimes: Array.isArray(breakTimes)
          ? breakTimes.map((b) => ({
            breakIn: b?.breakIn ? new Date(b.breakIn) : undefined,
            breakOut: b?.breakOut ? new Date(b.breakOut) : undefined,
            notes: b?.notes || '',
          }))
          : [],
        isHalfDay: Boolean(isHalfDay),
        isFullDay: Boolean(isFullDay),
        notes,
        markedBy: req.user._id,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, attendance });
  } catch (err) {
    if (err?.code === 11000) {
      try {
        const targetDate = req.body?.date ? new Date(req.body.date) : new Date();
        const attendance = await Attendance.findOneAndUpdate(
          { employee: req.body.employeeId, date: new Date(targetDate.toDateString()) },
          { $set: { ...req.body, date: new Date(targetDate.toDateString()), markedBy: req.user._id } },
          { new: true }
        );
        return res.status(200).json({ success: true, attendance, message: 'Attendance updated for existing day record' });
      } catch (retryErr) {
        return next(retryErr);
      }
    }
    next(err);
  }
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
    const { month, year } = req.query;
    const query = { employee: employee._id };
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const records = await Attendance.find(query).sort({ date: -1 }).limit(180);
    res.json({ success: true, records });
  } catch (err) { next(err); }
};

exports.getAttendanceAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const month = Number(req.query.month || now.getMonth() + 1);
    const year = Number(req.query.year || now.getFullYear());
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await Attendance.find({ date: { $gte: start, $lte: end } })
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email role' } });

    const byStatus = records.reduce((acc, row) => {
      const key = row.isHalfDay ? 'half_day' : row.status;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byEmployee = records.reduce((acc, row) => {
      const empId = String(row.employee?._id || row.employee);
      const name = row.employee?.userId?.name || 'Unknown';
      if (!acc[empId]) acc[empId] = { employeeId: empId, employeeNo: row.employee?.employeeNo || '', name, present: 0, absent: 0, leave: 0, half_day: 0 };
      const key = row.isHalfDay ? 'half_day' : row.status;
      if (acc[empId][key] !== undefined) acc[empId][key] += 1;
      return acc;
    }, {});

    const dailyTrendMap = {};
    records.forEach((row) => {
      const day = new Date(row.date).getDate();
      if (!dailyTrendMap[day]) dailyTrendMap[day] = { day, present: 0, absent: 0, leave: 0, half_day: 0 };
      const key = row.isHalfDay ? 'half_day' : row.status;
      if (dailyTrendMap[day][key] !== undefined) dailyTrendMap[day][key] += 1;
    });

    res.json({
      success: true,
      month,
      year,
      byStatus,
      byEmployee: Object.values(byEmployee).sort((a, b) => (b.present + b.half_day) - (a.present + a.half_day)),
      dailyTrend: Object.values(dailyTrendMap).sort((a, b) => a.day - b.day),
      totalRecords: records.length,
    });
  } catch (err) { next(err); }
};
