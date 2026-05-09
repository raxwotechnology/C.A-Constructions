const express = require('express');
const router = express.Router();
const {
  getEmployees, getEmployee, getMyProfile, createEmployee,
  updateEmployee, deleteEmployee, getStats, getEmployeeActivity,
  convertIntern, removeIntern,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats', protect, authorize('admin', 'manager'), getStats);
router.get('/me', protect, getMyProfile);
router.get('/', protect, authorize('admin', 'manager'), getEmployees);
router.get('/:id/activity', protect, authorize('admin', 'manager'), getEmployeeActivity);
router.get('/:id', protect, getEmployee);
router.post('/', protect, authorize('admin', 'manager'), createEmployee);
router.put('/:id/convert-intern', protect, authorize('admin'), convertIntern);
router.put('/:id/remove-intern', protect, authorize('admin'), removeIntern);
router.put('/:id', protect, authorize('admin', 'manager'), updateEmployee);
router.delete('/:id', protect, authorize('admin'), deleteEmployee);

module.exports = router;
