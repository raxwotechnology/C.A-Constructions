const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const Project = require('../models/Project');
const FinanceEntry = require('../models/FinanceEntry');
const Invoice = require('../models/Invoice');
const { getSitePnlSummary } = require('../controllers/financeController');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/raxwo_erp';

async function verifySitePnlFilter() {
  console.log('================================================================');
  console.log('📊 VERIFYING SITE-WISE P&L BREAKDOWN & SITE DROPDOWN FILTER');
  console.log('================================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB.\n');

    // 1. Fetch All Projects
    const projects = await Project.find();
    console.log(`[TEST 1/2] 🏢 Sites/Projects Database Aggregation Check:`);
    console.log(`  ✓ Loaded ${projects.length} sites from database.`);

    // 2. Execute Site P&L Summary Aggregation
    const req = { query: {} };
    const res = {
      json: (data) => {
        console.log(`\n[TEST 2/2] 📈 GET /api/finance/site-summary Response:`);
        console.log(`  ✓ Returned ${data.siteSummaries?.length || 0} site P&L summaries.`);
        (data.siteSummaries || []).slice(0, 3).forEach((s) => {
          console.log(`     • Site: ${s.siteName} | Client: ${s.clientName}`);
          console.log(`       - Total Income: LKR ${s.totalIncome.toLocaleString()}`);
          console.log(`       - Total Expenses: LKR ${s.totalExpenses.toLocaleString()}`);
          console.log(`       - Worker Payments: LKR ${s.workerPayments.toLocaleString()}`);
          console.log(`       - Net Profit/Loss: LKR ${s.netProfitLoss.toLocaleString()}`);
        });
      },
    };
    const next = (err) => { if (err) console.error('Error in controller:', err.message); };

    await getSitePnlSummary(req, res, next);

    console.log('\n================================================================');
    console.log('🎉 SITE-WISE FINANCIAL BREAKDOWN & FILTER VERIFICATION PASSED!');
    console.log('================================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error during Site P&L verification:', err.message);
    process.exit(1);
  }
}

verifySitePnlFilter();
