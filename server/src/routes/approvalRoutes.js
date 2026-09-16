const express = require('express');
const router = express.Router();
const { getPendingApprovals, transitionApprovalState } = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/auth');

router.get('/pending', protect, getPendingApprovals);
router.put('/:id/transition', protect, authorize('Supervisor', 'Engineer', 'Project Manager', 'Accountant', 'CEO', 'Admin'), transitionApprovalState);

module.exports = router;
