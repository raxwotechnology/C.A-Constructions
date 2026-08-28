const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { getEmployees } = require('../controllers/employeeController');
const { getOverview } = require('../controllers/financeController');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/raxwo_erp';

async function testEndpointsDebug() {
  console.log('================================================================');
  console.log('🐛 DEBUGGING GET /api/employees AND GET /api/finance/overview');
  console.log('================================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB.\n');

    // 1. Test GET /api/employees?limit=200&status=active
    console.log('[TEST 1/3] Testing GET /api/employees?limit=200&status=active:');
    const req1 = { query: { limit: '200', status: 'active' } };
    const res1 = {
      json: (d) => console.log(`  ✓ SUCCESS: Returned ${d.employees?.length || 0} employees.`),
      status: (code) => {
        console.log(`  ❌ Status: ${code}`);
        return res1;
      }
    };
    const next1 = (err) => console.error('  ❌ Error in getEmployees:', err);
    await getEmployees(req1, res1, next1);
    console.log('');

    // 2. Test GET /api/employees?assignable=1&includeFormer=true
    console.log('[TEST 2/3] Testing GET /api/employees?assignable=1&includeFormer=true:');
    const req2 = { query: { assignable: '1', includeFormer: 'true' } };
    await getEmployees(req2, res1, next1);
    console.log('');

    // 3. Test GET /api/finance/overview
    console.log('[TEST 3/3] Testing GET /api/finance/overview:');
    const req3 = { query: {} };
    const res3 = {
      json: (d) => console.log(`  ✓ SUCCESS: Returned overview (Revenue: LKR ${d.totals?.totalRevenue || d.revenue || 0}).`),
      status: (code) => {
        console.log(`  ❌ Status: ${code}`);
        return res3;
      }
    };
    const next3 = (err) => console.error('  ❌ Error in getOverview:', err);
    await getOverview(req3, res3, next3);
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('❌ Top level error:', err);
    process.exit(1);
  }
}

testEndpointsDebug();
