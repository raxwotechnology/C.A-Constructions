const puppeteer = require('puppeteer');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Project = require('../models/Project');

function fileSafe(s) {
  return String(s || '').replace(/[^a-z0-9_\-]+/gi, '_').slice(0, 64);
}

async function getDeveloperContext(userId) {
  const employee = await Employee.findOne({ userId }).populate('userId', 'name email role');
  if (!employee) return { employee: null, userId };

  const projects = await Project.find({ assignedEmployees: userId })
    .select('title status progress deadline startDate completedAt tasks updatedAt')
    .sort({ updatedAt: -1 })
    .limit(100);

  const tasks = projects.flatMap((p) => (p.tasks || []).filter((t) => String(t.assignedTo) === String(userId)).map((t) => ({
    _id: t._id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    completedAt: t.completedAt,
    projectId: p._id,
    projectTitle: p.title,
  })));

  const attendance = await Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(365);
  const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 }).limit(200);
  const payrolls = await Payroll.find({ employee: employee._id }).sort({ year: -1, month: -1 }).limit(24);

  return { employee, projects, tasks, attendance, leaves, payrolls, userId };
}

async function getEmployeeContextById(employeeId) {
  const employee = await Employee.findById(employeeId).populate('userId', 'name email role');
  if (!employee) return { employee: null };
  const userId = employee.userId?._id;
  const projects = await Project.find({ assignedEmployees: userId })
    .select('title status progress deadline startDate completedAt tasks updatedAt')
    .sort({ updatedAt: -1 })
    .limit(100);
  const tasks = projects.flatMap((p) => (p.tasks || []).filter((t) => String(t.assignedTo) === String(userId)).map((t) => ({
    _id: t._id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    completedAt: t.completedAt,
    projectId: p._id,
    projectTitle: p.title,
  })));
  const attendance = await Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(365);
  const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 }).limit(200);
  const payrolls = await Payroll.find({ employee: employee._id }).sort({ year: -1, month: -1 }).limit(24);
  return { employee, projects, tasks, attendance, leaves, payrolls, userId };
}

function toCategoryPayload(category, ctx) {
  switch (category) {
    case 'salary':
      return { employee: ctx.employee, payrolls: ctx.payrolls };
    case 'attendance':
      return { employee: ctx.employee, attendance: ctx.attendance };
    case 'leaves':
      return { employee: ctx.employee, leaves: ctx.leaves };
    case 'epf':
      return {
        employee: ctx.employee,
        epfEtf: (ctx.payrolls || []).map((p) => ({
          month: p.month,
          year: p.year,
          basicSalary: p.basicSalary,
          epfEmployee: p.epfEmployee,
          epfEmployer: p.epfEmployer,
          etfEmployer: p.etfEmployer,
        })),
      };
    case 'projects':
      return { employee: ctx.employee, projects: ctx.projects, tasks: ctx.tasks };
    default:
      return null;
  }
}

