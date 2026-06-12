const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Employee = require('../models/Employee');
const { createNotification } = require('../services/notificationService');
const { createAuditLog } = require('./auditController');
const { isLedgerBankMethod, appendBankTransaction } = require('../utils/bankLedger');
const {
  monthYearFromDate,
  attachSyncResult,
  syncAllRelevantPayrollsForEmployee,
  pickPrimarySyncResult,
} = require('../utils/payrollSyncHook');

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
    const activeLoans = await Loan.find({
      employee: req.params.employeeId,
      status: 'active',
      $or: [
        { deductionType: 'salary' },
        { deductionType: { $exists: false } },
        { deductionType: null },
        { deductionType: '' },
      ],
      payrollDeductionPaused: { $ne: true },
    });

    const totalAdvanceBalance = advances.reduce((s, a) => s + (a.outstandingBalance || 0), 0);
    const suggestedAdvanceDeduction = advances.reduce((s, a) => {
      const due = Math.min(Number(a.monthlyDeduction || 0) || Number(a.outstandingBalance || 0), Number(a.outstandingBalance || 0));
      return sum + due;
    }, 0);
    const totalLoanBalance = activeLoans.reduce((s, l) => s + (l.outstandingBalance || 0), 0);
    const totalMonthlyLoanDeductions = activeLoans.reduce((s, l) => sum + (l.monthlyInstallment || 0), 0);

    res.json({
      success: true,
      summary: {
        name: emp.userId?.name,
        employeeNo: emp.employeeNo,
        basicSalary: emp.basicSalary || 0,
        allowances: emp.allowances || 0,
        totalAdvanceBalance,
        suggestedAdvanceDeduction,
        activeAdvancesCount: advances.length,
        activeAdvances: advances.map((a) => ({
          _id: a._id,
          amount: a.amount,
          outstandingBalance: a.outstandingBalance,
          monthlyDeduction: a.monthlyDeduction,
          reason: a.reason,
        })),
        totalLoanBalance,
        totalMonthlyLoanDeductions,
        activeLoansCount: activeLoans.length,
        activeLoans: activeLoans.map((l) => ({
          _id: l._id,
          totalAmount: l.totalAmount,
          outstandingBalance: l.outstandingBalance,
          monthlyInstallment: l.monthlyInstallment,
          deductionType: l.deductionType,
          installmentsPaid: l.installmentsPaid || 0,
          totalInstallments: l.totalInstallments || 0,
          remainingMonths: Math.max(0, (l.totalInstallments || 0) - (l.installmentsPaid || 0)),
          reason: l.reason,
        })),
      }
    });
  } catch (err) { next(err); }
};

// POST /api/loans
exports.createLoan = async (req, res, next) => {
  try {
    const { employeeId, totalAmount, monthlyInstallment, startDate, reason, deductionType, deductFromSalary, taxRate, repaymentMonths } = req.body;
    const resolvedDeductionType = deductFromSalary === false ? 'separate' : (deductionType || (deductFromSalary !== false ? 'salary' : 'separate'));
    const principal = Number(totalAmount);
    const months    = Number(repaymentMonths || 0);
    const rate      = Number(taxRate || 0);
    
    // Interest calculation: Simple interest on principal
    const interestAmt = Math.round(principal * (rate / 100));
    const finalTotal  = principal + interestAmt;
    
    let finalMonthly = Number(monthlyInstallment || 0);
    let finalInstallments = months;

    if (months > 0 && !monthlyInstallment) {
      finalMonthly = Math.ceil(finalTotal / months);
    } else if (finalMonthly > 0 && months === 0) {
      finalInstallments = Math.ceil(finalTotal / finalMonthly);
    }

    const loan = await Loan.create({
      employee: employeeId,
      totalAmount: finalTotal,
      outstandingBalance: finalTotal,
      monthlyInstallment: finalMonthly,
      repaymentMonths: months,
      totalInstallments: finalInstallments,
      startDate: startDate ? new Date(startDate) : new Date(),
      reason,
      deductionType: resolvedDeductionType,
      taxRate: rate,
      taxAmount: interestAmt,
      recordedBy: req.user._id,
    });

    const emp = await Employee.findByIdAndUpdate(
      employeeId,
      { $inc: { loanBalance: finalTotal } },
      { new: true }
    ).populate('userId', 'name _id');

    if (emp?.userId?._id) {
      await createNotification({
        recipient: emp.userId._id,
        title: 'Loan Approved & Recorded',
        message: `A loan of LKR ${finalTotal.toLocaleString()} has been recorded. Monthly installment: LKR ${finalMonthly.toLocaleString()} for ${finalInstallments} months. Deduction type: ${deductionType || 'salary'}.`,
        type: 'payroll',
        link: '/developer/payslips',
      });
    }

    await createAuditLog({
      user: req.user, action: 'create', module: 'loans', entityId: loan._id, entityName: `Loan for employee ${employeeId}`,
      description: `Recorded a loan of LKR ${finalTotal.toLocaleString()} for employee ${employeeId}`,
    });

    const period = monthYearFromDate(loan.startDate);
    const syncResults = await syncAllRelevantPayrollsForEmployee(employeeId, {
      source: 'loan',
      module: 'loans',
      entityId: loan._id,
      reason: 'Loan created',
      user: req.user,
      extraPeriods: [period],
    });

    res.status(201).json(attachSyncResult({ success: true, loan }, syncResults));
  } catch (err) { next(err); }
};

