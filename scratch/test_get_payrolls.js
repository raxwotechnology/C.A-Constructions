const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const Payroll = require('../server/src/models/Payroll');
const Employee = require('../server/src/models/Employee');
const User = require('../server/src/models/User');
const Loan = require('../server/src/models/Loan');
const BankAccount = require('../server/src/models/BankAccount');

async function testGetPayrolls() {
  const mongoUri = process.env.MONGO_URI || 'mongodb+srv://admin:Vm3PSMtCmX1umJvx@cluster0.huenj2f.mongodb.net/raxwo_db?retryWrites=true&w=majority';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  try {
    const month = 8;
    const year = 2026;

    const mNum = Number(month);
    const yNum = Number(year);
    const query = {
      $or: [
        { month: mNum, year: yNum },
        { month: String(mNum), year: yNum },
        { month: `${yNum}-${String(mNum).padStart(2, '0')}` },
      ]
    };

    console.log('Testing query:', JSON.stringify(query));

    const payrolls = await Payroll.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email avatar' } })
      .populate('bankAccount', 'bankName accountNumber branchName currentBalance')
      .populate('deductedLoans')
      .sort({ year: -1, month: -1 });

    console.log(`Success! Found ${payrolls.length} payroll records for month ${month}/${year}.`);
    payrolls.forEach(p => {
      console.log(`- ID: ${p._id}, Employee: ${p.employee?.fullName || p.employee?.userId?.name}, Net: LKR ${p.netSalary || p.netPay}`);
    });
  } catch (err) {
    console.error('ERROR in getPayrolls query:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testGetPayrolls();
