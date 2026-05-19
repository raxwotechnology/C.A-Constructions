const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const SmsLog = require('../models/SmsLog');
const { sendSms } = require('../services/smsService');
const SiteSetting = require('../models/SiteSetting');

// Get SMS logs
router.get('/logs', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { status, module, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (module) query.module = module;
    if (search) {
      query.$or = [
        { recipientName: { $regex: search, $options: 'i' } },
        { recipientPhone: { $regex: search, $options: 'i' } },
      ];
    }
    
    const logs = await SmsLog.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) { next(err); }
});

// Resend failed SMS
router.post('/resend/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const log = await SmsLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    
    const success = await sendSms(log.recipientPhone, log.message, log.recipientName, log.module);
    res.json({ success: true, message: success ? 'SMS resent successfully' : 'SMS resend failed' });
  } catch (err) { next(err); }
});

// Get preferences
router.get('/preferences', protect, authorize('admin'), async (req, res, next) => {
  try {
    const settings = await SiteSetting.findOne();
    res.json({ 
      success: true, 
      smsEnabled: settings?.smsEnabled ?? true,
      smsModules: settings?.smsModules || { payroll: true, leave: true, project: true, hr: true, finance: true }
    });
  } catch (err) { next(err); }
});

// Update preferences
router.put('/preferences', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { smsEnabled, smsModules } = req.body;
    let settings = await SiteSetting.findOne();
    if (!settings) {
      settings = new SiteSetting();
    }
    settings.smsEnabled = smsEnabled !== undefined ? smsEnabled : settings.smsEnabled;
    if (smsModules) {
      settings.smsModules = { ...settings.smsModules, ...smsModules };
    }
    await settings.save();
    res.json({ success: true, message: 'Preferences updated', settings });
  } catch (err) { next(err); }
});

module.exports = router;
