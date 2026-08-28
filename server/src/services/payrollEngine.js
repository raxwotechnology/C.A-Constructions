/**
 * Central Payroll Recalculation & Financial Synchronization Engine
 *
 * All salary-related changes should call triggerPayrollSync() so draft/reviewed
 * payroll rows stay accurate without manual refresh.
 */

const mongoose = require('mongoose');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Overtime = require('../models/Overtime');
const Loan = require('../models/Loan');
const Advance = require('../models/Advance');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');
const BonusTarget = require('../models/BonusTarget');
const PayrollRecalcLog = require('../models/PayrollRecalcLog');
const PayrollAdjustment = require('../models/PayrollAdjustment');
const IncomeTaxRecord = require('../models/IncomeTaxRecord');
const AuditLog = require('../models/AuditLog');
const { getStatutoryRates } = require('../utils/statutoryRates');
const { calculateMonthlyIncomeTax } = require('./incomeTaxService');

const COMMISSION_RATE = Number(process.env.PAYROLL_COMMISSION_RATE || 0.05);
const AUTO_RECALC_STATUSES = ['draft', 'reviewed'];
const LOCKED_STATUSES = ['approved'];
const PAID_STATUS = 'paid';

const monthRange = (month, year) => ({
  start: new Date(Number(year), Number(month) - 1, 1),
  end: new Date(Number(year), Number(month), 0, 23, 59, 59, 999),
});

