const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getPolicies, createPolicy, updatePolicy, deletePolicy } = require('../controllers/attendancePolicyController');

router.get('/',       protect, authorize('admin'), getPolicies);
router.post('/',      protect, authorize('admin'), createPolicy);
router.put('/:id',    protect, authorize('admin'), updatePolicy);
router.delete('/:id', protect, authorize('admin'), deletePolicy);

module.exports = router;
