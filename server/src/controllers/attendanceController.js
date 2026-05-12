const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Helper: get start of today as a Date
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: resolve employee from userId (for employee self-service routes)
const resolveEmployee = async (userId) => {
  const emp = await Employee.findOne({ userId });
  return emp || null;
};

// Helper: get employee IDs by branch
const getEmpIds = async (branchId) => {
  if (!branchId) return null;
  const emps = await Employee.find({ branch: branchId }).select('_id');
  return emps.map(e => e._id);
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / MANAGER — full mark / overwrite attendance for any employee
// POST /api/attendance
// ─────────────────────────────────────────────────────────────────────────────
exports.markAttendance = async (req, res, next) => {
  try {
    const {
      employeeId, date, status = 'present', checkIn, checkOut, breakTimes = [],
      isHalfDay = false, isFullDay = true, otHours = 0, otAmount = 0, notes = '',
    } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const update = {
      employee: employeeId,
      date: targetDate,
      status,
      isHalfDay: Boolean(isHalfDay),
      isFullDay: Boolean(isFullDay),
      otHours: Number(otHours),
      otAmount: Number(otAmount),
      notes,
      markedBy: req.user._id,
      ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : null }),
      ...(checkOut !== undefined && { checkOut: checkOut ? new Date(checkOut) : null }),
      ...(Array.isArray(breakTimes) && {
        breakTimes: breakTimes.map((b) => ({
          breakIn: b?.breakIn ? new Date(b.breakIn) : undefined,
          breakOut: b?.breakOut ? new Date(b.breakOut) : undefined,
          notes: b?.notes || '',
        })),
      }),
    };

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: targetDate },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, attendance });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SELF-SERVICE — Clock In (today only)
// POST /api/attendance/clock-in
// ─────────────────────────────────────────────────────────────────────────────
exports.clockIn = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user._id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const today = todayStart();
    const now = new Date();

    // Check if already clocked in today
    const existing = await Attendance.findOne({ employee: employee._id, date: today });
    if (existing?.checkIn) {
      return res.status(400).json({ success: false, message: 'You have already clocked in today' });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: today },
      {
        $set: {
          employee: employee._id,
          date: today,
          checkIn: now,
          status: 'present',
          markedBy: req.user._id,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, attendance, message: 'Clocked in successfully' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SELF-SERVICE — Clock Out (today only)
// POST /api/attendance/clock-out
// ─────────────────────────────────────────────────────────────────────────────
exports.clockOut = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user._id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const today = todayStart();
    const now = new Date();

    const existing = await Attendance.findOne({ employee: employee._id, date: today });
    if (!existing) {
      return res.status(400).json({ success: false, message: 'You have not clocked in today' });
    }
    if (!existing.checkIn) {
      return res.status(400).json({ success: false, message: 'Cannot clock out without clocking in first' });
    }
    if (existing.checkOut) {
      return res.status(400).json({ success: false, message: 'You have already clocked out today' });
    }

    // Calculate worked hours
    const workedMs = now - new Date(existing.checkIn);
    const totalBreakMs = (existing.breakTimes || []).reduce((acc, b) => {
      if (b.breakIn && b.breakOut) return acc + (new Date(b.breakOut) - new Date(b.breakIn));
      return acc;
    }, 0);
    const netWorkedMs = Math.max(0, workedMs - totalBreakMs);
    const totalWorkedHours = parseFloat((netWorkedMs / 3600000).toFixed(2));

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: today },
      { $set: { checkOut: now, totalWorkedHours, markedBy: req.user._id } },
      { new: true }
    );
    res.status(200).json({ success: true, attendance, message: 'Clocked out successfully' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SELF-SERVICE — Start Break
// POST /api/attendance/break/start
// ─────────────────────────────────────────────────────────────────────────────
exports.startBreak = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user._id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const today = todayStart();
    const existing = await Attendance.findOne({ employee: employee._id, date: today });
    if (!existing?.checkIn) {
      return res.status(400).json({ success: false, message: 'You must clock in before starting a break' });
    }
    // Check if there's an open break already
    const openBreak = (existing.breakTimes || []).find((b) => b.breakIn && !b.breakOut);
    if (openBreak) {
      return res.status(400).json({ success: false, message: 'A break is already in progress' });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: today },
      { $push: { breakTimes: { breakIn: new Date(), notes: req.body.notes || '' } } },
      { new: true }
    );
    res.status(200).json({ success: true, attendance, message: 'Break started' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SELF-SERVICE — End Break
// POST /api/attendance/break/end
// ─────────────────────────────────────────────────────────────────────────────
exports.endBreak = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user._id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const today = todayStart();
    const existing = await Attendance.findOne({ employee: employee._id, date: today });
    if (!existing) return res.status(404).json({ success: false, message: 'No attendance record for today' });

    const openIdx = (existing.breakTimes || []).findIndex((b) => b.breakIn && !b.breakOut);
    if (openIdx === -1) {
      return res.status(400).json({ success: false, message: 'No active break to end' });
    }

    const fieldPath = `breakTimes.${openIdx}.breakOut`;
    const attendance = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: today },
      { $set: { [fieldPath]: new Date() } },
      { new: true }
    );
    res.status(200).json({ success: true, attendance, message: 'Break ended' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE — Get today's attendance record
// GET /api/attendance/today
// ─────────────────────────────────────────────────────────────────────────────
exports.getToday = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user._id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const today = todayStart();
    const record = await Attendance.findOne({ employee: employee._id, date: today });
    res.json({ success: true, record: record || null });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE — Get own attendance history
// GET /api/attendance/my
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyAttendance = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req.user._id);
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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / MANAGER — Get all attendance records
// GET /api/attendance
// ─────────────────────────────────────────────────────────────────────────────
exports.getAttendance = async (req, res, next) => {
  try {
    const { month, year, employeeId, status, startDate, endDate, branch } = req.query;
    const query = {};
    if (employeeId) {
      query.employee = employeeId;
    } else if (branch) {
      const empIds = await getEmpIds(branch);
      if (empIds) query.employee = { $in: empIds };
    }

    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.date.$lte = e; }
    } else if (month && year) {
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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / MANAGER — Update a specific record
// PUT /api/attendance/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.updateAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, markedBy: req.user._id } },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, attendance: record });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN / MANAGER — Analytics
// GET /api/attendance/analytics
// ─────────────────────────────────────────────────────────────────────────────
exports.getAttendanceAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const month = Number(req.query.month || now.getMonth() + 1);
    const year = Number(req.query.year || now.getFullYear());
    const { branch } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const query = { date: { $gte: start, $lte: end } };
    if (branch) {
      const empIds = await getEmpIds(branch);
      if (empIds) query.employee = { $in: empIds };
    }

    const records = await Attendance.find(query)
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
      success: true, month, year, byStatus,
      byEmployee: Object.values(byEmployee).sort((a, b) => (b.present + b.half_day) - (a.present + a.half_day)),
      dailyTrend: Object.values(dailyTrendMap).sort((a, b) => a.day - b.day),
      totalRecords: records.length,
    });
  } catch (err) { next(err); }
};
