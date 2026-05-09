const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const LeavePolicy = require('../models/LeavePolicy');
const Notification = require('../models/Notification');
const { createNotification } = require('../services/notificationService');

// ─── BALANCE TYPES that consume quota ─────────────────────────────────────────
const BALANCE_TYPES = ['annual', 'medical', 'casual', 'half_day', 'short_leave', 'maternity', 'paternity'];

// ─── Get leave year date range ─────────────────────────────────────────────────
function getLeaveYearRange(year = new Date().getFullYear()) {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) };
}

// ─── Get policy quotas for an employee ────────────────────────────────────────
async function getPolicyForEmployee(employee) {
  let policy = null;
  // Try employee-specific policy first
  policy = await LeavePolicy.findOne({ employee: employee._id });
  
  // Try branch-specific policy
  if (!policy && employee.branch) {
    policy = await LeavePolicy.findOne({ branch: employee.branch, employee: { $exists: false }, isDefault: false });
  }
  if (!policy) policy = await LeavePolicy.findOne({ isDefault: true, employee: { $exists: false } });
  return policy;
}

// ─── Calculate balances for each leave type for an employee ───────────────────
async function getEmployeeBalances(employeeId) {
  const employee = await Employee.findById(employeeId);
  const policy = await getPolicyForEmployee(employee);
  const { start, end } = getLeaveYearRange();

  const approvedLeaves = await Leave.find({
    employee: employeeId,
    status: 'approved',
    startDate: { $gte: start, $lte: end }
  });

  const defaultQuotas = {
    annual: 14, medical: 7, casual: 7, half_day: 6, short_leave: 12, maternity: 84, paternity: 3, no_pay: 999
  };

  const balances = {};
  for (const leaveType of BALANCE_TYPES) {
    let quota = defaultQuotas[leaveType] || 0;
    let carryForward = false;
    let requireDocument = leaveType === 'medical';
    let requireReason = leaveType === 'medical';

    if (policy) {
      const q = policy.quotas.find(q => q.leaveType === leaveType);
      if (q) {
        quota = q.quota;
        carryForward = q.carryForward;
        requireDocument = q.requireDocument;
        requireReason = q.requireReason;
      }
    }

    const used = approvedLeaves
      .filter(l => l.leaveType === leaveType)
      .reduce((sum, l) => sum + Number(l.days || 0), 0);

    balances[leaveType] = {
      quota,
      used: parseFloat(used.toFixed(2)),
      remaining: parseFloat(Math.max(0, quota - used).toFixed(2)),
      requireDocument,
      requireReason,
      carryForward,
    };
  }

  return balances;
}

// ─── @route POST /api/leaves ───────────────────────────────────────────────────
exports.requestLeave = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const {
      leaveType, startDate, endDate, reason, halfDayPeriod,
      shortLeaveStart, shortLeaveEnd, shortLeaveDuration
    } = req.body;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;

    // Calculate days
    let days;
    if (leaveType === 'half_day') days = 0.5;
    else if (leaveType === 'short_leave') days = Number(shortLeaveDuration || 1) / 8; // fraction of day
    else days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);

    // Check balance
    const balances = await getEmployeeBalances(employee._id);
    const bal = balances[leaveType];
    let insufficientBalance = false;

    if (bal && BALANCE_TYPES.includes(leaveType)) {
      insufficientBalance = bal.remaining < days;
    }

    // Handle document upload (stored in req.file if uploaded)
    let documentUrl = '';
    if (req.file) documentUrl = `/uploads/documents/${req.file.filename}`;

    const leave = await Leave.create({
      employee: employee._id, leaveType,
      startDate: start, endDate: end,
      days, reason: reason || '',
      halfDayPeriod: leaveType === 'half_day' ? (halfDayPeriod || 'AM') : undefined,
      shortLeaveStart: leaveType === 'short_leave' ? shortLeaveStart : undefined,
      shortLeaveEnd: leaveType === 'short_leave' ? shortLeaveEnd : undefined,
      shortLeaveDuration: leaveType === 'short_leave' ? Number(shortLeaveDuration || 1) : undefined,
      documentUrl,
      insufficientBalance,
    });

    // Notify admins/managers
    const User = require('../models/User');
    const admins = await User.find({ role: { $in: ['admin', 'manager'] } });
    await Notification.insertMany(admins.map(a => ({
      recipient: a._id,
      title: insufficientBalance ? '⚠️ Leave Request (Insufficient Balance)' : 'New Leave Request',
      message: `${req.user.name} requested ${leaveType} leave (${days} day${days !== 1 ? 's' : ''})${insufficientBalance ? ' — INSUFFICIENT BALANCE' : ''}`,
      type: 'leave',
      link: '/admin/leaves',
    })));

    res.status(201).json({ success: true, leave });
  } catch (err) { next(err); }
};

