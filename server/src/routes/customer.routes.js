const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// Get all customers
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { userType: 'customer' };
    if (search) filter.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const customers = await User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });
    res.json({ success: true, data: customers, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, userType: 'customer' });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; delete updates.userType;
    const customer = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, data: customer });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Set discount
router.patch('/:id/discount', authorize('admin'), async (req, res) => {
  try {
    const customer = await User.findByIdAndUpdate(req.params.id, { discount: req.body.discount }, { new: true });
    res.json({ success: true, message: 'Discount updated', data: customer });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
