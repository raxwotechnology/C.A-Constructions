const Request = require('../models/Request');
const AuditLog = require('../models/AuditLog');

/**
 * Get all pending approvals filtered by role stage
 */
const getPendingApprovals = async (req, res) => {
  try {
    const { type, stage } = req.query;
    const filter = { status: { $ne: 'Rejected' } };

    if (type) filter.type = type;
    if (stage) filter.approvalStage = stage;

    const requests = await Request.find(filter)
      .populate('user', 'name email role')
      .populate('project', 'name code')
      .sort({ createdAt: -1 });

    return res.json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Transition approval state (Supervisor Approved -> Manager Approved -> Director Approved)
 */
const transitionApprovalState = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'APPROVE' or 'REJECT'
    const userRole = req.user.role;

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (action === 'REJECT') {
      request.status = 'Rejected';
      request.comments = comments || 'Rejected by ' + userRole;
      await request.save();
      return res.json({ success: true, message: 'Request rejected', request });
    }

    // Multi-stage progression: Supervisor -> Manager -> Director -> Approved
    if (userRole === 'Supervisor' || userRole === 'Engineer') {
      request.status = 'Supervisor Approved';
    } else if (userRole === 'Project Manager' || userRole === 'Accountant') {
      request.status = 'Manager Approved';
    } else if (userRole === 'CEO' || userRole === 'Admin') {
      request.status = 'Director Approved';
    }

    if (comments) request.comments = comments;
    await request.save();

    // Log to Audit Trail
    await AuditLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: `APPROVAL_TRANSITION_${request.status.toUpperCase().replace(/\s+/g, '_')}`,
      module: 'Approval System',
      details: { requestId: request._id, status: request.status, comments }
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Request status transitioned to '${request.status}'`,
      request
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getPendingApprovals, transitionApprovalState };