function monthYearFromDate(date) {
  const d = date ? new Date(date) : new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function payrollSnapshotSummary(doc) {
  if (!doc) return null;
  return {
    basicSalary: doc.basicSalary,
    grossSalary: doc.grossSalary,
    netSalary: doc.netSalary,
    overtime: doc.overtime,
    bonus: doc.bonus,
    commissions: doc.commissions,
    advanceDeduction: doc.advanceDeduction,
    loanDeduction: doc.loanDeduction,
    leaveDeduction: doc.leaveDeduction,
    incomeTaxDeduction: doc.incomeTaxDeduction,
    epfEmployee: doc.epfEmployee,
    status: doc.status,
  };
}

async function computeAutoCommission(employee, month, year) {
  const userId = employee.userId?._id || employee.userId;
  const { start, end } = monthRange(month, year);
  const completedProjects = await Project.find({
    status: 'completed',
    completedAt: { $gte: start, $lte: end },
    assignedEmployees: userId,
  }).select('title budget assignedEmployees');
  const autoCommission = completedProjects.reduce((sum, project) => {
    const members = Math.max((project.assignedEmployees || []).length, 1);
    const pool = Number(project.budget || 0) * COMMISSION_RATE;
    return sum + (pool / members);
  }, 0);
  return autoCommission;
}

async function computeProjectAllocations(employee, month, year) {
  const employeeId = employee._id;
  const userId = employee.userId?._id || employee.userId;
  const { end } = monthRange(month, year);
  const projects = await Project.find({
    $or: [
      { assignedEmployees: userId },
      { 'salaryAllocations.employee': employeeId },
    ],
    status: { $in: ['active', 'completed', 'on_hold'] },
    startDate: { $lte: end },
  }).select('title salaryAllocations');

  let projectSalaryAlloc = 0;
  let projectCommissionAlloc = 0;
  const projectLines = [];

  projects.forEach((proj) => {
    const alloc = (proj.salaryAllocations || []).find((a) => String(a.employee) === String(employeeId));
    if (!alloc) return;
    const sal = Number(alloc.amount || 0);
    const comm = Number(alloc.commission || 0);
    projectSalaryAlloc += sal;
    projectCommissionAlloc += comm;
    if (comm > 0) {
      projectLines.push({ project: proj._id, projectName: proj.title, amount: comm, type: 'commission' });
    }
    if (sal > 0) {
      projectLines.push({ project: proj._id, projectName: proj.title, amount: sal, type: 'salary' });
    }
  });

  return { projectSalaryAlloc, projectCommissionAlloc, projectLines };
}

/** Payroll month is on or after the loan start month */
function loanActiveForPayrollMonth(loan, month, year) {
  if (!loan.startDate) return true;
  const start = new Date(loan.startDate);
  if (Number.isNaN(start.getTime())) return true;
  const payrollMonthStart = new Date(Number(year), Number(month) - 1, 1);
  const loanMonthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  return payrollMonthStart >= loanMonthStart;
}

/** Loan installment due for payroll month — skip if already paid this month (manual or payroll) */
function loanInstallmentForMonth(loan, month, year) {
  if (loan.status !== 'active') return 0;
  if (loan.deductionType !== 'salary' || loan.payrollDeductionPaused) return 0;
  if (!loanActiveForPayrollMonth(loan, month, year)) return 0;

  const { start, end } = monthRange(month, year);
  const paidThisMonth = (loan.payments || []).reduce((sum, p) => {
    const d = new Date(p.date);
    if (d >= start && d <= end) return sum + Number(p.amount || 0);
    return sum;
  }, 0);

  const installment = Number(loan.monthlyInstallment || 0);
  const outstanding = Number(loan.outstandingBalance || 0);
  if (outstanding <= 0) return 0;

  if (paidThisMonth >= installment - 0.01) return 0;
  return Math.min(installment, outstanding - paidThisMonth);
}

const SALARY_LOAN_QUERY = {
  $or: [
    { deductionType: 'salary' },
    { deductionType: { $exists: false } },
    { deductionType: null },
    { deductionType: '' },
  ],
};

async function computeLoanDeductions(employeeId, month, year) {
  const empFilter = mongoose.Types.ObjectId.isValid(String(employeeId))
    ? new mongoose.Types.ObjectId(String(employeeId))
    : employeeId;
  const loans = await Loan.find({
    employee: empFilter,
    status: 'active',
    ...SALARY_LOAN_QUERY,
    payrollDeductionPaused: { $ne: true },
  });
  let total = 0;
  const deductedLoans = [];
  loans.forEach((loan) => {
    const due = loanInstallmentForMonth(loan, month, year);
    if (due > 0) {
      total += due;
      deductedLoans.push(loan._id);
    }
  });
  return { loanDeduction: total, deductedLoans };
}

async function computeAdvanceDeductions(employeeId) {
  const advances = await Advance.find({ employee: employeeId, status: 'active' });
  let total = 0;
  const deductedAdvances = [];
  advances.forEach((a) => {
    const due = Math.min(
      Number(a.monthlyDeduction || 0) || Number(a.outstandingBalance || 0),
      Number(a.outstandingBalance || 0),
    );
    if (due > 0) {
      total += due;
      deductedAdvances.push(a._id);
    }
  });
  return { advanceDeduction: total, deductedAdvances };
}

async function computeOvertime(employeeId, month, year) {
  const rows = await Overtime.find({ employee: employeeId, month, year });
  const overtime = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const otHours = rows.reduce((s, r) => s + Number(r.hours || 0), 0);
  return { overtime, otHours, otPay: overtime };
}

async function computeTargetBonuses(employeeId, month, year) {
  const { start, end } = monthRange(month, year);
  const targets = await BonusTarget.find({
    employee: employeeId,
    status: 'achieved',
    achievedAt: { $gte: start, $lte: end },
  });
  return targets.reduce((s, t) => s + Number(t.bonusAmount || 0), 0);
}

async function computeAttendanceDeductions(employee, month, year) {
  const { start, end } = monthRange(month, year);
  const records = await Attendance.find({
    employee: employee._id,
    date: { $gte: start, $lte: end },
    status: { $in: ['absent', 'leave', 'late'] },
  });

  const basic = Number(employee.basicSalary || 0);
  const dailyRate = basic / 30;

  let leaveDays = 0;
  let lateCount = 0;
  records.forEach((r) => {
    if (r.status === 'late') lateCount += 1;
    if (r.status === 'absent' || r.status === 'leave') {
      leaveDays += r.isHalfDay ? 0.5 : 1;
    }
  });

  const leaveDeduction = Math.round(leaveDays * dailyRate);
  const penaltyDeduction = Math.round(lateCount * dailyRate * 0.25);

  return { leaveDeduction, leaveDeductionDays: leaveDays, penaltyDeduction, lateCount };
}

/**
 * Build a full payroll payload from live financial data (single source of truth).
 */
async function computePayrollSnapshot(employeeId, month, year, overrides = {}) {
  const employee = await Employee.findById(employeeId).populate('userId', 'name email');
  if (!employee) throw new Error('Employee not found');

  const m = Number(month);
  const y = Number(year);
  const basicSalary = Number(employee.basicSalary || 0);
  const baseAllowances = Number(employee.allowances || 0);

  const { projectSalaryAlloc, projectCommissionAlloc, projectLines } = await computeProjectAllocations(employee, m, y);
  const autoCommission = await computeAutoCommission(employee, m, y);
  const manualCommissions = Number(overrides.commissions || 0);
  const totalCommissions = manualCommissions + autoCommission + projectCommissionAlloc;

  const { overtime: autoOvertime, otHours } = await computeOvertime(employeeId, m, y);
  const finalOvertime = autoOvertime + (overrides.overtime !== undefined ? Number(overrides.overtime) : 0);

  const targetBonus = await computeTargetBonuses(employeeId, m, y);
  const bonus = Number(overrides.bonus ?? 0) + targetBonus;

  const { loanDeduction, deductedLoans } = await computeLoanDeductions(employeeId, m, y);
  const { advanceDeduction, deductedAdvances } = await computeAdvanceDeductions(employeeId);
  const { leaveDeduction, leaveDeductionDays, penaltyDeduction } = await computeAttendanceDeductions(employee, m, y);

  const otherDeductionsManual = Number(overrides.deductions || 0);
  const allowances = baseAllowances + Number(overrides.allowances || 0) + projectSalaryAlloc;
  const incentives = Number(overrides.incentives || 0);

  const totalAdditions = basicSalary + allowances + finalOvertime + totalCommissions + bonus + incentives;
  const grossSalary = totalAdditions;

  const taxCalc = await calculateMonthlyIncomeTax(employee, m, y, grossSalary);
  const incomeTaxDeduction = Number(taxCalc.taxAmount || 0);

  const { fractions: R } = await getStatutoryRates();
  const epfEmployee = employee.epfEtfEnrolled ? Math.round(basicSalary * R.epfEmployee) : 0;
  const epfEmployer = employee.epfEtfEnrolled ? Math.round(basicSalary * R.epfEmployer) : 0;
  const etfEmployer = employee.epfEtfEnrolled ? Math.round(basicSalary * R.etfEmployer) : 0;

  const totalDeductions =
    otherDeductionsManual +
    advanceDeduction +
    loanDeduction +
    leaveDeduction +
    penaltyDeduction +
    epfEmployee +
    incomeTaxDeduction;

  const netSalary = grossSalary - totalDeductions;

  const otherDeductions = [];
  if (penaltyDeduction > 0) {
    otherDeductions.push({ label: 'Late attendance penalties', amount: penaltyDeduction, type: 'deduction' });
  }

  return {
    employee: employeeId,
    month: m,
    year: y,
    basicSalary,
    allowances,
    overtime: finalOvertime,
    overtimeHours: otHours,
    otHours,
    otPay: finalOvertime,
    commissions: totalCommissions,
    projectCommissions: projectCommissionAlloc + autoCommission,
    projectAllocations: projectLines,
    bonus,
    bonusNote: targetBonus > 0 ? `Includes LKR ${targetBonus.toLocaleString()} from achieved targets` : (overrides.bonusNote || ''),
    incentives,
    advanceDeduction,
    loanDeduction,
    deductedLoans,
    deductedAdvances,
    continueLoanDeduction: overrides.continueLoanDeduction !== false,
    leaveDeduction,
    leaveDeductionDays,
    penaltyDeduction,
    incomeTaxDeduction,
    epfEmployee,
    epfEmployer,
    etfEmployer,
    deductions: otherDeductionsManual,
    otherDeductions,
    grossSalary,
    totalAdditions,
    totalDeductions,
    netSalary,
    _taxCalc: taxCalc,
  };
}

async function writeRecalcLog({
  payroll,
  employeeId,
  month,
  year,
  before,
  after,
  options,
  skipped,
  skipReason,
}) {
  const netDelta = (after?.netSalary || 0) - (before?.netSalary || 0);
  await PayrollRecalcLog.create({
    payroll: payroll?._id,
    employee: employeeId,
    month,
    year,
    triggerSource: options.source || 'system',
    triggerModule: options.module || '',
    triggerEntityId: options.entityId ? String(options.entityId) : '',
    reason: options.reason || '',
    user: options.user?._id || options.user,
    userName: options.user?.name || 'System',
    before: payrollSnapshotSummary(before),
    after: payrollSnapshotSummary(after),
    netDelta,
    skipped: Boolean(skipped),
    skipReason: skipReason || '',
  });

  try {
    await AuditLog.create({
      user: options.user?._id,
      userName: options.user?.name || 'System',
      userRole: options.user?.role || 'system',
      action: 'update',
      module: 'payroll',
      entityId: payroll?._id ? String(payroll._id) : '',
      entityName: `Payroll ${month}/${year}`,
      description: skipped
        ? `Payroll sync skipped (${skipReason}) — ${options.source}`
        : `Payroll auto-recalculated (${options.source}) — net Δ LKR ${netDelta.toLocaleString()}`,
      changes: { before: payrollSnapshotSummary(before), after: payrollSnapshotSummary(after) },
      severity: Math.abs(netDelta) > 50000 ? 'warning' : 'info',
    });
  } catch (_) { /* non-blocking */ }
}

async function syncIncomeTax(employee, month, year, payroll, taxCalc, incomeTaxDeduction) {
  if (!payroll) return;
  await IncomeTaxRecord.findOneAndUpdate(
    { employee: employee._id, month, year },
    {
      employee: employee._id,
      month,
      year,
      config: taxCalc?.config?._id,
      taxableIncome: taxCalc?.monthlyTaxable,
      taxAmount: incomeTaxDeduction,
      exemptionsApplied: (taxCalc?.exemptions || []).reduce((s, e) => s + Number(e.amount || 0), 0),
      payroll: payroll._id,
      branch: employee.branch,
      status: incomeTaxDeduction > 0 ? 'deducted' : 'calculated',
      paymentMethod: 'payroll',
    },
    { upsert: true },
  );
}

/**
 * Main sync entry — recalculates payroll for employee/month/year.
 */
async function syncPayrollForEmployee(employeeId, month, year, options = {}) {
  const m = Number(month);
  const y = Number(year);
  if (!employeeId || !m || !y) {
    return { success: false, message: 'employeeId, month, and year are required' };
  }

  const {
    source = 'system',
    module = '',
    entityId = '',
    reason = '',
    user = null,
    createIfMissing = true,
    force = false,
    overrides = {},
  } = options;

  const employee = await Employee.findById(employeeId);
  if (!employee) return { success: false, message: 'Employee not found' };

  let payroll = await Payroll.findOne({ employee: employeeId, month: m, year: y });
  const before = payroll ? payroll.toObject() : null;

  if (!payroll && !createIfMissing) {
    await writeRecalcLog({
      payroll: null, employeeId, month: m, year: y, before: null, after: null,
      options: { source, module, entityId, reason, user },
      skipped: true, skipReason: 'no_payroll_record',
    });
    return { success: true, skipped: true, reason: 'no_payroll_record' };
  }

  if (payroll && payroll.autoSyncEnabled === false && !force) {
    await writeRecalcLog({
      payroll, employeeId, month: m, year: y, before, after: before,
      options: { source, module, entityId, reason, user },
      skipped: true, skipReason: 'auto_sync_disabled',
    });
    return { success: true, skipped: true, reason: 'auto_sync_disabled', payroll };
  }

  if (payroll?.status === PAID_STATUS) {
    const snapshot = await computePayrollSnapshot(employeeId, m, y, overrides);
    const delta = Number(snapshot.netSalary) - Number(payroll.netSalary);
    let adjustment = null;
    if (Math.abs(delta) >= 1) {
      adjustment = await PayrollAdjustment.create({
        employee: employeeId,
        payroll: payroll._id,
        month: m,
        year: y,
        type: delta >= 0 ? 'addition' : 'deduction',
        amount: Math.abs(delta),
        label: `Payroll adjustment (${source})`,
        reason: reason || `Financial change after payroll was paid`,
        sourceModule: module || source,
        sourceEntityId: entityId ? String(entityId) : '',
        previousNetSalary: payroll.netSalary,
        suggestedNetSalary: snapshot.netSalary,
        createdBy: user?._id,
      });
    }
    await writeRecalcLog({
      payroll, employeeId, month: m, year: y, before, after: snapshot,
      options: { source, module, entityId, reason, user },
      skipped: true, skipReason: 'paid_payroll_adjustment_created',
    });
    return {
      success: true,
      skipped: true,
      reason: 'paid_locked',
      payroll,
      adjustment,
      suggestedNetSalary: snapshot.netSalary,
    };
  }

  if (payroll && LOCKED_STATUSES.includes(payroll.status) && !force) {
    await writeRecalcLog({
      payroll, employeeId, month: m, year: y, before, after: before,
      options: { source, module, entityId, reason, user },
      skipped: true, skipReason: 'finalized_locked',
    });
    return { success: true, skipped: true, reason: 'finalized_locked', payroll };
  }

  const snapshot = await computePayrollSnapshot(employeeId, m, y, {
    ...overrides,
    bonusNote: payroll?.bonusNote,
    continueLoanDeduction: payroll?.continueLoanDeduction,
  });

  const taxCalc = snapshot._taxCalc;
  delete snapshot._taxCalc;

  const preserveStatus = payroll?.status && AUTO_RECALC_STATUSES.includes(payroll.status)
    ? payroll.status
    : 'draft';

  const updatePayload = {
    ...snapshot,
    status: preserveStatus,
    lastRecalculatedAt: new Date(),
    lastRecalcSource: source,
    notes: payroll?.notes ?? overrides.notes ?? '',
    paymentMethod: payroll?.paymentMethod,
    bankAccount: payroll?.bankAccount,
    reviewedBy: payroll?.reviewedBy,
    reviewedAt: payroll?.reviewedAt,
    generatedBy: payroll?.generatedBy || user?._id,
  };

  if (payroll) {
    payroll = await Payroll.findByIdAndUpdate(
      payroll._id,
      { $set: updatePayload, $inc: { recalcVersion: 1 } },
      { new: true },
    );
  } else {
    payroll = await Payroll.create({
      ...updatePayload,
      status: 'draft',
      generatedBy: user?._id,
      recalcVersion: 1,
    });
  }

  await syncIncomeTax(employee, m, y, payroll, taxCalc, snapshot.incomeTaxDeduction);

  await payroll.populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });

  await writeRecalcLog({
    payroll, employeeId, month: m, year: y, before, after: payroll.toObject(),
    options: { source, module, entityId, reason, user },
    skipped: false,
  });

  return {
    success: true,
    recalculated: true,
    payroll,
    breakdown: {
      earnings: {
        basicSalary: payroll.basicSalary,
        overtime: payroll.overtime,
        bonus: payroll.bonus,
        commissions: payroll.commissions,
        incentives: payroll.incentives,
        allowances: payroll.allowances,
      },
      deductions: {
        loanDeduction: payroll.loanDeduction,
        advanceDeduction: payroll.advanceDeduction,
        epfEmployee: payroll.epfEmployee,
        incomeTaxDeduction: payroll.incomeTaxDeduction,
        leaveDeduction: payroll.leaveDeduction,
        penaltyDeduction: payroll.penaltyDeduction,
        other: payroll.deductions,
      },
      grossSalary: payroll.grossSalary,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
    },
  };
}

