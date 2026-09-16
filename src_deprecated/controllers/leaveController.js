const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const { createNotification } = require('../services/notificationService');

// @desc    Request leave
// @route   POST /api/leaves
exports.requestLeave = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const { leaveType, startDate, endDate, reason } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({ employee: employee._id, leaveType, startDate: start, endDate: end, days, reason });

    // Notify manager/admin
    const admins = await require('../models/User').find({ role: { $in: ['admin', 'manager'] } });
    const notifications = admins.map(a => ({
      recipient: a._id,
      title: 'New Leave Request',
      message: `${req.user.name} has requested ${days} day(s) of ${leaveType} leave`,
      type: 'leave',
      link: '/admin/leaves'
    }));
    await Notification.insertMany(notifications);

    res.status(201).json({ success: true, leave });
  } catch (err) { next(err); }
};

// @desc    Admin assigns leave directly
// @route   POST /api/leaves/assign
exports.assignLeave = async (req, res, next) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason, remarks } = req.body;
    const employee = await Employee.findById(employeeId).populate('userId', 'name _id');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      employee: employee._id,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason: reason || 'Assigned by admin',
      status: 'approved',
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks,
    });

    await createNotification({
      recipient: employee.userId._id,
      title: 'Leave Assigned',
      message: `Admin assigned you ${days} day(s) of ${leaveType} leave. ${remarks ? 'Remarks: ' + remarks : ''}`,
      type: 'leave',
      link: '/developer/leaves',
    });

    res.status(201).json({ success: true, leave });
  } catch (err) { next(err); }
};

// @desc    Get all leaves (admin/manager)
// @route   GET /api/leaves
exports.getLeaves = async (req, res, next) => {
  try {
    const { status, employee } = req.query;
    let query = {};
    if (status) query.status = status;
    if (employee) query.employee = employee;

    const leaves = await Leave.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar' } })
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, leaves });
  } catch (err) { next(err); }
};

// @desc    Get my leaves
// @route   GET /api/leaves/my
exports.getMyLeaves = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  } catch (err) { next(err); }
};

// @desc    Approve or reject leave
// @route   PUT /api/leaves/:id/status
exports.updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const leave = await Leave.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name _id' } });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

    leave.status = status;
    leave.remarks = remarks;
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    await leave.save();

    // Notify employee
    await createNotification({
      recipient: leave.employee.userId._id,
      title: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `Your ${leave.leaveType} leave request has been ${status}. ${remarks ? 'Remarks: ' + remarks : ''}`,
      type: 'leave',
      link: '/developer/leaves',
    });

    res.json({ success: true, leave });
  } catch (err) { next(err); }
};
