const express = require('express');
const router = express.Router();
const { getJobs, getJob, createJob, updateJob, deleteJob, applyForJob, getApplications, getApplication, updateApplicationStatus, getJobRanking } = require('../controllers/recruitmentController');
const { protect, authorize } = require('../middleware/auth');
const { uploadCV } = require('../middleware/upload');

// Public job routes
router.get('/jobs', getJobs);
router.get('/jobs/:id', getJob);
router.get('/jobs/:id/ranking', protect, authorize('admin', 'manager'), getJobRanking);

// Protected job management
router.post('/jobs', protect, authorize('admin', 'manager'), createJob);
router.put('/jobs/:id', protect, authorize('admin', 'manager'), updateJob);
router.delete('/jobs/:id', protect, authorize('admin'), deleteJob);

// Applications - public apply
router.post('/apply/:jobId', uploadCV, applyForJob);

// Applications management - protected
router.get('/applications', protect, authorize('admin', 'manager'), getApplications);
router.get('/applications/:id', protect, authorize('admin', 'manager'), getApplication);
router.put('/applications/:id/status', protect, authorize('admin', 'manager'), updateApplicationStatus);

module.exports = router;