/** Fire-and-forget safe wrapper for controllers */
async function triggerPayrollSync(params) {
  try {
    const { employeeId, date, month, year } = params;
    const period = month && year
      ? { month: Number(month), year: Number(year) }
      : monthYearFromDate(date);

    return await syncPayrollForEmployee(employeeId, period.month, period.year, {
      source: params.source || 'system',
      module: params.module || params.source,
      entityId: params.entityId,
      reason: params.reason,
      user: params.user,
      createIfMissing: params.createIfMissing !== false,
      force: params.force === true,
      overrides: params.overrides || {},
    });
  } catch (err) {
    console.error('[payrollEngine] sync failed:', err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Sync current month + every draft/reviewed payroll + optional extra periods (e.g. loan start month).
 */
async function syncAllRelevantPayrollsForEmployee(employeeId, options = {}) {
  const now = monthYearFromDate();
  const periods = new Map();
  const addPeriod = (month, year) => {
    const m = Number(month);
    const y = Number(year);
    if (m >= 1 && m <= 12 && y > 2000) periods.set(`${y}-${m}`, { month: m, year: y });
  };

  addPeriod(now.month, now.year);
  (options.extraPeriods || []).forEach((p) => addPeriod(p.month, p.year));

  const openPayrolls = await Payroll.find({
    employee: employeeId,
    status: { $in: [...AUTO_RECALC_STATUSES] },
  }).select('month year');

  openPayrolls.forEach((p) => addPeriod(p.month, p.year));

  const results = [];
  for (const { month, year } of periods.values()) {
    results.push(await syncPayrollForEmployee(employeeId, month, year, options));
  }
  return results;
}

/** Pick the best sync result for API responses (prefer current month, then any recalculated). */
function pickPrimarySyncResult(results, preferMonth, preferYear) {
  if (!Array.isArray(results) || !results.length) return results;
  const pm = Number(preferMonth);
  const py = Number(preferYear);
  return (
    results.find((r) => r.recalculated && r.payroll?.month === pm && r.payroll?.year === py)
    || results.find((r) => r.payroll?.month === pm && r.payroll?.year === py)
    || results.find((r) => r.recalculated)
    || results[0]
  );
}

/** @deprecated use syncAllRelevantPayrollsForEmployee */
async function triggerPayrollSyncForEmployee(employeeId, options = {}) {
  return syncAllRelevantPayrollsForEmployee(employeeId, options);
}

module.exports = {
  monthYearFromDate,
  monthRange,
  computePayrollSnapshot,
  syncPayrollForEmployee,
  triggerPayrollSync,
  triggerPayrollSyncForEmployee,
  syncAllRelevantPayrollsForEmployee,
  pickPrimarySyncResult,
  payrollSnapshotSummary,
  AUTO_RECALC_STATUSES,
  LOCKED_STATUSES,
};
