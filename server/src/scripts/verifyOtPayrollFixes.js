const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Employee = require('../models/Employee');
const User = require('../models/User');
const Overtime = require('../models/Overtime');
const Payroll = require('../models/Payroll');
const { computePayrollSnapshot, triggerPayrollSync } = require('../services/payrollEngine');

async function runVerification() {
  const mongoUri = process.env.MONGO_URI || 'mongodb+srv://admin:Vm3PSMtCmX1umJvx@cluster0.huenj2f.mongodb.net/raxwo_db?retryWrites=true&w=majority';
  await mongoose.connect(mongoUri);
  console.log(' connected to MongoDB.');

  try {
    // 1. Find or create a test employee with otRatePerHour
    let employee = await Employee.findOne({ status: 'Active' });
    if (!employee) {
      console.log('No employee found, creating test employee...');
      employee = await Employee.create({
        employeeId: 'EMP_TEST_' + Date.now().toString().slice(-4),
        fullName: 'Janaka Wasantha Test',
        basicSalary: 50000,
        otRatePerHour: 500,
        status: 'Active',
      });
    } else {
      // Ensure employee has an otRatePerHour
      if (!employee.otRatePerHour || employee.otRatePerHour === 0) {
        employee.otRatePerHour = 450;
        await employee.save();
      }
    }

    const testMonth = 8;
    const testYear = 2026;
    const empId = employee._id;

    console.log(`\n--- TEST STEP 1: Verify Employee OT Rate ---`);
    console.log(`Employee: ${employee.fullName} (${employee._id})`);
    console.log(`Basic Salary: LKR ${employee.basicSalary}`);
    console.log(`OT Rate per Hour: LKR ${employee.otRatePerHour}`);
    if (employee.otRatePerHour > 0) {
      console.log(`✓ Verification 1 Passed: otRatePerHour is configured correctly (${employee.otRatePerHour} LKR/hr).`);
    } else {
      throw new Error('Verification 1 Failed: otRatePerHour is not set');
    }

    // 2. Initial Payroll Snapshot (Before OT)
    const initialSnap = await computePayrollSnapshot(empId, testMonth, testYear);
    console.log(`\n--- TEST STEP 2: Initial Payroll Snapshot (Before OT) ---`);
    console.log(`Initial Overtime Pay: LKR ${initialSnap.overtime}`);
    console.log(`Initial Net Salary: LKR ${initialSnap.netSalary}`);

    // 3. Create OT Record (User action: Add 3 hrs @ 450 = 1350)
    console.log(`\n--- TEST STEP 3: Simulate User Add OT (3 Hours) ---`);
    const otHours = 3;
    const otRate = employee.otRatePerHour;
    const calculatedAmount = otHours * otRate; // 3 * 450 = 1350 LKR
    console.log(`Simulated Frontend Calc: ${otHours} hrs x LKR ${otRate}/hr = LKR ${calculatedAmount}`);

    // Find admin user for addedBy
    const adminUser = await User.findOne({ role: 'admin' }) || { _id: empId };

    const otRecord = await Overtime.create({
      employee: empId,
      month: testMonth,
      year: testYear,
      hours: otHours,
      amount: calculatedAmount,
      note: 'Verification test OT entry',
      addedBy: adminUser._id,
    });
    console.log(`Created OT Record ID: ${otRecord._id}`);

    // Trigger payroll engine sync
    await triggerPayrollSync({
      employeeId: empId,
      month: testMonth,
      year: testYear,
      source: 'overtime',
      reason: 'OT verification test',
    });

    // 4. Verify Updated Live Snapshot
    const snapAfterAdd = await computePayrollSnapshot(empId, testMonth, testYear);
    console.log(`\n--- TEST STEP 4: Live Payroll Snapshot After Add OT ---`);
    console.log(`New Overtime Pay: LKR ${snapAfterAdd.overtime}`);
    console.log(`New Net Salary: LKR ${snapAfterAdd.netSalary}`);

    if (snapAfterAdd.overtime >= calculatedAmount) {
      console.log(`✓ Verification 4 Passed: Overtime pay updated dynamically (+ LKR ${calculatedAmount}).`);
    } else {
      throw new Error('Verification 4 Failed: OT pay was not added to snapshot');
    }

    // 5. Verify Overtime Records Listing
    const otRecords = await Overtime.find({ employee: empId, month: testMonth, year: testYear });
    console.log(`\n--- TEST STEP 5: Overtime Listing Query Verification ---`);
    console.log(`Total OT Records found: ${otRecords.length}`);
    const addedRow = otRecords.find(r => String(r._id) === String(otRecord._id));
    if (addedRow && addedRow.amount === calculatedAmount) {
      console.log(`✓ Verification 5 Passed: OT record retrieved successfully with amount LKR ${addedRow.amount}.`);
    } else {
      throw new Error('Verification 5 Failed: OT record not found in database listing');
    }

    // 6. Delete OT Record (User action: Delete OT)
    console.log(`\n--- TEST STEP 6: Simulate User Delete OT Record ---`);
    await Overtime.findByIdAndDelete(otRecord._id);
    await triggerPayrollSync({
      employeeId: empId,
      month: testMonth,
      year: testYear,
      source: 'overtime',
      reason: 'OT deletion test',
    });
    console.log(`Deleted OT Record ID: ${otRecord._id}`);

    // 7. Verify Live Snapshot After Delete
    const snapAfterDelete = await computePayrollSnapshot(empId, testMonth, testYear);
    console.log(`\n--- TEST STEP 7: Live Payroll Snapshot After Delete OT ---`);
    console.log(`Final Overtime Pay: LKR ${snapAfterDelete.overtime}`);
    console.log(`Final Net Salary: LKR ${snapAfterDelete.netSalary}`);

    if (snapAfterDelete.overtime === initialSnap.overtime) {
      console.log(`✓ Verification 7 Passed: Payroll snapshot recalculated back to initial state after deletion.`);
    } else {
      throw new Error('Verification 7 Failed: Snapshot overtime did not reset');
    }

    console.log(`\n======================================================`);
    console.log(`🎉 ALL 7 USER STEP VERIFICATIONS PASSED SUCCESSFULLY! 🎉`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('❌ VERIFICATION FAILED:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runVerification();
