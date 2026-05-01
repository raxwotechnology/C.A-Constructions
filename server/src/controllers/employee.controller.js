const User = require('../models/User.model');
const path = require('path');

// Helper to build file URL
const fileUrl = (req, filePath) => filePath
  ? `${req.protocol}://${req.get('host')}/uploads/${filePath}`
  : null;

// @desc    Get all employees (filtered by type)
// @route   GET /api/employees
exports.getEmployees = async (req, res) => {
  try {
    const { type, search, status, page = 1, limit = 20 } = req.query;
    const filter = { userType: { $in: ['developer', 'manager', 'marketing_designer'] } };

    if (type && ['developer', 'manager', 'marketing_designer'].includes(type)) {
      filter.userType = type;
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const employees = await User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: employees,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
exports.getEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee || !['developer', 'manager', 'marketing_designer'].includes(employee.userType)) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create employee
// @route   POST /api/employees
exports.createEmployee = async (req, res) => {
  try {
    const { fullName, email, phone, password, userType, department, position, salary, skills, experience, joiningDate, dateOfBirth } = req.body;

    if (!['developer', 'manager', 'marketing_designer'].includes(userType)) {
      return res.status(400).json({ success: false, message: 'Invalid employee type' });
    }

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email or phone already registered' });
    }

    const employeeData = {
      fullName, email, phone,
      password: password || phone, // Default password = phone number
      userType, department, position,
      salary: parseFloat(salary) || 0,
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []),
      experience, joiningDate, dateOfBirth
    };

    // Handle uploaded files
    if (req.files) {
      if (req.files.photo) employeeData.photo = `${userType}s/images/${req.files.photo[0].filename}`;
      if (req.files.cv) employeeData.cvFile = `${userType}s/cv/${req.files.cv[0].filename}`;
      if (req.files.agreement) employeeData.companyAgreement = `${userType}s/agreements/${req.files.agreement[0].filename}`;
    }

    const employee = await User.create(employeeData);
    res.status(201).json({ success: true, message: 'Employee created successfully', data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const updates = { ...req.body };
    delete updates.password; // Never update password through this endpoint
    delete updates._id;

    if (req.files) {
      const folder = employee.userType + 's';
      if (req.files.photo) updates.photo = `${folder}/images/${req.files.photo[0].filename}`;
      if (req.files.cv) updates.cvFile = `${folder}/cv/${req.files.cv[0].filename}`;
      if (req.files.agreement) updates.companyAgreement = `${folder}/agreements/${req.files.agreement[0].filename}`;
    }

    if (updates.skills && typeof updates.skills === 'string') {
      updates.skills = updates.skills.split(',').map(s => s.trim());
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json({ success: true, message: 'Employee updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle employee active status
// @route   PATCH /api/employees/:id/toggle-status
exports.toggleStatus = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    employee.isActive = !employee.isActive;
    await employee.save();

    res.json({ success: true, message: `Employee ${employee.isActive ? 'activated' : 'deactivated'}`, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get employee stats
// @route   GET /api/employees/stats
exports.getStats = async (req, res) => {
  try {
    const [total, developers, managers, designers, active, inactive] = await Promise.all([
      User.countDocuments({ userType: { $in: ['developer', 'manager', 'marketing_designer'] } }),
      User.countDocuments({ userType: 'developer' }),
      User.countDocuments({ userType: 'manager' }),
      User.countDocuments({ userType: 'marketing_designer' }),
      User.countDocuments({ userType: { $in: ['developer', 'manager', 'marketing_designer'] }, isActive: true }),
      User.countDocuments({ userType: { $in: ['developer', 'manager', 'marketing_designer'] }, isActive: false }),
    ]);

    res.json({ success: true, data: { total, developers, managers, designers, active, inactive } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