// PUT /api/loans/:id — edit a loan (only active loans)
exports.updateLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.status === 'cleared') return res.status(400).json({ success: false, message: 'Cannot edit a cleared loan' });

    const { monthlyInstallment, reason, deductionType, taxRate, startDate, repaymentMonths } = req.body;
    
    if (reason !== undefined) loan.reason = reason;
    if (deductionType !== undefined) loan.deductionType = deductionType;
    if (startDate !== undefined) loan.startDate = new Date(startDate);

    // If amounts/months change, recalculate
    const hasTaxChange    = taxRate !== undefined && Number(taxRate) !== loan.taxRate;
    const hasMonthChange  = repaymentMonths !== undefined;
    const hasMonthlyChange = monthlyInstallment !== undefined;

    if (hasTaxChange) {
      // Recalculate interest based on original principal
      const principal = loan.totalAmount - (loan.taxAmount || 0);
      loan.taxRate = Number(taxRate);
      loan.taxAmount = Math.round(principal * (loan.taxRate / 100));
      
      const prevTotal = loan.totalAmount;
      loan.totalAmount = principal + loan.taxAmount;
      loan.outstandingBalance += (loan.totalAmount - prevTotal);
    }

    if (hasMonthChange) loan.repaymentMonths = Number(repaymentMonths);
    if (hasMonthlyChange) loan.monthlyInstallment = Number(monthlyInstallment);

    if (loan.repaymentMonths > 0 && !hasMonthlyChange) {
      loan.monthlyInstallment = Math.ceil(loan.totalAmount / loan.repaymentMonths);
      loan.totalInstallments = loan.repaymentMonths;
    } else if (loan.monthlyInstallment > 0) {
      loan.totalInstallments = Math.ceil(loan.totalAmount / loan.monthlyInstallment);
    }

    await loan.save();
    await loan.populate({ path: 'employee', populate: { path: 'userId', select: 'name email _id' } });
    
    await createAuditLog({
      user: req.user, action: 'update', module: 'loans', entityId: loan._id, entityName: `Loan updated`,
      description: `Updated terms for loan ${loan._id}`,
    });

    const period = monthYearFromDate(loan.startDate);
    const empId = loan.employee?._id || loan.employee;
    const syncResults = await syncAllRelevantPayrollsForEmployee(empId, {
      source: 'loan',
      module: 'loans',
      entityId: loan._id,
      reason: 'Loan updated',
      user: req.user,
      extraPeriods: [period],
    });

    res.json(attachSyncResult({ success: true, loan }, syncResults));
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
    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    const payMethod = method || 'salary_deduction';
    let bankAccount = req.body.bankAccount;
    if (bankAccount && !mongoose.Types.ObjectId.isValid(String(bankAccount))) {
      return res.status(400).json({ success: false, message: 'Invalid bank account' });
    }
    if (!isLedgerBankMethod(payMethod)) bankAccount = undefined;
    if (isLedgerBankMethod(payMethod) && !bankAccount) {
      return res.status(400).json({ success: false, message: 'Bank account is required for this payment method' });
    }

    if (payrollId) {
      const dup = (loan.payments || []).some((p) => String(p.payrollId) === String(payrollId));
      if (dup) {
        return res.status(400).json({ success: false, message: 'This installment was already recorded for this payroll' });
      }
    }

    const isManual = payMethod !== 'salary_deduction';
    loan.payments.push({
      amount: payAmt,
      date: date || new Date(),
      payrollId: payrollId || undefined,
      installmentNo: (loan.installmentsPaid || 0) + 1,
      deductionSource: payrollId ? 'payroll' : 'manual',
      note,
      method: payMethod,
      ...(bankAccount ? { bankAccount } : {}),
    });
    loan.totalPaid = (loan.totalPaid || 0) + payAmt;
    loan.installmentsPaid = (loan.installmentsPaid || 0) + 1;
    loan.outstandingBalance = Math.max(0, loan.totalAmount - loan.totalPaid);
    const justCleared = loan.outstandingBalance === 0;
    if (justCleared) loan.status = 'cleared';
    await loan.save();

    await Employee.findByIdAndUpdate(loan.employee._id || loan.employee, { $inc: { loanBalance: -payAmt } });

    if (bankAccount && isLedgerBankMethod(payMethod)) {
      await appendBankTransaction(bankAccount, {
        type: 'deposit',
        amount: payAmt,
        description: `Loan Repayment: ${loan.employee?.userId?.name || 'Employee'}`,
        date: date || new Date(),
        moduleSource: 'loans',
        sourceType: 'Loan',
        sourceId: loan._id,
        referenceId: `LOAN-PAY-${loan._id}`,
        recordedBy: req.user._id,
      });
    }

    await createAuditLog({
      user: req.user, action: 'update', module: 'loans', entityId: loan._id, entityName: `Loan Payment`,
      description: `Recorded payment of LKR ${payAmt.toLocaleString()} for loan ${loan._id}`,
    });

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

    const payDate = date || new Date();
    const period = monthYearFromDate(payDate);
    const empId = loan.employee._id || loan.employee;
    const syncResults = await syncAllRelevantPayrollsForEmployee(empId, {
      source: 'loan',
      module: 'loans',
      entityId: loan._id,
      reason: 'Manual loan payment recorded',
      user: req.user,
      extraPeriods: [period],
    });

    res.json(attachSyncResult({ success: true, loan }, syncResults));
  } catch (err) { next(err); }
};

