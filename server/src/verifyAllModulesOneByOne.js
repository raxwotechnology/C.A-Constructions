const app = require('./app');
const mongoose = require('mongoose');
const { 
  PROJECT_SERVICE_TYPES, 
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES, 
  ASSET_CATEGORIES, 
  LIABILITY_CATEGORIES, 
  CAPITAL_CATEGORIES, 
  TAX_CATEGORIES 
} = require('./constants/masterCategories');

console.log('====================================================');
console.log('   R A CREATIONS / R A CONSTRUCTIONS SYSTEM AUDIT    ');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`✓ [PASS] ${label}`);
    passCount++;
  } catch (err) {
    console.error(`✗ [FAIL] ${label}:`, err.message);
    failCount++;
  }
}

// 1. MASTER CATEGORIES AUDIT
console.log('--- 1. MASTER CATEGORIES (7 LAYERS) AUDIT ---');
check('Project / Service Types (7 Options)', () => {
  if (PROJECT_SERVICE_TYPES.length !== 7) throw new Error('Expected 7 service types');
});
check('Income Categories (5 Options)', () => {
  if (INCOME_CATEGORIES.length !== 5) throw new Error('Expected 5 income categories');
});
check('Expense Categories Breakdown (Material, Labour, Site, Office)', () => {
  if (!EXPENSE_CATEGORIES.material || !EXPENSE_CATEGORIES.labour || !EXPENSE_CATEGORIES.site || !EXPENSE_CATEGORIES.office) {
    throw new Error('Expense category breakdown missing');
  }
});
check('Asset Categories (7 Options)', () => {
  if (ASSET_CATEGORIES.length !== 7) throw new Error('Expected 7 asset categories');
});
check('Liability Categories (4 Options)', () => {
  if (LIABILITY_CATEGORIES.length !== 4) throw new Error('Expected 4 liability categories');
});
check('Capital Categories (3 Options)', () => {
  if (CAPITAL_CATEGORIES.length !== 3) throw new Error('Expected 3 capital categories');
});
check('Tax Categories (VAT 18%, APIT, Income Tax, Stamp Duty)', () => {
  if (TAX_CATEGORIES.length !== 4) throw new Error('Expected 4 tax categories');
});

// 2. MONGOOSE MODELS AUDIT
console.log('\n--- 2. MONGOOSE MODELS AUDIT ---');
check('User Model (RBAC 10 Roles)', () => require('./models/User'));
check('Project Model (SLS 573 & SBD-03)', () => require('./models/Project'));
check('BOQ Model (SLS 573 Measurement)', () => require('./models/BOQ'));
check('FinanceEntry Model (Double-entry Ledger)', () => require('./models/FinanceEntry'));
check('SiteStock Model (Store & Inventory)', () => require('./models/SiteStock'));
check('DailyDiary Model (DSR & HSE Logs)', () => require('./models/DailyDiary'));
check('Employee Model (Statutory EPF/ETF)', () => require('./models/Employee'));
check('Payroll Model (Sri Lanka Payroll Engine)', () => require('./models/Payroll'));
check('Asset Model (Fleet & Machinery)', () => require('./models/Asset'));
check('AuditLog Model (Activity Logger)', () => require('./models/AuditLog'));

// 3. BACKEND ROUTE & CONTROLLER ENDPOINTS AUDIT
console.log('\n--- 3. ROUTES & CONTROLLERS AUDIT ---');
check('Auth & RBAC Middleware', () => require('./middleware/auth'));
check('Export Controller (PDF & Excel)', () => require('./controllers/exportController'));
check('Export Routes (/api/exports)', () => require('./routes/exportRoutes'));
check('Backup Controller (MongoDB JSON Dump)', () => require('./controllers/backupController'));
check('Backup Routes (/api/backup)', () => require('./routes/backupRoutes'));
check('Approval Controller (Multi-Level Workflow)', () => require('./controllers/approvalController'));
check('Approval Routes (/api/approvals)', () => require('./routes/approvalRoutes'));

console.log('\n====================================================');
console.log(` AUDIT RESULT: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');
