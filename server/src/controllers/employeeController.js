const Employee = require('../models/Employee');
const User = require('../models/User');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Performance = require('../models/Performance');

// @desc    Get all employees
// @route   GET /api/employees
exports.getEmployees = async (req, res, next) => {
  try {
    const { department, status, search, branch, employmentType, includeFormer } = req.query;
    let query = {};
    if (department) query.department = department;
    if (branch) query.branch = branch;
    if (employmentType) query.employmentType = employmentType;
    if (status) query.status = status;
    // By default hide former/terminated employees unless explicitly requested
    if (!status && !includeFormer) query.status = { $nin: ['former', 'terminated', 'resigned', 'intern_ended'] };

    let employees = await Employee.find(query)
      .populate('userId', 'name email phone avatar role')
      .populate('manager', 'name email')
      .sort({ createdAt: -1 });

    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        e.userId?.name?.toLowerCase().includes(s) ||
        e.employeeNo?.toLowerCase().includes(s) ||
        e.department?.toLowerCase().includes(s) ||
        e.designation?.toLowerCase().includes(s)
      );
    }
    res.json({ success: true, count: employees.length, employees });
  } catch (err) { next(err); }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
exports.getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('userId', 'name email phone avatar role')
      .populate('manager', 'name email');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, employee });
  } catch (err) { next(err); }
};

// @desc    Get my employee profile
// @route   GET /api/employees/me
exports.getMyProfile = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id })
      .populate('userId', 'name email phone avatar role')
      .populate('manager', 'name email');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });
    res.json({ success: true, employee });
  } catch (err) { next(err); }
};

// @desc    Create employee
// @route   POST /api/employees
exports.createEmployee = async (req, res, next) => {
  try {
    const {
      name, email, password, role, department, designation, basicSalary, allowances, joinedDate,
      idType, idNumber, nic, dob, gender, address, primaryPhone, secondaryPhone, cvUrl,
      emergencyContact, bank, bankBranch, accountNumber, skills, manager,
    } = req.body;

    // Create user account
    let user = await User.findOne({ email });
    if (!user) {
      const requestedRole = role || 'developer';
      const allowedRoles = ['developer', 'designer', 'marketing', 'manager', 'admin'];
      let safeRole = allowedRoles.includes(requestedRole) ? requestedRole : 'developer';
      if (safeRole === 'admin' && req.user.role !== 'admin') safeRole = 'developer';
      user = await User.create({ name, email, password: password || 'Raxwo@2026', role: safeRole });
    } else if (role && req.user.role === 'admin') {
      // Admin can update an existing user's role when creating the employee profile
      await User.findByIdAndUpdate(user._id, { role, ...(name ? { name } : {}) });
      user = await User.findById(user._id);
    } else if (name && user.name !== name) {
      // Ensure correct employee name mapping (fixes "Admin User" showing due to reused accounts)
      user.name = name;
      await user.save({ validateBeforeSave: false });
    }

    const employeeCount = await Employee.countDocuments();
    const employeeNo = `EMP${String(employeeCount + 1).padStart(4, '0')}`;

    const employee = await Employee.create({
      userId: user._id, employeeNo, department, designation,
      basicSalary: basicSalary || 0, allowances: allowances || 0,
      joinedDate,
      idType: idType || 'nic',
      idNumber: idNumber || nic || '',
      nic: nic || idNumber || '',
      dob,
      gender,
      address,
      primaryPhone: primaryPhone || '',
      secondaryPhone: secondaryPhone || '',
      cvUrl: cvUrl || '',
      emergencyContact: emergencyContact || undefined,
      bank,
      bankBranch,
      accountNumber,
      skills: skills ? skills.split(',').map(s => s.trim()) : [],
      manager,
    });

    const populated = await employee.populate('userId', 'name email phone avatar role');
    res.status(201).json({ success: true, employee: populated });
  } catch (err) { next(err); }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
exports.updateEmployee = async (req, res, next) => {
  try {
    // Update role on linked user if provided (admin/manager only)
    if (req.body.role) {
      const employeeDoc = await Employee.findById(req.params.id);
      if (employeeDoc) {
        await User.findByIdAndUpdate(employeeDoc.userId, { role: req.body.role });
      }
      delete req.body.role;
    }

    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('userId', 'name email phone avatar role');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, employee });
  } catch (err) { next(err); }
};

