/**
 * Deletes all MongoDB documents except User accounts where role === 'admin'.
 *
 * SAFETY: must pass --yes / -y, set CONFIRM_CLEAN_DB=yes, or use npm script db:clean-except-admin:yes
 *
 * Usage (from server/):
 *   npm run db:clean-except-admin:yes
 *   CONFIRM_CLEAN_DB=yes node src/scripts/cleanDatabaseExceptAdmin.js
 *   node src/scripts/cleanDatabaseExceptAdmin.js --yes
 *
 * Note: `npm run db:clean-except-admin -- --yes` may not forward `--yes` on some Windows/npm versions (npm treats --yes).
 *
 * Requires MONGO_URI in .env (server/.env or cwd .env).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

function resolveMongoUri() {
  return (
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    ''
  );
}

const CONFIRMED =
  process.argv.includes('--yes') ||
  process.argv.includes('-y') ||
  String(process.env.CONFIRM_CLEAN_DB || '').toLowerCase() === 'yes';

/** All app models except User — cleared entirely */
const MODELS = [
  require('../models/Advance'),
  require('../models/Agreement'),
  require('../models/AgreementTemplate'),
  require('../models/Application'),
  require('../models/Attendance'),
  require('../models/AttendancePolicy'),
  require('../models/AuditLog'),
  require('../models/BankAccount'),
  require('../models/Booking'),
  require('../models/BonusTarget'),
  require('../models/Branch'),
  require('../models/Cheque'),
  require('../models/ClientProfile'),
  require('../models/Employee'),
  require('../models/EpfRecord'),
  require('../models/Feedback'),
  require('../models/FinanceEntry'),
  require('../models/Invoice'),
  require('../models/Job'),
  require('../models/Leave'),
  require('../models/LeavePolicy'),
  require('../models/Letter'),
  require('../models/LetterTemplate'),
  require('../models/Loan'),
  require('../models/Message'),
  require('../models/Notification'),
  require('../models/Overtime'),
  require('../models/Payment'),
  require('../models/Payroll'),
  require('../models/Performance'),
  require('../models/PettyCash'),
  require('../models/PortfolioItem'),
  require('../models/Project'),
  require('../models/Quotation'),
  require('../models/Referral'),
  require('../models/Reward'),
  require('../models/RewardRule'),
  require('../models/SalaryPayment'),
  require('../models/Service'),
  require('../models/SiteSetting'),
  require('../models/Subscription'),
  require('../models/Target'),
  require('../models/Voucher'),
  require('../models/WorkLog'),
];

async function main() {
  if (!CONFIRMED) {
    console.error('Refusing to run: set CONFIRM_CLEAN_DB=yes or pass --yes');
    console.error('Example: CONFIRM_CLEAN_DB=yes node src/scripts/cleanDatabaseExceptAdmin.js');
    process.exit(1);
  }

  const uri = resolveMongoUri();
  if (!uri) {
    console.error('No MongoDB URI: set MONGO_URI (or MONGODB_URI / DATABASE_URL) in server/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const { host, name: dbName } = mongoose.connection;
  console.log('Connected:', host);
  console.log('Database name:', dbName);
  console.log('(Must match the same URI your API server uses — otherwise the site will still show old data.)\n');

  const admins = await User.find({ role: 'admin' }).select('email name').lean();
  if (!admins.length) {
    console.error('No users with role "admin" found. Aborting to avoid deleting all users.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`Keeping ${admins.length} admin user(s): ${admins.map((a) => a.email).join(', ')}`);

  for (const Model of MODELS) {
    const name = Model.modelName || Model.collection?.collectionName || 'unknown';
    const r = await Model.deleteMany({});
    console.log(`  ${name}: deleted ${r.deletedCount}`);
  }

  const others = await User.deleteMany({ role: { $ne: 'admin' } });
  console.log(`  User (non-admin): deleted ${others.deletedCount}`);

  await User.updateMany({ role: 'admin' }, { $set: { branch: null } });
  console.log('  Admin users: cleared branch reference');

  // Wipe any other collections in this DB (legacy names, manual inserts) except `users`.
  const db = mongoose.connection.db;
  const collInfos = await db.listCollections().toArray();
  for (const { name } of collInfos) {
    if (name.startsWith('system.')) continue;
    if (name === 'users') continue;
    const r = await db.collection(name).deleteMany({});
    if (r.deletedCount > 0) {
      console.log(`  (extra collection "${name}"): deleted ${r.deletedCount}`);
    }
  }

  const [empLeft, projLeft, invLeft, nonAdminUsers] = await Promise.all([
    mongoose.connection.collection('employees').countDocuments(),
    mongoose.connection.collection('projects').countDocuments(),
    mongoose.connection.collection('invoices').countDocuments(),
    User.countDocuments({ role: { $ne: 'admin' } }),
  ]);
  console.log('\n--- Verification (should all be 0 except you keep admins) ---');
  console.log('  employees:', empLeft, '| projects:', projLeft, '| invoices:', invLeft, '| non-admin users:', nonAdminUsers);

  console.log(`
--- Browser (otherwise the UI can look "stuck" on old data) ---
1. Hard refresh: Ctrl+Shift+R (or close all tabs for this app).
2. Or log out, then: DevTools → Application → Local Storage → remove key "raxwo-auth" for this site.
3. Log in again as admin. Non-admin tokens stop working once their user row is deleted.
`);

  console.log('Done. Database cleaned except admin users.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
