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
    // Date range filter
    if (req.query.from || req.query.to) {
      query.startDate = {};
      if (req.query.from) query.startDate.$gte = new Date(req.query.from);
      if (req.query.to) query.startDate.$lte = new Date(req.query.to + 'T23:59:59');
    }
    const loans = await Loan.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email _id' } })
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: loans.length, loans });
  } catch (err) { next(err); }
};

// GET /api/loans/employee-summary/:employeeId — show salary/advance/loan info before creating
exports.getEmployeeLoanSummary = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.employeeId).populate('userId', 'name email');
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const Advance = require('../models/Advance');
    const advances = await Advance.find({ employee: req.params.employeeId, status: 'active' });
    const activeLoans = await Loan.find({ employee: req.params.employeeId, status: 'active' });

    const totalAdvanceBalance = advances.reduce((s, a) => s + (a.outstandingBalance || 0), 0);
    const totalLoanBalance = activeLoans.reduce((s, l) => s + (l.outstandingBalance || 0), 0);
    const totalMonthlyLoanDeductions = activeLoans.reduce((s, l) => s + (l.monthlyInstallment || 0), 0);

    res.json({
      success: true,
      summary: {
        name: emp.userId?.name,
        employeeNo: emp.employeeNo,
        basicSalary: emp.basicSalary || 0,
        allowances: emp.allowances || 0,
        totalAdvanceBalance,
        totalLoanBalance,
        totalMonthlyLoanDeductions,
        activeLoansCount: activeLoans.length,
        activeLoans: activeLoans.map(l => ({
          _id: l._id,
          totalAmount: l.totalAmount,
          outstandingBalance: l.outstandingBalance,
          monthlyInstallment: l.monthlyInstallment,
          reason: l.reason,
        })),
      }
    });
  } catch (err) { next(err); }
};

// POST /api/loans
exports.createLoan = async (req, res, next) => {
  try {
    const { employeeId, totalAmount, monthlyInstallment, startDate, reason, deductionType, taxRate } = req.body;
    const total = Number(totalAmount);
    const monthly = Number(monthlyInstallment);
    const totalInstallments = monthly > 0 ? Math.ceil(total / monthly) : 0;
    const taxAmt = total * (Number(taxRate || 0) / 100);

    const loan = await Loan.create({
      employee: employeeId,
      totalAmount: total,
      outstandingBalance: total,
      monthlyInstallment: monthly,
      totalInstallments,
      startDate: startDate ? new Date(startDate) : new Date(),
      reason,
      deductionType: deductionType || 'salary',
      taxRate: Number(taxRate || 0),
      taxAmount: taxAmt,
      recordedBy: req.user._id,
    });

    const emp = await Employee.findByIdAndUpdate(
      employeeId,
      { $inc: { loanBalance: total } },
      { new: true }
    ).populate('userId', 'name _id');

    if (emp?.userId?._id) {
      await createNotification({
        recipient: emp.userId._id,
        title: 'Loan Approved & Recorded',
        message: `A loan of LKR ${total.toLocaleString()} has been recorded. Monthly installment: LKR ${monthly.toLocaleString()} for ${totalInstallments} months. Deduction type: ${deductionType || 'salary'}.`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    res.status(201).json({ success: true, loan });
  } catch (err) { next(err); }
};

// PUT /api/loans/:id — edit a loan (only active loans)
exports.updateLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.status === 'cleared') return res.status(400).json({ success: false, message: 'Cannot edit a cleared loan' });

    const { monthlyInstallment, reason, deductionType, taxRate, startDate } = req.body;
    if (monthlyInstallment !== undefined) loan.monthlyInstallment = Number(monthlyInstallment);
    if (reason !== undefined) loan.reason = reason;
    if (deductionType !== undefined) loan.deductionType = deductionType;
    if (taxRate !== undefined) {
      loan.taxRate = Number(taxRate);
      loan.taxAmount = loan.totalAmount * (Number(taxRate) / 100);
    }
    if (startDate !== undefined) loan.startDate = new Date(startDate);
    loan.totalInstallments = loan.monthlyInstallment > 0 ? Math.ceil(loan.totalAmount / loan.monthlyInstallment) : 0;
    await loan.save();
    await loan.populate({ path: 'employee', populate: { path: 'userId', select: 'name email _id' } });
    res.json({ success: true, loan });
  } catch (err) { next(err); }
};

// POST /api/loans/:id/pay
exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, date, note, payrollId, method } = req.body;
    const loan = await Loan.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name _id' } });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const payAmt = Number(amount);
    loan.payments.push({ amount: payAmt, date: date || new Date(), payrollId, note, method: method || 'salary_deduction' });
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
