const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

// Overtime routes (also exposed via /api/salary/overtime — this standalone route is for dedicated pages)
const { Overtime } = require('../models/Salary.model');
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    if (req.user.userType !== 'admin') filter.employee = req.user._id;
    const records = await Overtime.find(filter).populate('employee', 'fullName employeeId userType').populate('approvedBy', 'fullName').sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