// DELETE /api/loans/:id
exports.deleteLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Not found' });

    const { postsToBankLedger, parseLedgerDate } = require('../utils/paymentMethods');
    for (const payment of loan.payments || []) {
      if (payment.bankAccount && postsToBankLedger(payment.method)) {
        await appendBankTransaction(payment.bankAccount, {
          type: 'withdrawal',
          amount: payment.amount,
          description: `Loan payment reversal (deleted loan) — installment ${payment.installmentNo || ''}`,
          date: parseLedgerDate(payment.date),
          referenceId: `LOAN-REV-${loan._id}-${payment._id || payment.installmentNo}`,
          moduleSource: 'loans',
          sourceType: 'Loan',
          sourceId: loan._id,
          recordedBy: req.user?._id,
          paymentMethod: payment.method,
        });
      }
    }

    await Employee.findByIdAndUpdate(loan.employee, { $inc: { loanBalance: -loan.outstandingBalance } });
    await createAuditLog({
      user: req.user, action: 'delete', module: 'loans', entityId: loan._id, entityName: `Loan deleted`,
      description: `Deleted loan ${loan._id} (outstanding was LKR ${loan.outstandingBalance.toLocaleString()})`,
    });
    const empId = loan.employee;
    await loan.deleteOne();
    const syncResults = await syncAllRelevantPayrollsForEmployee(empId, {
      source: 'loan',
      module: 'loans',
      entityId: req.params.id,
      reason: 'Loan deleted',
      user: req.user,
    });
    res.json(attachSyncResult({ success: true, message: 'Loan deleted' }, syncResults));
  } catch (err) { next(err); }
};
