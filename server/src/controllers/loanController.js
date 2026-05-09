const Loan = require('../models/Loan');
const Employee = require('../models/Employee');
const { createNotification } = require('../services/notificationService');

// GET /api/loans
exports.getLoans = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    } else if (req.query.branch) {
      const emps = await Employee.find({ branch: req.query.branch }).select('_id');
      query.employee = { $in: emps.map(e => e._id) };
    }
    if (req.query.status) query.status = req.query.status;
    const loans = await Loan.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email _id' } })
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: loans.length, loans });
  } catch (err) { next(err); }
};

// POST /api/loans
exports.createLoan = async (req, res, next) => {
  try {
    const { employeeId, totalAmount, monthlyInstallment, startDate, reason } = req.body;
    const total = Number(totalAmount);
    const monthly = Number(monthlyInstallment);
    const totalInstallments = monthly > 0 ? Math.ceil(total / monthly) : 0;

    const loan = await Loan.create({
      employee: employeeId,
      totalAmount: total,
      outstandingBalance: total,
      monthlyInstallment: monthly,
      totalInstallments,
      startDate: startDate ? new Date(startDate) : new Date(),
      reason,
      recordedBy: req.user._id,
    });

    const emp = await Employee.findByIdAndUpdate(
      employeeId,
      { $inc: { loanBalance: total } },
      { new: true }
    ).populate('userId', 'name _id');

    // Notify employee
    if (emp?.userId?._id) {
      await createNotification({
        recipient: emp.userId._id,
        title: 'Loan Approved & Recorded',
        message: `A loan of LKR ${total.toLocaleString()} has been recorded. Monthly installment: LKR ${monthly.toLocaleString()} for ${totalInstallments} months.`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    res.status(201).json({ success: true, loan });
  } catch (err) { next(err); }
};

// POST /api/loans/:id/pay
exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, date, note, payrollId } = req.body;
    const loan = await Loan.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name _id' } });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const payAmt = Number(amount);
    loan.payments.push({ amount: payAmt, date: date || new Date(), payrollId, note });
    loan.totalPaid = (loan.totalPaid || 0) + payAmt;
    loan.installmentsPaid = (loan.installmentsPaid || 0) + 1;
    loan.outstandingBalance = Math.max(0, loan.totalAmount - loan.totalPaid);
    const justCleared = loan.outstandingBalance === 0;
    if (justCleared) loan.status = 'cleared';
    await loan.save();

    await Employee.findByIdAndUpdate(loan.employee._id || loan.employee, { $inc: { loanBalance: -payAmt } });

    // Notify employee
    const recipientId = loan.employee?.userId?._id;
    if (recipientId) {
      await createNotification({
        recipient: recipientId,
        title: justCleared ? 'Loan Fully Repaid ✅' : 'Loan Payment Recorded',
        message: justCleared
          ? `Your loan of LKR ${loan.totalAmount.toLocaleString()} has been fully repaid. Congratulations!`
          : `Loan payment of LKR ${payAmt.toLocaleString()} recorded (installment ${loan.installmentsPaid}/${loan.totalInstallments}). Outstanding: LKR ${loan.outstandingBalance.toLocaleString()}.`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    res.json({ success: true, loan });
  } catch (err) { next(err); }
};

// DELETE /api/loans/:id
exports.deleteLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Not found' });
    // Reverse outstanding balance from employee
    await Employee.findByIdAndUpdate(loan.employee, { $inc: { loanBalance: -loan.outstandingBalance } });
    await loan.deleteOne();
    res.json({ success: true, message: 'Loan deleted' });
  } catch (err) { next(err); }
};
