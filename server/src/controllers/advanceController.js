const Advance = require('../models/Advance');
const Employee = require('../models/Employee');
const { createNotification } = require('../services/notificationService');

// GET /api/advances
exports.getAdvances = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    } else if (req.query.branch) {
      const emps = await Employee.find({ branch: req.query.branch }).select('_id');
      query.employee = { $in: emps.map(e => e._id) };
    }
    if (req.query.status) query.status = req.query.status;
    const advances = await Advance.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email _id' } })
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: advances.length, advances });
  } catch (err) { next(err); }
};

// POST /api/advances
exports.createAdvance = async (req, res, next) => {
  try {
    const { employeeId, amount, date, reason, repaymentType, installments } = req.body;
    const amt = Number(amount);
    const inst = Number(installments) || 1;

    const advance = await Advance.create({
      employee: employeeId,
      amount: amt,
      outstandingBalance: amt,
      date: date || new Date(),
      reason,
      repaymentType: repaymentType || 'lump_sum',
      installments: inst,
      monthlyDeduction: repaymentType === 'installments' && inst > 1 ? Math.ceil(amt / inst) : 0,
      recordedBy: req.user._id,
    });

    // Update employee advanceBalance
    const emp = await Employee.findByIdAndUpdate(
      employeeId,
      { $inc: { advanceBalance: amt } },
      { new: true }
    ).populate('userId', 'name _id');

    // Notify employee
    if (emp?.userId?._id) {
      await createNotification({
        recipient: emp.userId._id,
        title: 'Advance Payment Recorded',
        message: `An advance of LKR ${amt.toLocaleString()} has been recorded on your account. ${repaymentType === 'installments' ? `Monthly deduction: LKR ${Math.ceil(amt / inst).toLocaleString()} for ${inst} months.` : 'To be recovered as lump sum.'}`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    res.status(201).json({ success: true, advance });
  } catch (err) { next(err); }
};

// POST /api/advances/:id/repay
exports.recordRepayment = async (req, res, next) => {
  try {
    const { amount, date, note, payrollId } = req.body;
    const advance = await Advance.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name _id' } });
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });

    const repayAmt = Number(amount);
    advance.repayments.push({ amount: repayAmt, date: date || new Date(), payrollId, note });
    advance.totalRecovered = (advance.totalRecovered || 0) + repayAmt;
    advance.outstandingBalance = Math.max(0, advance.amount - advance.totalRecovered);
    const justCleared = advance.outstandingBalance === 0;
    if (justCleared) advance.status = 'cleared';
    await advance.save();

    // Reduce employee advanceBalance
    await Employee.findByIdAndUpdate(advance.employee._id || advance.employee, { $inc: { advanceBalance: -repayAmt } });

    // Notify employee
    const recipientId = advance.employee?.userId?._id;
    if (recipientId) {
      await createNotification({
        recipient: recipientId,
        title: justCleared ? 'Advance Fully Cleared ✅' : 'Advance Repayment Recorded',
        message: justCleared
          ? `Your advance of LKR ${advance.amount.toLocaleString()} has been fully cleared.`
          : `Advance repayment of LKR ${repayAmt.toLocaleString()} recorded. Outstanding: LKR ${advance.outstandingBalance.toLocaleString()}.`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    res.json({ success: true, advance });
  } catch (err) { next(err); }
};

// DELETE /api/advances/:id
exports.deleteAdvance = async (req, res, next) => {
  try {
    const advance = await Advance.findById(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Not found' });
    // Reverse employee balance
    await Employee.findByIdAndUpdate(advance.employee, { $inc: { advanceBalance: -advance.outstandingBalance } });
    await advance.deleteOne();
    res.json({ success: true, message: 'Advance deleted' });
  } catch (err) { next(err); }
};
