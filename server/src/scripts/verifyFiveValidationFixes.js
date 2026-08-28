const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const Employee = require('../models/Employee');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/raxwo_erp';

async function verifyFiveValidationFixes() {
  console.log('================================================================');
  console.log('🧪 VERIFYING THE 5 PAYLOAD & SCHEMA VALIDATION FIXES');
  console.log('================================================================\n');

  let passed = 0;

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Path 'fullName' is required (Frontend sends 'name')
    // -------------------------------------------------------------------------
    console.log('[ISSUE 1/5] Testing Frontend sending "name" instead of "fullName":');
    const emp1 = new Employee({
      name: 'Kamal Gunaratne',
      nic: '881234567V',
      designation: 'Site Engineer',
    });
    await emp1.validate();
    console.log(`  ✓ Auto-mapped name -> fullName: "${emp1.fullName}"`);
    passed++;
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 2: Path 'employeeId' is required (Missing from form payload)
    // -------------------------------------------------------------------------
    console.log('[ISSUE 2/5] Testing Form submitting without "employeeId":');
    const emp2 = new Employee({
      fullName: 'Nimal Jayasinghe',
      nic: '901234567V',
      designation: 'Quantity Surveyor',
    });
    await emp2.validate();
    console.log(`  ✓ Auto-generated employeeId: "${emp2.employeeId}"`);
    passed++;
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 3: 'Finance & Accounting' is not a valid enum value for department
    // -------------------------------------------------------------------------
    console.log('[ISSUE 3/5] Testing Dropdown sending "Finance & Accounting":');
    const emp3 = new Employee({
      fullName: 'Saman Silva',
      department: 'Finance & Accounting',
    });
    await emp3.validate();
    console.log(`  ✓ Accepted "Finance & Accounting" enum for department: "${emp3.department}"`);
    passed++;
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 4: 'active' is not a valid enum value for path 'department'
    // -------------------------------------------------------------------------
    console.log('[ISSUE 4/5] Testing Frontend mistakenly sending status "active" in department field:');
    const emp4 = new Employee({
      fullName: 'Ruwan Bandara',
      department: 'active',
    });
    await emp4.validate();
    console.log(`  ✓ Sanitized department from "active" -> "${emp4.department}", Status set to: "${emp4.status}"`);
    passed++;
    console.log('');

    // -------------------------------------------------------------------------
    // TEST 5: 'active' is not a valid enum value for path 'status'
    // -------------------------------------------------------------------------
    console.log('[ISSUE 5/5] Testing Frontend sending lowercase "active" for status field:');
    const emp5 = new Employee({
      fullName: 'Kasun Wickramasinghe',
      status: 'active',
    });
    await emp5.validate();
    console.log(`  ✓ Normalized lowercase status "active" -> "${emp5.status}"`);
    passed++;
    console.log('');

    console.log('================================================================');
    console.log(`🎉 SUCCESS: ${passed}/5 PAYLOAD & SCHEMA VALIDATION FIXES VERIFIED!`);
    console.log('================================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error during validation fix verification:', err.message);
    process.exit(1);
  }
}

verifyFiveValidationFixes();
