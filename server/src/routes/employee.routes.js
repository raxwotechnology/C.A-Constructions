const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/employee.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadEmployeeFiles } = require('../middleware/upload.middleware');

router.use(protect);

router.get('/stats', authorize('admin'), ctrl.getStats);
router.get('/', ctrl.getEmployees);
router.get('/:id', ctrl.getEmployee);
router.post('/', authorize('admin'), uploadEmployeeFiles('developers'), ctrl.createEmployee);
router.put('/:id', authorize('admin'), uploadEmployeeFiles('developers'), ctrl.updateEmployee);
router.patch('/:id/toggle-status', authorize('admin'), ctrl.toggleStatus);
router.delete('/:id', authorize('admin'), ctrl.deleteEmployee);

module.exports = router;
