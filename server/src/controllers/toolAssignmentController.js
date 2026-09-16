const ToolAssignment = require('../models/ToolAssignment');
const Employee = require('../models/Employee');
const { createNotification } = require('../services/notificationService');
const User = require('../models/User');
const { resolveEmployeeForUser } = require('../utils/employeeResolver');

function getEmailService() {
  return require('../services/emailService');
}

async function notifyToolAssigned(empUser, toolName, accessUrl) {
  if (!empUser?.email) return;
  try {
    const { sendToolAssignedEmail } = getEmailService();
    if (typeof sendToolAssignedEmail !== 'function') {
      console.warn('[ToolAssignment] sendToolAssignedEmail not exported from emailService');
      return;
    }
    await sendToolAssignedEmail(empUser.email, empUser.name, toolName, accessUrl);
  } catch (err) {
    console.error('[ToolAssignment] Email notification failed:', err?.message || err);
  }
}

async function notifyToolRevoked(empUser, toolName) {
  if (!empUser?.email) return;
  try {
    const { sendToolRevokedEmail } = getEmailService();
    if (typeof sendToolRevokedEmail !== 'function') {
      console.warn('[ToolAssignment] sendToolRevokedEmail not exported from emailService');
      return;
    }
    await sendToolRevokedEmail(empUser.email, empUser.name, toolName);
  } catch (err) {
    console.error('[ToolAssignment] Revocation email failed:', err?.message || err);
  }
}

// Create tool assignment (Admin/Manager)
exports.createAssignment = async (req, res, next) => {
  try {
    const { employee, toolName, toolType, accountEmail, accountPassword, accessUrl, licenseKey, notes, expiresAt } = req.body;

    const emp = await Employee.findById(employee).populate('userId', 'name role');
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
    const userId = emp.userId?._id || emp.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Employee has no linked user account' });
    }

    const assignment = await ToolAssignment.create({
      employee,
      toolName,
      toolType: toolType || 'other',
      accountEmail: accountEmail || '',
      accountPassword: accountPassword || '',
      accessUrl: accessUrl || '',
      licenseKey: licenseKey || '',
      assignedBy: req.user._id,
      status: 'active',
      notes: notes || '',
      expiresAt: expiresAt || null,
    });

    await createNotification({
      recipient: userId,
      title: `Tool Assigned: ${toolName} 🔑`,
      message: `You have been assigned access to ${toolName}. Check your profile for credentials.`,
      type: 'system',
      link: `/${emp.userId?.role || 'developer'}/profile`,
    }).catch(() => {});

    const empUser = await User.findById(userId).select('email name');
    void notifyToolAssigned(empUser, toolName, accessUrl);

    res.status(201).json({ success: true, assignment });
  } catch (err) { next(err); }
};

// Get all assignments (Admin/Manager)
exports.getAllAssignments = async (req, res, next) => {
  try {
    const { employeeId, status } = req.query;
    const query = {};
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    const assignments = await ToolAssignment.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar role' } })
      .populate('assignedBy', 'name')
      .populate('revokedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, assignments });
  } catch (err) { next(err); }
};

// Get my assigned tools (Employee)
exports.getMyAssignments = async (req, res, next) => {
  try {
    const employee = await resolveEmployeeForUser(req.user);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const assignments = await ToolAssignment.find({ employee: employee._id, status: 'active' })
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, assignments });
  } catch (err) { next(err); }
};

// Update assignment
exports.updateAssignment = async (req, res, next) => {
  try {
    const assignment = await ToolAssignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, assignment });
  } catch (err) { next(err); }
};

// Revoke assignment
exports.revokeAssignment = async (req, res, next) => {
  try {
    const assignment = await ToolAssignment.findByIdAndUpdate(
      req.params.id,
      { status: 'revoked', revokedAt: new Date(), revokedBy: req.user._id },
      { new: true }
    ).populate({ path: 'employee', populate: { path: 'userId', select: '_id name' } });

    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (assignment.employee?.userId) {
      await createNotification({
        recipient: assignment.employee.userId._id || assignment.employee.userId,
        title: `Tool Access Revoked: ${assignment.toolName}`,
        message: `Your access to ${assignment.toolName} has been revoked by ${req.user.name}.`,
        type: 'system',
        link: '/developer/profile',
      }).catch(() => {});

      const revokeUserId = assignment.employee.userId._id || assignment.employee.userId;
      const empUser = await User.findById(revokeUserId).select('email name');
      void notifyToolRevoked(empUser, assignment.toolName);
    }

    res.json({ success: true, assignment });
  } catch (err) { next(err); }
};

// Delete assignment
exports.deleteAssignment = async (req, res, next) => {
  try {
    await ToolAssignment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) { next(err); }
};