function renderHtml(category, payload) {
  const titleMap = {
    salary: 'Salary Reports',
    attendance: 'Attendance Reports',
    leaves: 'Leave Reports',
    epf: 'EPF / ETF Summary',
    projects: 'Project History',
  };
  const title = titleMap[category] || 'Export';
  const name = payload?.employee?.userId?.name || 'Employee';
  const empNo = payload?.employee?.employeeNo || '';
  const gen = new Date().toLocaleString();

  const style = `
    <style>
      * { box-sizing: border-box; }
      body { font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 0; padding: 28px; }
      .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
      .brand { font-weight: 800; font-size: 16px; letter-spacing: 0.3px; }
      .muted { color: #64748b; font-size: 12px; }
      h1 { margin: 0; font-size: 20px; }
      .pill { display:inline-block; padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 12px; color:#334155; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; vertical-align: top; }
      th { background: #f8fafc; text-align: left; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
      .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; background: #ffffff; }
      .k { font-size: 12px; color: #64748b; }
      .v { font-size: 16px; font-weight: 800; margin-top: 4px; }
      .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; color:#64748b; }
    </style>
  `;

  const safe = (v) => (v === null || v === undefined ? '' : String(v));
  const money = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

  let content = '';
  if (category === 'salary') {
    const rows = (payload.payrolls || []).map((p) => `
      <tr>
        <td>${p.month}/${p.year}</td>
        <td>${money(p.basicSalary)}</td>
        <td>${money(p.allowances)}</td>
        <td>${money(p.epfEmployee)}</td>
        <td>${money(p.netSalary)}</td>
        <td>${safe(p.status)}</td>
      </tr>
    `).join('');
    content = `
      <div class="grid">
        <div class="card"><div class="k">Payroll records</div><div class="v">${(payload.payrolls || []).length}</div></div>
        <div class="card"><div class="k">Latest net</div><div class="v">${payload.payrolls?.[0] ? money(payload.payrolls[0].netSalary) : '—'}</div></div>
        <div class="card"><div class="k">Latest status</div><div class="v">${payload.payrolls?.[0]?.status || '—'}</div></div>
      </div>
      <table>
        <thead><tr><th>Month</th><th>Basic</th><th>Allowances</th><th>EPF (emp)</th><th>Net</th><th>Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">No payroll records</td></tr>'}</tbody>
      </table>
    `;
  } else if (category === 'attendance') {
    const rows = (payload.attendance || []).map((a) => `
      <tr>
        <td>${new Date(a.date).toLocaleDateString()}</td>
        <td>${safe(a.status)}</td>
        <td>${a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—'}</td>
        <td>${a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—'}</td>
        <td>${safe(a.notes)}</td>
      </tr>
    `).join('');
    content = `
      <div class="grid">
        <div class="card"><div class="k">Records</div><div class="v">${(payload.attendance || []).length}</div></div>
        <div class="card"><div class="k">Present</div><div class="v">${(payload.attendance || []).filter(x => x.status === 'present').length}</div></div>
        <div class="card"><div class="k">Absent</div><div class="v">${(payload.attendance || []).filter(x => x.status === 'absent').length}</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Status</th><th>Check-in</th><th>Check-out</th><th>Notes</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">No attendance records</td></tr>'}</tbody>
      </table>
    `;
  } else if (category === 'leaves') {
    const rows = (payload.leaves || []).map((l) => `
      <tr>
        <td>${safe(l.leaveType)}</td>
        <td>${new Date(l.startDate).toLocaleDateString()} → ${new Date(l.endDate).toLocaleDateString()}</td>
        <td>${safe(l.days)}</td>
        <td>${safe(l.status)}</td>
        <td>${safe(l.reason)}</td>
      </tr>
    `).join('');
    content = `
      <div class="grid">
        <div class="card"><div class="k">Requests</div><div class="v">${(payload.leaves || []).length}</div></div>
        <div class="card"><div class="k">Approved</div><div class="v">${(payload.leaves || []).filter(x => x.status === 'approved').length}</div></div>
        <div class="card"><div class="k">Pending</div><div class="v">${(payload.leaves || []).filter(x => x.status === 'pending').length}</div></div>
      </div>
      <table>
        <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th>Reason</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">No leave records</td></tr>'}</tbody>
      </table>
    `;
  } else if (category === 'epf') {
    const rows = (payload.epfEtf || []).map((p) => `
      <tr>
        <td>${p.month}/${p.year}</td>
        <td>${money(p.basicSalary)}</td>
        <td>${money(p.epfEmployee)}</td>
        <td>${money(p.epfEmployer)}</td>
        <td>${money(p.etfEmployer)}</td>
      </tr>
    `).join('');
    content = `
      <div class="grid">
        <div class="card"><div class="k">Records</div><div class="v">${(payload.epfEtf || []).length}</div></div>
        <div class="card"><div class="k">Total EPF (emp)</div><div class="v">${money((payload.epfEtf || []).reduce((a,b)=>a+(b.epfEmployee||0),0))}</div></div>
        <div class="card"><div class="k">Total ETF</div><div class="v">${money((payload.epfEtf || []).reduce((a,b)=>a+(b.etfEmployer||0),0))}</div></div>
      </div>
      <table>
        <thead><tr><th>Month</th><th>Basic</th><th>EPF (emp)</th><th>EPF (employer)</th><th>ETF (employer)</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">No EPF/ETF records</td></tr>'}</tbody>
      </table>
    `;
  } else if (category === 'projects') {
    const rows = (payload.projects || []).map((p) => `
      <tr>
        <td>${safe(p.title)}</td>
        <td>${safe(p.status)}</td>
        <td>${safe(p.progress)}%</td>
        <td>${p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}</td>
      </tr>
    `).join('');
    content = `
      <div class="grid">
        <div class="card"><div class="k">Projects</div><div class="v">${(payload.projects || []).length}</div></div>
        <div class="card"><div class="k">Tasks</div><div class="v">${(payload.tasks || []).length}</div></div>
        <div class="card"><div class="k">Completed tasks</div><div class="v">${(payload.tasks || []).filter(x => x.status === 'done').length}</div></div>
      </div>
      <table>
        <thead><tr><th>Project</th><th>Status</th><th>Progress</th><th>Deadline</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">No projects</td></tr>'}</tbody>
      </table>
    `;
  }

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        ${style}
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Raxwo</div>
            <div class="muted">${safe(name)} ${empNo ? `• ${safe(empNo)}` : ''}</div>
          </div>
          <div style="text-align:right">
            <h1>${title}</h1>
            <div class="muted">Generated: ${safe(gen)}</div>
            <div style="margin-top:6px"><span class="pill">${safe(category).toUpperCase()}</span></div>
          </div>
        </div>
        ${content}
        <div class="footer">This report is system-generated for internal use.</div>
      </body>
    </html>
  `;
}

// @desc    Export category as JSON (developer)
// @route   GET /api/exports/:category/json
exports.exportJson = async (req, res, next) => {
  try {
    const category = String(req.params.category || '').toLowerCase();
    const ctx = await getDeveloperContext(req.user._id);
    if (!ctx.employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const payload = toCategoryPayload(category, ctx);
    if (!payload) return res.status(400).json({ success: false, message: 'Invalid export category' });

    const filename = `raxwo_${fileSafe(category)}_${fileSafe(ctx.employee.employeeNo)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify({ success: true, category, generatedAt: new Date().toISOString(), data: payload }, null, 2));
  } catch (err) { next(err); }
};

