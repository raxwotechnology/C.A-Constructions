const express = require('express');
const router = express.Router();
const { exportToExcel, exportToPDF } = require('../controllers/exportController');
const { authenticateJWT } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

// PDF and Excel Export Routes (Accessible by Admin, CEO, Project Manager, Accountant)
router.get(
  '/excel/:moduleName',
  authenticateJWT,
  authorizeRoles('Admin', 'CEO', 'Project Manager', 'Accountant', 'Engineer'),
  exportToExcel
);

router.get(
  '/pdf/:moduleName',
  authenticateJWT,
  authorizeRoles('Admin', 'CEO', 'Project Manager', 'Accountant', 'Engineer'),
  exportToPDF
);

module.exports = router;