// ─── @route GET /api/leaves/my/balances ───────────────────────────────────────
exports.getMyBalances = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const balances = await getEmployeeBalances(employee._id);
    res.json({ success: true, balances });
  } catch (err) { next(err); }
};

// ─── @route POST /api/leaves/assign ───────────────────────────────────────────
exports.assignLeave = async (req, res, next) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason, remarks } = req.body;
    const employee = await Employee.findById(employeeId).populate('userId', 'name _id');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      employee: employee._id, leaveType,
      startDate: start, endDate: end, days,
      reason: reason || 'Assigned by admin',
      status: 'approved',
      approvedBy: req.user._id, approvedAt: new Date(), remarks,
    });

    await createNotification({
      recipient: employee.userId._id,
      title: 'Leave Assigned',
      message: `Admin assigned you ${days} day(s) of ${leaveType} leave. ${remarks ? 'Remarks: ' + remarks : ''}`,
      type: 'leave', link: '/developer/leaves',
    });

    res.status(201).json({ success: true, leave });
  } catch (err) { next(err); }
};

// ─── @route GET /api/leaves ────────────────────────────────────────────────────
exports.getLeaves = async (req, res, next) => {
  try {
    const { status, employee, branch } = req.query;
    let query = {};
    if (status) query.status = status;
    if (employee) query.employee = employee;

    // Branch filter via employee
    if (branch) {
      const empIds = await Employee.find({ branch }).select('_id');
      query.employee = { $in: empIds.map(e => e._id) };
    }

    const leaves = await Leave.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar' } })
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    // Enrich each leave with balance context
    const enriched = await Promise.all(leaves.map(async (l) => {
      try {
        const empId = l.employee?._id;
        if (!empId) return l.toObject();
        const balances = await getEmployeeBalances(empId);
        const typeBalance = balances[l.leaveType];
        return {
          ...l.toObject(),
          balances,
          typeBalance,
        };
      } catch { return l.toObject(); }
    }));

    res.json({ success: true, count: leaves.length, leaves: enriched });
  } catch (err) { next(err); }
};

// ─── @route GET /api/leaves/my ────────────────────────────────────────────────
exports.getMyLeaves = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const [leaves, balances] = await Promise.all([
      Leave.find({ employee: employee._id })
        .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar' } })
        .sort({ createdAt: -1 }),
      getEmployeeBalances(employee._id)
    ]);

    res.json({ success: true, leaves, balances });
  } catch (err) { next(err); }
};

// ─── @route PUT /api/leaves/:id/status ────────────────────────────────────────
exports.updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, remarks, rejectedReason } = req.body;

    if (status === 'rejected' && !rejectedReason && !remarks) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const leave = await Leave.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name _id' } });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

    leave.status = status;
    leave.remarks = remarks || '';
    leave.rejectedReason = rejectedReason || '';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    await leave.save();

    await createNotification({
      recipient: leave.employee.userId._id,
      title: `Leave ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
      message: `Your ${leave.leaveType.replace('_', ' ')} leave request has been ${status}.${rejectedReason ? ' Reason: ' + rejectedReason : ''}${remarks ? ' Remarks: ' + remarks : ''}`,
      type: 'leave',
      link: `/${leave.employee.userId.role || 'developer'}/leaves`,
    });

    res.json({ success: true, leave });
  } catch (err) { next(err); }
};

// ─── @route GET /api/leaves/policies ──────────────────────────────────────────
exports.getPolicies = async (req, res, next) => {
  try {
    const policies = await LeavePolicy.find()
      .populate('branch', 'name')
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .sort({ isDefault: -1 });
    res.json({ success: true, policies });
  } catch (err) { next(err); }
};

// ─── @route POST /api/leaves/policies ─────────────────────────────────────────
exports.createPolicy = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    if (!payload.employee) payload.employee = undefined;
    if (!payload.branch) payload.branch = undefined;

    // If marking as default, undefault all others (only if not an employee-specific policy)
    if (payload.isDefault && !payload.employee) await LeavePolicy.updateMany({}, { isDefault: false });
    const policy = await LeavePolicy.create(payload);
    res.status(201).json({ success: true, policy });
  } catch (err) { next(err); }
};

// ─── @route PUT /api/leaves/policies/:id ──────────────────────────────────────
exports.updatePolicy = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (!payload.employee) payload.employee = undefined;
    if (!payload.branch) payload.branch = undefined;

    if (payload.isDefault && !payload.employee) await LeavePolicy.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    const policy = await LeavePolicy.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.json({ success: true, policy });
  } catch (err) { next(err); }
};
