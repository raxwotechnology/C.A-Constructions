const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const FinanceEntry = require('../models/FinanceEntry');
const Invoice = require('../models/Invoice');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Project = require('../models/Project');
const Subscription = require('../models/Subscription');
const PettyCash = require('../models/PettyCash');
const { createAuditLog } = require('./auditController');
const { verifyActionPassword } = require('../utils/actionPassword');
const { isFinanceBankMethod, appendBankTransaction } = require('../utils/bankLedger');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Cash received from invoice payments in range (excludes draft/cancelled). */
async function aggregateInvoicePaymentRevenue(branchMatch, range) {
  const rows = await Invoice.aggregate([
    { $match: { ...branchMatch, status: { $nin: ['cancelled', 'draft'] } } },
    { $unwind: '$payments' },
    { $match: { 'payments.date': range } },
    { $group: { _id: null, total: { $sum: '$payments.amount' }, paymentCount: { $sum: 1 } } },
  ]);
  return { total: rows[0]?.total || 0, paymentCount: rows[0]?.paymentCount || 0 };
}

async function aggregateInvoicePaymentRevenueByMonth(branchMatch, yearStart, yearEnd) {
  return Invoice.aggregate([
    { $match: { ...branchMatch, status: { $nin: ['cancelled', 'draft'] } } },
    { $unwind: '$payments' },
    { $match: { 'payments.date': { $gte: yearStart, $lte: yearEnd } } },
    { $group: { _id: { $month: '$payments.date' }, total: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
}

function financeEntrySnapshot(e) {
  if (!e) return null;
  return {
    type: e.type,
    category: e.category,
    title: e.title,
    amount: e.amount,
    date: e.date,
    note: e.note,
    paymentMethod: e.paymentMethod,
    branch: e.branch ? String(e.branch) : null,
    bankAccount: e.bankAccount ? String(e.bankAccount) : null,
  };
}

function getRange(month, year) {
  if (!month || !year) return {};
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

async function getEmpIds(branchId) {
  if (!branchId) return null;
  const emps = await Employee.find({ branch: branchId }).select('_id');
  return emps.map(e => e._id);
}

exports.addEntry = async (req, res, next) => {
  try {
    const { type, category, title, amount, date, note, branch, paymentMethod } = req.body;
    const data = {
      type,
      category,
      title,
      amount: Number(amount || 0),
      date: date ? new Date(date) : new Date(),
      note: note || '',
      paymentMethod: paymentMethod || 'Cash',
      bankAccount: req.body.bankAccount || null,
      createdBy: req.user._id,
      branch: branch || null,
    };
    if (req.file) {
      data.billFile = `/uploads/bills/${req.file.filename}`;
      data.billFileName = req.file.originalname;
    }
    const entry = await FinanceEntry.create(data);

    if (data.bankAccount && isFinanceBankMethod(data.paymentMethod)) {
      const isCredit = type === 'income';
      await appendBankTransaction(data.bankAccount, {
        type: isCredit ? 'deposit' : 'withdrawal',
        amount: data.amount,
        description: `Finance Entry: ${title} (${category})`,
        date: data.date,
        recordedBy: req.user._id,
      });
    }

    await createAuditLog({
      user: req.user,
      action: 'create',
      module: 'financial',
      entityId: String(entry._id),
      entityName: entry.title,
      description: `Finance entry created: ${entry.title} (${entry.type}, LKR ${entry.amount})`,
      changes: { before: null, after: financeEntrySnapshot(entry.toObject ? entry.toObject() : entry) },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(201).json({ success: true, entry });
  } catch (err) { next(err); }
};

exports.updateEntry = async (req, res, next) => {
  try {
    const entry = await FinanceEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Not found' });

    const beforeSnap = financeEntrySnapshot(entry.toObject ? entry.toObject() : entry);

    if (entry.bankAccount && isFinanceBankMethod(entry.paymentMethod)) {
      const wasCredit = entry.type === 'income';
      await appendBankTransaction(entry.bankAccount, {
        type: wasCredit ? 'withdrawal' : 'deposit',
        amount: entry.amount,
        description: `Finance Reversal (Edit): ${entry.title}`,
        date: new Date(),
        recordedBy: req.user._id,
      });
    }

    const { type, category, title, amount, date, note, branch, paymentMethod, bankAccount } = req.body;
    entry.type = type || entry.type;
    entry.category = category || entry.category;
    entry.title = title || entry.title;
    entry.amount = amount !== undefined ? Number(amount) : entry.amount;
    if (date) entry.date = new Date(date);
    entry.note = note !== undefined ? note : entry.note;
    entry.branch = branch || null;
    entry.paymentMethod = paymentMethod || entry.paymentMethod;
    entry.bankAccount = bankAccount || null;

    if (req.file) {
      entry.billFile = `/uploads/bills/${req.file.filename}`;
      entry.billFileName = req.file.originalname;
    }

    await entry.save();

    if (entry.bankAccount && isFinanceBankMethod(entry.paymentMethod)) {
      const isCredit = entry.type === 'income';
      await appendBankTransaction(entry.bankAccount, {
        type: isCredit ? 'deposit' : 'withdrawal',
        amount: entry.amount,
        description: `Finance Entry (Edited): ${entry.title}`,
        date: entry.date,
        recordedBy: req.user._id,
      });
    }

    const afterSnap = financeEntrySnapshot(entry.toObject ? entry.toObject() : entry);
    await createAuditLog({
      user: req.user,
      action: 'update',
      module: 'financial',
      entityId: String(entry._id),
      entityName: entry.title,
      description: `Finance entry updated: ${entry.title} (${entry.type}, LKR ${entry.amount})`,
      changes: { before: beforeSnap, after: afterSnap },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, entry });
  } catch (err) { next(err); }
};

exports.deleteEntry = async (req, res, next) => {
  try {
    const pw = req.body?.password ?? req.query?.password;
    const check = await verifyActionPassword(req.user._id, pw);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });

    const entry = await FinanceEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Not found' });

    const beforeSnap = financeEntrySnapshot(entry.toObject ? entry.toObject() : entry);

    if (entry.bankAccount && isFinanceBankMethod(entry.paymentMethod)) {
      const wasCredit = entry.type === 'income';
      await appendBankTransaction(entry.bankAccount, {
        type: wasCredit ? 'withdrawal' : 'deposit',
        amount: entry.amount,
        description: `Finance Reversal (Deleted): ${entry.title}`,
        date: new Date(),
        recordedBy: req.user._id,
      });
    }

    await entry.deleteOne();

    await createAuditLog({
      user: req.user,
      action: 'delete',
      module: 'financial',
      entityId: String(entry._id),
      entityName: beforeSnap.title,
      description: `Finance entry deleted: ${beforeSnap.title} (${beforeSnap.type}, LKR ${beforeSnap.amount})`,
      changes: { before: beforeSnap, after: null },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
      severity: 'warning',
    });

    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getEntries = async (req, res, next) => {
  try {
    const { type, category, month, year, from, to, branch, paymentMethod } = req.query;
    const q = {};
    if (type) q.type = type;
    if (category) q.category = category;
    if (branch) q.branch = branch;
    if (paymentMethod) q.paymentMethod = paymentMethod;
    const dateRange = getRange(month, year);

    // Build date range — always set $lte to END of day so same-day entries aren't missed
    let dateFilter = null;
    if (from || to) {
      dateFilter = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDate;
      }
    } else if (dateRange.$gte) {
      dateFilter = dateRange;
    }
    if (dateFilter) q.date = dateFilter;

    // Build a separate clean query for PettyCash (different schema shape)
    const pcQ = {};
    if (branch) pcQ.branch = branch;
    if (dateFilter) pcQ.date = dateFilter;

    // Build subscription date match
    const subDateMatch = dateFilter ? { 'payments.paidAt': dateFilter } : {};
    const subBranchMatch = branch ? { branch: new (require('mongoose').Types.ObjectId)(branch) } : {};

    const [entries, pettyCash, subscriptions] = await Promise.all([
      FinanceEntry.find(q)
        .sort({ date: -1, createdAt: -1 })
        .populate('createdBy', 'name email')
        .populate('bankAccount', 'bankName accountNumber')
        .populate('branch', 'name'),
      PettyCash.find(pcQ).sort({ date: -1 }),
      Subscription.find(pcQ).sort({ createdAt: -1 })
    ]);

    // Normalize petty cash
    const pcEntries = pettyCash.filter(p => !type || (type === 'income' && p.type === 'in') || (type === 'expense' && p.type === 'out'))
      .filter(p => !paymentMethod || p.paymentType === paymentMethod)
      .map(p => ({
        _id: p._id, type: p.type === 'in' ? 'income' : 'expense', category: p.type === 'in' ? 'Petty Cash (In)' : 'Petty Cash', title: `Petty Cash: ${p.description}`, amount: p.amount, date: p.date, paymentMethod: p.paymentType, note: p.paidTo || ''
      }));

    // Normalize subscriptions
    const subEntries = subscriptions.filter(s => !type || type === 'income')
      .map(s => ({
        _id: s._id, type: 'income', category: 'Subscriptions', title: `Subscription: ${s.title}`, amount: s.amount, date: s.createdAt, paymentMethod: 'Subscription', note: s.subscriptionNo || ''
      }));

    const allEntries = [...entries.map(e => e.toObject()), ...pcEntries, ...subEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totals = allEntries.reduce((acc, e) => {
      if (e.type === 'income') acc.income += Number(e.amount || 0);
      if (e.type === 'expense') acc.expense += Number(e.amount || 0);
      return acc;
    }, { income: 0, expense: 0 });
    totals.profit = totals.income - totals.expense;

    const categories = [...new Set(allEntries.map((e) => e.category).filter(Boolean))];
    res.json({ success: true, count: allEntries.length, entries: allEntries, totals, categories });
  } catch (err) { next(err); }
};

exports.getOverview = async (req, res, next) => {
  try {
    const { branch, from, to } = req.query;
    const now = new Date();
    
    let range;
    let yearForChart;
    if (from && to) {
      const startDate = new Date(from);
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      range = { $gte: startDate, $lte: endDate };
      yearForChart = startDate.getFullYear();
    } else {
      const month = Number(req.query.month || (now.getMonth() + 1));
      const year = Number(req.query.year || now.getFullYear());
      range = getRange(month, year);
      yearForChart = year;
    }

    const yearStart = new Date(yearForChart, 0, 1);
    const yearEnd = new Date(yearForChart, 11, 31, 23, 59, 59, 999);

    const branchMatch = branch ? { branch } : {};
    const empIds = await getEmpIds(branch);
    const empMatch = empIds ? { employee: { $in: empIds } } : {};

    const [paidInvoices, paidPayrolls, entries, revenueByMonth, paymentRevenueAgg, incomeExpenseByCategory, pettyCashEntries, subscriptions] = await Promise.all([
      Invoice.find({ ...branchMatch, status: 'paid', paidAt: range }).select('invoiceNo total paidAt client project').populate('client', 'name email').populate('project', 'title'),
      Payroll.find({ ...empMatch, status: 'paid', paidAt: range }).select('netSalary month year'),
      FinanceEntry.find({ ...branchMatch, date: range })
        .sort({ date: -1 })
        .populate('bankAccount', 'bankName accountNumber')
        .populate('branch', 'name'),
      aggregateInvoicePaymentRevenueByMonth(branchMatch, yearStart, yearEnd),
      aggregateInvoicePaymentRevenue(branchMatch, range),
      FinanceEntry.aggregate([
        { $match: { ...branchMatch, date: range } },
        { $group: { _id: { category: '$category', type: '$type' }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      // Petty cash in range
      PettyCash.find({ ...(branch ? { branch } : {}), date: range }).sort({ date: -1 }),
      // Subscriptions created in range
      Subscription.find({ ...(branch ? { branch } : {}), createdAt: range }).sort({ createdAt: -1 })
    ]);

    const pettyCashIn = pettyCashEntries.filter(p => p.type === 'in').reduce((s, p) => s + Number(p.amount || 0), 0);
    const pettyCashOut = pettyCashEntries.filter(p => p.type === 'out').reduce((s, p) => s + Number(p.amount || 0), 0);
    const subscriptionRevenue = subscriptions.reduce((s, sub) => s + Number(sub.amount || 0), 0);

    const revenue = paymentRevenueAgg.total;
    const salaryPayout = paidPayrolls.reduce((s, p) => s + Number(p.netSalary || 0), 0);
    const incomeEntries = entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0);
    const expenseEntries = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalIncome = revenue + incomeEntries + pettyCashIn + subscriptionRevenue;
    const totalExpense = salaryPayout + expenseEntries + pettyCashOut;
    const profit = totalIncome - totalExpense;

    const monthlyMap = new Map((revenueByMonth || []).map((r) => [r._id, r]));
    const normalizedRevenueSeries = MONTHS.map((m, idx) => {
      const row = monthlyMap.get(idx + 1);
      return { month: m, total: row?.total || 0, invoiceCount: row?.count || 0 };
    });

    const incomeBreakdown = entries.filter((e) => e.type === 'income')
      .reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0);
        return acc;
      }, {});
    if (pettyCashIn > 0) incomeBreakdown['Petty Cash (In)'] = (incomeBreakdown['Petty Cash (In)'] || 0) + pettyCashIn;
    if (subscriptionRevenue > 0) incomeBreakdown['Subscriptions'] = (incomeBreakdown['Subscriptions'] || 0) + subscriptionRevenue;

    const expenseBreakdown = entries.filter((e) => e.type === 'expense')
      .reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0);
        return acc;
      }, {});
    if (pettyCashOut > 0) expenseBreakdown['Petty Cash'] = (expenseBreakdown['Petty Cash'] || 0) + pettyCashOut;

    const topRevenueInvoices = [...paidInvoices]
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
      .slice(0, 8)
      .map((i) => ({
        invoiceNo: i.invoiceNo,
        clientName: i.client?.name || '—',
        projectTitle: i.project?.title || 'General Services',
        total: Number(i.total || 0),
        paidAt: i.paidAt,
      }));

    // Build recent entries including petty cash
    const recentFinance = entries.slice(0, 12).map((e) => ({
      type: e.type,
      category: e.category,
      title: e.title,
      amount: Number(e.amount || 0),
      date: e.date,
      note: e.note || '',
      paymentMethod: e.paymentMethod || '—',
      bankName: e.bankAccount?.bankName || '',
      branchName: e.branch?.name || '',
    }));
    // Add petty cash to recent entries
    pettyCashEntries.slice(0, 6).forEach(p => {
      recentFinance.push({
        type: p.type === 'out' ? 'expense' : 'income',
        category: p.category || 'Petty Cash',
        title: `Petty Cash: ${p.description}`,
        amount: Number(p.amount || 0),
        date: p.date,
        note: p.paidTo || '',
        paymentMethod: p.paymentType || 'Cash',
        bankName: '',
        branchName: '',
      });
    });
    recentFinance.sort((a, b) => new Date(b.date) - new Date(a.date));

    const charts = {
      revenueByMonth: normalizedRevenueSeries,
      incomeExpenseByCategory: (incomeExpenseByCategory || []).map((r) => ({
        category: r._id.category,
        type: r._id.type,
        total: r.total,
      })),
    };

    res.json({
      success: true,
      period: { from, to, month: req.query.month, year: req.query.year },
      summary: { revenue, salaryPayout, incomeEntries, expenseEntries, pettyCashIn, pettyCashOut, subscriptionRevenue, totalIncome, totalExpense, profit },
      details: {
        paidInvoicesCount: paidInvoices.length,
        invoicePaymentsCount: paymentRevenueAgg.paymentCount,
        payrollRunsCount: paidPayrolls.length,
        entriesCount: entries.length,
        subscriptionPaymentsCount,
        pettyCashCount: pettyCashEntries.length,
        profitMarginPct: totalIncome > 0 ? Number(((profit / totalIncome) * 100).toFixed(2)) : 0,
        incomeBreakdown: Object.entries(incomeBreakdown).map(([cat, amount]) => ({ category: cat, amount })).sort((a, b) => b.amount - a.amount),
        expenseBreakdown: Object.entries(expenseBreakdown).map(([cat, amount]) => ({ category: cat, amount })).sort((a, b) => b.amount - a.amount),
        topRevenueInvoices,
        recentEntries: recentFinance.slice(0, 15),
      },
      charts,
    });
  } catch (err) { next(err); }
};

function htmlFromRows(title, headers, rows) {
  const head = headers.map((h) => `<th>${h}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
  body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
  h1{font-size:20px;margin:0 0 12px 0}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:left}
  th{background:#f8fafc}
  </style></head><body><h1>${title}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

exports.exportData = async (req, res, next) => {
  try {
    const { dataset = 'financial_overview', format = 'excel', month, year, from, to, category, type, employeeId, branch } = req.query;
    const lowerDataset = String(dataset).toLowerCase();
    const lowerFormat = String(format).toLowerCase();
    let headers = [];
    let rows = [];
    const employee = employeeId ? await Employee.findById(employeeId).populate('userId', 'name email role') : null;
    const employeeUserId = employee?.userId?._id;

    const branchMatch = branch ? { branch } : {};
    const empIds = await getEmpIds(branch);
    const empMatch = empIds ? { employee: { $in: empIds } } : {};
    const branchEmpMatch = branch ? { branch } : {};

    if (lowerDataset === 'salary_payments') {
      const payrolls = await Payroll.find({
        ...empMatch,
        ...(month ? { month: Number(month) } : {}),
        ...(year ? { year: Number(year) } : {}),
        ...(employeeId ? { employee: employeeId } : {}),
      }).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });
      headers = ['Employee', 'Employee No', 'Month', 'Year', 'Basic', 'Commissions', 'OT', 'Net', 'Status'];
      rows = payrolls.map((p) => [
        p.employee?.userId?.name,
        p.employee?.employeeNo,
        p.month,
        p.year,
        p.basicSalary,
        p.commissions || 0,
        p.overtime || 0,
        p.netSalary,
        p.status,
      ]);
    } else if (lowerDataset === 'epf_etf') {
      const payrolls = await Payroll.find({
        ...empMatch,
        ...(month ? { month: Number(month) } : {}),
        ...(year ? { year: Number(year) } : {}),
        ...(employeeId ? { employee: employeeId } : {}),
      }).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });
      headers = ['Employee', 'Month', 'Year', 'Basic', 'EPF Emp', 'EPF Employer', 'ETF Employer'];
      rows = payrolls.map((p) => [
        p.employee?.userId?.name, p.month, p.year, p.basicSalary, p.epfEmployee, p.epfEmployer, p.etfEmployer,
      ]);
    } else if (lowerDataset === 'employee_details') {
      const employees = await Employee.find({
        ...branchEmpMatch,
        ...(category ? { department: category } : {}),
      }).populate('userId', 'name email phone role');
      headers = ['Name', 'Email', 'Phone', 'Role', 'EmployeeNo', 'Department', 'Designation', 'Basic Salary', 'Status'];
      rows = employees.map((e) => [
        e.userId?.name, e.userId?.email, e.userId?.phone, e.userId?.role, e.employeeNo, e.department, e.designation, e.basicSalary, e.status,
      ]);
    } else if (lowerDataset === 'incomes' || lowerDataset === 'expenses') {
      const entries = await FinanceEntry.find({
        ...branchMatch,
        type: lowerDataset === 'incomes' ? 'income' : 'expense',
        ...(category ? { category } : {}),
        ...(from && to ? { date: { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } } : (month && year ? { date: getRange(month, year) } : {})),
      }).sort({ date: -1 });
      headers = ['Date', 'Category', 'Title', 'Amount', 'Note'];
      rows = entries.map((e) => [new Date(e.date).toLocaleDateString(), e.category, e.title, e.amount, e.note || '']);
    } else if (lowerDataset === 'attendance_reports') {
      const records = await Attendance.find({
        ...empMatch,
        ...(employeeId ? { employee: employeeId } : {}),
        ...(from && to ? { date: { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } } : (month && year ? { date: getRange(month, year) } : {})),
      }).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } }).sort({ date: -1 });
      headers = ['Employee', 'Date', 'Status', 'Check In', 'Check Out', 'Notes'];
      rows = records.map((r) => [
        r.employee?.userId?.name,
        new Date(r.date).toLocaleDateString(),
        r.status,
        r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : '—',
        r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : '—',
        r.notes || '',
      ]);
    } else if (lowerDataset === 'leave_reports') {
      const records = await Leave.find({
        ...empMatch,
        ...(employeeId ? { employee: employeeId } : {}),
        ...(from && to ? { startDate: { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } } : (month && year ? { startDate: getRange(month, year) } : {})),
      }).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } }).sort({ createdAt: -1 });
      headers = ['Employee', 'Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
      rows = records.map((r) => [
        r.employee?.userId?.name,
        r.leaveType,
        new Date(r.startDate).toLocaleDateString(),
        new Date(r.endDate).toLocaleDateString(),
        r.days,
        r.status,
        r.reason,
      ]);
    } else if (lowerDataset === 'project_history') {
      const projects = await Project.find({
        ...branchMatch,
        ...(employeeUserId ? { assignedEmployees: employeeUserId } : {}),
      }).populate('assignedEmployees', 'name email').sort({ updatedAt: -1 });
      headers = ['Project', 'Status', 'Progress', 'Deadline', 'Assigned Employees', 'Updated At'];
      rows = projects.map((p) => [
        p.title,
        p.status,
        `${p.progress || 0}%`,
        p.deadline ? new Date(p.deadline).toLocaleDateString() : '—',
        (p.assignedEmployees || []).map((u) => u.name).join(', '),
        p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '—',
      ]);
    } else if (lowerDataset === 'revenue_invoices') {
      const invoices = await Invoice.find({
        ...branchMatch,
        ...(from && to ? { createdAt: { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } } : (month && year ? { createdAt: getRange(month, year) } : {})),
      }).populate('client', 'name email').populate('project', 'title').sort({ createdAt: -1 });
      headers = ['Invoice No', 'Client', 'Project', 'Status', 'Total', 'Due Date', 'Paid At'];
      rows = invoices.map((i) => [
        i.invoiceNo,
        i.client?.name,
        i.project?.title || '—',
        i.status,
        i.total,
        i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '—',
        i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '—',
      ]);
    } else {
      const now = new Date();
      let range;
      if (from && to) {
        range = { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) };
      } else {
        const m = Number(month || (now.getMonth() + 1));
        const y = Number(year || now.getFullYear());
        range = getRange(m, y);
      }
      const [paidInvoices, paidPayrolls, entries, pettyCash, subsPayments] = await Promise.all([
        Invoice.find({ ...branchMatch, status: 'paid', paidAt: range }).populate('client', 'name email'),
        Payroll.find({ ...empMatch, status: 'paid', paidAt: range }).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } }),
        FinanceEntry.find({ ...branchMatch, ...(type ? { type } : {}), ...(category ? { category } : {}), date: range }),
        PettyCash.find({ ...branchMatch, date: range }),
        Subscription.aggregate([
          { ...(branch ? { $match: { branch: new (require('mongoose').Types.ObjectId)(branch) } } : { $match: {} }) },
          { $unwind: '$payments' },
          { $match: { 'payments.paidAt': range } },
          { $project: { _id: '$payments._id', amount: '$payments.amount', date: '$payments.paidAt', method: '$payments.method', title: '$title' } }
        ])
      ]);
      const revenue = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
      const salaryPayout = paidPayrolls.reduce((s, p) => s + Number(p.netSalary || 0), 0);
      const incomeEntries = entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0);
      const expenseEntries = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0);
      const subRevenue = subsPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const pcIn = pettyCash.filter(p => p.type === 'in').reduce((s, p) => s + Number(p.amount || 0), 0);
      const pcOut = pettyCash.filter(p => p.type === 'out').reduce((s, p) => s + Number(p.amount || 0), 0);
      const totalIncome = revenue + incomeEntries + subRevenue + pcIn;
      const totalExpense = salaryPayout + expenseEntries + pcOut;
      const profit = totalIncome - totalExpense;

      const ledger = [];
      paidInvoices.forEach((i) => ledger.push({
        rawDate: i.paidAt ? new Date(i.paidAt) : new Date(0),
        row: [
          i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '—',
          'Invoice',
          'income',
          'Revenue',
          `Paid Invoice ${i.invoiceNo || ''} (${i.client?.name || 'Client'})`,
          Number(i.total || 0),
          '',
        ],
      }));
      paidPayrolls.forEach((p) => ledger.push({
        rawDate: p.paidAt ? new Date(p.paidAt) : new Date(0),
        row: [
          p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—',
          'Payroll',
          'expense',
          'Salary',
          `Salary Payout ${p.employee?.userId?.name || ''} (${p.month}/${p.year})`,
          Number(p.netSalary || 0),
          '',
        ],
      }));
      entries.forEach((e) => ledger.push({
        rawDate: e.date ? new Date(e.date) : new Date(0),
        row: [
          e.date ? new Date(e.date).toLocaleDateString() : '—',
          'Finance Entry',
          e.type,
          e.category,
          e.title,
          Number(e.amount || 0),
          e.note || '',
        ],
      }));
      subsPayments.forEach((s) => ledger.push({
        rawDate: s.date ? new Date(s.date) : new Date(0),
        row: [
          s.date ? new Date(s.date).toLocaleDateString() : '—',
          'Subscription',
          'income',
          'Subscriptions',
          `Subscription Payment: ${s.title}`,
          Number(s.amount || 0),
          '',
        ],
      }));
      pettyCash.forEach((p) => ledger.push({
        rawDate: p.date ? new Date(p.date) : new Date(0),
        row: [
          p.date ? new Date(p.date).toLocaleDateString() : '—',
          'Petty Cash',
          p.type === 'out' ? 'expense' : 'income',
          p.type === 'out' ? 'Petty Cash' : 'Petty Cash (In)',
          `Petty Cash: ${p.description}`,
          Number(p.amount || 0),
          p.paidTo || '',
        ],
      }));

      ledger.sort((a, b) => b.rawDate - a.rawDate);

      headers = ['Date', 'Source', 'Type', 'Category', 'Title', 'Amount', 'Note'];
      rows = [
        ['Summary', 'System', 'income', 'Revenue', 'Revenue (paid invoices)', revenue, ''],
        ['Summary', 'System', 'expense', 'Salary', 'Salary payout', salaryPayout, ''],
        ['Summary', 'System', 'income', 'Finance Entries', 'Other income entries', incomeEntries, ''],
        ['Summary', 'System', 'expense', 'Finance Entries', 'Other expense entries', expenseEntries, ''],
        ['Summary', 'System', 'income', 'Subscriptions', 'Subscription payments', subRevenue, ''],
        ['Summary', 'System', 'income', 'Petty Cash', 'Petty Cash (In)', pcIn, ''],
        ['Summary', 'System', 'expense', 'Petty Cash', 'Petty Cash (Out)', pcOut, ''],
        ['Summary', 'System', 'income', 'Total', 'Total income', totalIncome, ''],
        ['Summary', 'System', 'expense', 'Total', 'Total expense', totalExpense, ''],
        ['Summary', 'System', profit >= 0 ? 'income' : 'expense', 'Profit', 'Net profit', profit, ''],
        ...ledger.map((x) => x.row),
      ];
    }

    if (lowerFormat === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, 'Export');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${lowerDataset}.xlsx"`);
      return res.send(buf);
    }

    if (lowerFormat === 'pdf') {
      const html = htmlFromRows(`${lowerDataset} export`, headers, rows);
      const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${lowerDataset}.pdf"`);
        return res.send(pdf);
      } finally {
        await browser.close();
      }
    }

    return res.status(400).json({ success: false, message: 'Invalid format' });
  } catch (err) { next(err); }
};

// GET /api/finance/profit-loss
exports.getProfitLoss = async (req, res, next) => {
  try {
    const { from, to, branch, paymentMethod } = req.query;
    const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const branchMatch = branch ? { branch } : {};
    const empIds = await getEmpIds(branch);
    const empMatch = empIds ? { employee: { $in: empIds } } : {};
    const pmMatch = paymentMethod ? { paymentMethod } : {};

    const [incomeEntries, expenseEntries, invoicePayments, payrollRuns, pettyCash, subscriptions] = await Promise.all([
      FinanceEntry.find({ ...branchMatch, ...pmMatch, type: 'income', date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 }),
      FinanceEntry.find({ ...branchMatch, ...pmMatch, type: 'expense', date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 }),
      Invoice.find({ ...branchMatch, status: 'paid', paidAt: { $gte: startDate, $lte: endDate } }).populate('client', 'name email').sort({ paidAt: -1 }),
      Payroll.find({ ...empMatch, status: 'paid', paidAt: { $gte: startDate, $lte: endDate } }).populate({ path: 'employee', populate: { path: 'userId', select: 'name' } }).sort({ paidAt: -1 }),
      PettyCash.find({ ...branchMatch, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 }),
      Subscription.find({ ...branchMatch, createdAt: { $gte: startDate, $lte: endDate } }).sort({ createdAt: -1 })
    ]);

    // Normalize petty cash into standard income/expense entry shape for reports
    const pcIncome = pettyCash.filter(p => p.type === 'in' && (!paymentMethod || p.paymentType === paymentMethod)).map(p => ({
      _id: p._id, type: 'income', category: 'Petty Cash (In)', title: `Petty Cash: ${p.description}`, amount: p.amount, date: p.date, paymentMethod: p.paymentType
    }));
    const pcExpense = pettyCash.filter(p => p.type === 'out' && (!paymentMethod || p.paymentType === paymentMethod)).map(p => ({
      _id: p._id, type: 'expense', category: 'Petty Cash', title: `Petty Cash: ${p.description}`, amount: p.amount, date: p.date, paymentMethod: p.paymentType
    }));
    
    const subIncome = subscriptions.map(s => ({
      _id: s._id, type: 'income', category: 'Subscriptions', title: `Subscription: ${s.title}`, amount: s.amount, date: s.createdAt, paymentMethod: 'Subscription'
    }));

    const allIncomeEntries = [...incomeEntries, ...pcIncome, ...subIncome];
    const allExpenseEntries = [...expenseEntries, ...pcExpense];

    const totalIncomeEntries = allIncomeEntries.reduce((s, e) => s + e.amount, 0);
    const totalExpenseEntries = allExpenseEntries.reduce((s, e) => s + e.amount, 0);
    const totalInvoiceRevenue = invoicePayments.reduce((s, i) => s + i.total, 0);
    const totalSalaryExpense = payrollRuns.reduce((s, p) => s + p.netSalary, 0);

    const totalIncome = totalIncomeEntries + totalInvoiceRevenue;
    const totalExpense = totalExpenseEntries + totalSalaryExpense;
    const netProfit = totalIncome - totalExpense;

    // By payment method breakdown
    const byMethod = {};
    [...allIncomeEntries, ...allExpenseEntries].forEach(e => {
      const m = e.paymentMethod || 'Cash';
      if (!byMethod[m]) byMethod[m] = { income: 0, expense: 0 };
      byMethod[m][e.type] = (byMethod[m][e.type] || 0) + e.amount;
    });

    // By category breakdown
    const incomeCategoryMap = {};
    allIncomeEntries.forEach(e => { incomeCategoryMap[e.category] = (incomeCategoryMap[e.category] || 0) + e.amount; });
    const expenseCategoryMap = {};
    allExpenseEntries.forEach(e => { expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] || 0) + e.amount; });

    res.json({
      success: true,
      period: { from: startDate, to: endDate },
      summary: { totalIncome, totalExpense, netProfit, totalInvoiceRevenue, totalSalaryExpense, totalIncomeEntries, totalExpenseEntries },
      incomeEntries: allIncomeEntries,
      expenseEntries: allExpenseEntries,
      invoicePayments,
      payrollRuns,
      byMethod: Object.entries(byMethod).map(([method, vals]) => ({ method, ...vals })),
      incomeCategoryBreakdown: Object.entries(incomeCategoryMap).map(([cat, amt]) => ({ category: cat, amount: amt })).sort((a, b) => b.amount - a.amount),
      expenseCategoryBreakdown: Object.entries(expenseCategoryMap).map(([cat, amt]) => ({ category: cat, amount: amt })).sort((a, b) => b.amount - a.amount),
    });
  } catch (err) { next(err); }
};
