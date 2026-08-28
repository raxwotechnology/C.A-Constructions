const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  listConfigs, createConfig, updateConfig, deleteConfig,
  listProfiles, getProfile, upsertProfile, deleteProfile,
  calculateForEmployee, generateMonthlyRecords, listRecords, getRecord, updateRecord, deleteRecord, remitTaxPayment,
  getReport, exportReportData,
} = require('../controllers/incomeTaxController');

router.use(protect, authorize('admin', 'manager'));

router.get('/configs', listConfigs);
router.post('/configs', createConfig);
router.put('/configs/:id', updateConfig);
router.delete('/configs/:id', deleteConfig);

router.get('/profiles', listProfiles);
router.get('/profiles/:id', getProfile);
router.post('/profiles', upsertProfile);
router.put('/profiles/:id', upsertProfile);
router.delete('/profiles/:id', deleteProfile);

router.post('/calculate', calculateForEmployee);
router.post('/generate', generateMonthlyRecords);
router.get('/records', listRecords);
router.get('/records/:id', getRecord);
router.put('/records/:id', updateRecord);
router.delete('/records/:id', deleteRecord);
router.post('/remit', remitTaxPayment);

router.get('/reports', getReport);
router.get('/reports/export', exportReportData);

module.exports = router;