// @desc    Export category as PDF (developer)
// @route   GET /api/exports/:category/pdf
exports.exportPdf = async (req, res, next) => {
  try {
    const category = String(req.params.category || '').toLowerCase();
    const ctx = await getDeveloperContext(req.user._id);
    if (!ctx.employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const payload = toCategoryPayload(category, ctx);
    if (!payload) return res.status(400).json({ success: false, message: 'Invalid export category' });

    const html = renderHtml(category, payload);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) { next(err); }
};

// @desc    Admin export employee data (json/pdf)
// @route   GET /api/exports/admin/:employeeId/:category/:format
exports.adminEmployeeExport = async (req, res, next) => {
  try {
    const { employeeId, category, format } = req.params;
    const cat = String(category || '').toLowerCase();
    const fmt = String(format || '').toLowerCase();

    const ctx = await getEmployeeContextById(employeeId);
    if (!ctx.employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const payload = toCategoryPayload(cat, ctx);
    if (!payload) return res.status(400).json({ success: false, message: 'Invalid export category' });

    if (fmt === 'json') {
      const filename = `raxwo_admin_${fileSafe(cat)}_${fileSafe(ctx.employee.employeeNo)}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(JSON.stringify({ success: true, category: cat, generatedAt: new Date().toISOString(), data: payload }, null, 2));
    }

    if (fmt === 'pdf') {
      const html = renderHtml(cat, payload);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    return res.status(400).json({ success: false, message: 'Invalid export format' });
  } catch (err) { next(err); }
};

