const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const FinanceEntry = require('../models/FinanceEntry');
const Invoice = require('../models/Invoice');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Project = require('../models/Project');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getRange(month, year) {
  if (!month || !year) return {};
  const start = new Date(Number(year), Number(month) - 1, 1);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

exports.addEntry = async (req, res, next) => {
  try {
    const { type, category, title, amount, date, note } = req.body;
    const entry = await FinanceEntry.create({
      type,
      category,
      title,
      amount: Number(amount || 0),
      date: date ? new Date(date) : new Date(),
      note: note || '',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, entry });
  } catch (err) { next(err); }
};

exports.getEntries = async (req, res, next) => {
  try {
    const { type, category, month, year, from, to } = req.query;
    const q = {};
    if (type) q.type = type;
    if (category) q.category = category;
    const dateRange = getRange(month, year);
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    } else if (dateRange.$gte) {
      q.date = dateRange;
    }

    const entries = await FinanceEntry.find(q).sort({ date: -1, createdAt: -1 }).populate('createdBy', 'name email');
    const totals = entries.reduce((acc, e) => {
      if (e.type === 'income') acc.income += Number(e.amount || 0);
      if (e.type === 'expense') acc.expense += Number(e.amount || 0);
      return acc;
    }, { income: 0, expense: 0 });
    totals.profit = totals.income - totals.expense;

    const categories = [...new Set(entries.map((e) => e.category).filter(Boolean))];
    res.json({ success: true, count: entries.length, entries, totals, categories });
  } catch (err) { next(err); }
};

exports.getOverview = async (req, res, next) => {
  try {
    const now = new Date();
    const month = Number(req.query.month || (now.getMonth() + 1));
    const year = Number(req.query.year || now.getFullYear());
    const range = getRange(month, year);

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const [paidInvoices, paidPayrolls, entries, revenueByMonth, incomeExpenseByCategory] = await Promise.all([
      Invoice.find({ status: 'paid', paidAt: range }).select('invoiceNo total paidAt client project').populate('client', 'name email').populate('project', 'title'),
      Payroll.find({ status: 'paid', paidAt: range }).select('netSalary month year'),
      FinanceEntry.find({ date: range }).sort({ date: -1 }),
      Invoice.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: yearStart, $lte: yearEnd } } },
        { $group: { _id: { $month: '$paidAt' }, total: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      FinanceEntry.aggregate([
        { $match: { date: range } },
        { $group: { _id: { category: '$category', type: '$type' }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const revenue = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const salaryPayout = paidPayrolls.reduce((s, p) => s + Number(p.netSalary || 0), 0);
    const incomeEntries = entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0);
    const expenseEntries = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalIncome = revenue + incomeEntries;
    const totalExpense = salaryPayout + expenseEntries;
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
    const expenseBreakdown = entries.filter((e) => e.type === 'expense')
      .reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0);
        return acc;
      }, {});

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
      period: { month, year },
      summary: { revenue, salaryPayout, incomeEntries, expenseEntries, totalIncome, totalExpense, profit },
      details: {
        paidInvoicesCount: paidInvoices.length,
        payrollRunsCount: paidPayrolls.length,
        entriesCount: entries.length,
        profitMarginPct: totalIncome > 0 ? Number(((profit / totalIncome) * 100).toFixed(2)) : 0,
        incomeBreakdown: Object.entries(incomeBreakdown).map(([cat, amount]) => ({ category: cat, amount })).sort((a, b) => b.amount - a.amount),
        expenseBreakdown: Object.entries(expenseBreakdown).map(([cat, amount]) => ({ category: cat, amount })).sort((a, b) => b.amount - a.amount),
        topRevenueInvoices,
        recentEntries: entries.slice(0, 12).map((e) => ({
          type: e.type,
          category: e.category,
          title: e.title,
          amount: Number(e.amount || 0),
          date: e.date,
          note: e.note || '',
        })),
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
    const { dataset = 'financial_overview', format = 'excel', month, year, category, type, employeeId } = req.query;
    const lowerDataset = String(dataset).toLowerCase();
    const lowerFormat = String(format).toLowerCase();
    let headers = [];
    let rows = [];
    const employee = employeeId ? await Employee.findById(employeeId).populate('userId', 'name email role') : null;
    const employeeUserId = employee?.userId?._id;

    if (lowerDataset === 'salary_payments') {
      const payrolls = await Payroll.find({
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
        ...(category ? { department: category } : {}),
      }).populate('userId', 'name email phone role');
      headers = ['Name', 'Email', 'Phone', 'Role', 'EmployeeNo', 'Department', 'Designation', 'Basic Salary', 'Status'];
      rows = employees.map((e) => [
        e.userId?.name, e.userId?.email, e.userId?.phone, e.userId?.role, e.employeeNo, e.department, e.designation, e.basicSalary, e.status,
      ]);
    } else if (lowerDataset === 'incomes' || lowerDataset === 'expenses') {
      const entries = await FinanceEntry.find({
        type: lowerDataset === 'incomes' ? 'income' : 'expense',
        ...(category ? { category } : {}),
        ...(month && year ? { date: getRange(month, year) } : {}),
      }).sort({ date: -1 });
      headers = ['Date', 'Category', 'Title', 'Amount', 'Note'];
      rows = entries.map((e) => [new Date(e.date).toLocaleDateString(), e.category, e.title, e.amount, e.note || '']);
    } else if (lowerDataset === 'attendance_reports') {
      const records = await Attendance.find({
        ...(employeeId ? { employee: employeeId } : {}),
        ...(month && year ? { date: getRange(month, year) } : {}),
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
        ...(employeeId ? { employee: employeeId } : {}),
        ...(month && year ? { startDate: getRange(month, year) } : {}),
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
        ...(month && year ? { createdAt: getRange(month, year) } : {}),
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
      const m = Number(month || (now.getMonth() + 1));
      const y = Number(year || now.getFullYear());
      const range = getRange(m, y);
      const paidInvoices = await Invoice.find({ status: 'paid', paidAt: range }).populate('client', 'name email');
      const paidPayrolls = await Payroll.find({ status: 'paid', paidAt: range }).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });
      const entries = await FinanceEntry.find({ ...(type ? { type } : {}), ...(category ? { category } : {}), date: range });
      const revenue = paidInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
      const salaryPayout = paidPayrolls.reduce((s, p) => s + Number(p.netSalary || 0), 0);
      const incomeEntries = entries.filter((e) => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0);
      const expenseEntries = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0);
      const totalIncome = revenue + incomeEntries;
      const totalExpense = salaryPayout + expenseEntries;
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

      ledger.sort((a, b) => b.rawDate - a.rawDate);

      headers = ['Date', 'Source', 'Type', 'Category', 'Title', 'Amount', 'Note'];
      rows = [
        ['Summary', 'System', 'income', 'Revenue', 'Revenue (paid invoices)', revenue, ''],
        ['Summary', 'System', 'expense', 'Salary', 'Salary payout', salaryPayout, ''],
        ['Summary', 'System', 'income', 'Finance Entries', 'Other income entries', incomeEntries, ''],
        ['Summary', 'System', 'expense', 'Finance Entries', 'Other expense entries', expenseEntries, ''],
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

