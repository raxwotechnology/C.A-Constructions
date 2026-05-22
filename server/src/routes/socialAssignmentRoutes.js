const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAssignments,
  createAssignment,
  deleteAssignment,
  getMyAssignedPlatforms,
} = require('../controllers/socialAssignmentController');

// Admin/Manager: manage all assignments
router.get('/', protect, authorize('admin', 'manager'), getAssignments);
router.post('/', protect, authorize('admin', 'manager'), createAssignment);
router.delete('/:id', protect, authorize('admin', 'manager'), deleteAssignment);

// Any logged-in employee: see their own assigned platforms
router.get('/my-platforms', protect, getMyAssignedPlatforms);

module.exports = router;
