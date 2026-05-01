const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/appointment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// Services
router.get('/services', ctrl.getServices);
router.post('/services', authorize('admin'), ctrl.createService);
router.put('/services/:id', authorize('admin'), ctrl.updateService);
router.delete('/services/:id', authorize('admin'), ctrl.deleteService);

// Appointments
router.get('/stats', authorize('admin', 'manager'), ctrl.getStats);
router.get('/', ctrl.getAppointments);
router.post('/', ctrl.createAppointment);
router.put('/:id', ctrl.updateAppointment);
router.patch('/:id/cancel', ctrl.cancelAppointment);

module.exports = router;
