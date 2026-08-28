const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const toolController = require('../controllers/toolAssignmentController');

router.use(protect);

// Employee view
router.get('/my', authorize('developer', 'designer', 'marketing', 'manager'), toolController.getMyAssignments);

// Admin/Manager management
router.post('/', authorize('admin', 'manager'), toolController.createAssignment);
router.get('/', authorize('admin', 'manager'), toolController.getAllAssignments);
router.put('/:id', authorize('admin', 'manager'), toolController.updateAssignment);
router.put('/:id/revoke', authorize('admin', 'manager'), toolController.revokeAssignment);
router.delete('/:id', authorize('admin'), toolController.deleteAssignment);

module.exports = router;