// @desc    Soft delete employee (status = former, retains all data)
// @route   DELETE /api/employees/:id
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        status: 'former',
        $push: {
          historyLog: {
            action: 'terminated',
            note: req.body.reason || 'Employee removed',
            performedBy: req.user._id,
            date: new Date(),
          },
        },
      },
      { new: true }
    );
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee marked as former. All data retained.' });
  } catch (err) { next(err); }
};

// @desc    Convert intern to permanent employee
// @route   PUT /api/employees/:id/convert-intern
exports.convertIntern = async (req, res, next) => {
  try {
    const { newStartDate } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (employee.employmentType !== 'intern') {
      return res.status(400).json({ success: false, message: 'Employee is not an intern' });
    }
    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        employmentType: 'permanent',
        status: 'active',
        joinedDate: newStartDate ? new Date(newStartDate) : new Date(),
        'internship.convertedAt': new Date(),
        'internship.convertedBy': req.user._id,
        $push: {
          historyLog: {
            action: 'converted_to_permanent',
            note: `Converted from intern to permanent on ${new Date().toLocaleDateString()}`,
            performedBy: req.user._id,
            date: new Date(),
          },
        },
      },
      { new: true }
    ).populate('userId', 'name email role');
    res.json({ success: true, employee: updated, message: 'Intern converted to permanent employee' });
  } catch (err) { next(err); }
};

// @desc    Remove intern (soft delete — data retained)
// @route   PUT /api/employees/:id/remove-intern
exports.removeIntern = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (employee.employmentType !== 'intern') {
      return res.status(400).json({ success: false, message: 'Employee is not an intern' });
    }
    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        status: 'intern_ended',
        'internship.removalReason': req.body.reason || 'Internship ended',
        $push: {
          historyLog: {
            action: 'intern_removed',
            note: req.body.reason || 'Internship period ended',
            performedBy: req.user._id,
            date: new Date(),
          },
        },
      },
      { new: true }
    );
    res.json({ success: true, employee: updated, message: 'Intern removed. All attendance, payroll, and project data retained.' });
  } catch (err) { next(err); }
};

// @desc    Get department stats
// @route   GET /api/employees/stats
exports.getStats = async (req, res, next) => {
  try {
    const total = await Employee.countDocuments();
    const active = await Employee.countDocuments({ status: 'active' });
    const byDept = await Employee.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, stats: { total, active, byDept } });
  } catch (err) { next(err); }
};

// @desc    Get employee activity overview (admin/manager)
// @route   GET /api/employees/:id/activity
exports.getEmployeeActivity = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('userId', 'name email role');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const userId = employee.userId?._id;

    const projects = await Project.find({ assignedEmployees: userId })
      .select('title status progress deadline startDate tasks client projectManager')
      .populate('client', 'name email')
      .populate('projectManager', 'name email')
      .populate('tasks.assignedTo', 'name email')
      .sort({ updatedAt: -1 })
      .limit(50);

    const tasks = projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t.toObject(), projectId: p._id, projectTitle: p.title })));
    const myTasks = tasks.filter((t) => String(t.assignedTo?._id || t.assignedTo) === String(userId));
    const tasksCompleted = myTasks.filter((t) => t.status === 'done').length;
    const tasksPending = myTasks.filter((t) => t.status !== 'done').length;

    const attendance30dStart = new Date();
    attendance30dStart.setDate(attendance30dStart.getDate() - 30);

    const attendance = await Attendance.find({ employee: employee._id, date: { $gte: attendance30dStart } })
      .sort({ date: -1 })
      .limit(120);

    const attendanceSummary = attendance.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 }).limit(50);
    const leaveSummary = leaves.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});

    const payrolls = await Payroll.find({ employee: employee._id }).sort({ year: -1, month: -1 }).limit(12);

    const performance = userId
      ? await Performance.find({ developer: userId }).populate('project', 'title status').sort({ year: -1, month: -1 }).limit(12)
      : [];

    res.json({
      success: true,
      employee,
      overview: {
        projectsCount: projects.length,
        tasksCompleted,
        tasksPending,
        attendance30d: attendanceSummary,
        leaves: leaveSummary,
        lastPayroll: payrolls[0] || null,
        performanceLatest: performance[0] || null,
      },
      projects,
      tasks: myTasks.slice(0, 200),
      attendance,
      leaves,
      payrolls,
      performance,
    });
  } catch (err) { next(err); }
};
