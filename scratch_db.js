const mongoose = require('mongoose');
const BankAccount = require('./server/src/models/BankAccount');
const Payroll = require('./server/src/models/Payroll');
const FinanceEntry = require('./server/src/models/FinanceEntry');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://admin:Vm3PSMtCmX1umJvx@cluster0.huenj2f.mongodb.net/raxwo_db?retryWrites=true&w=majority')
  .then(async () => {
    const lastPayroll = await Payroll.findOne().sort({ createdAt: -1 }).populate('bankAccount');
    console.log('Last Payroll ID:', lastPayroll._id);
    console.log('Status:', lastPayroll.status);
    console.log('Payment Method:', lastPayroll.paymentMethod);
    console.log('Net Salary:', lastPayroll.netSalary);
    console.log('Bank Account ID:', lastPayroll.bankAccount?._id);
    
    if (lastPayroll.bankAccount) {
      const bank = await BankAccount.findById(lastPayroll.bankAccount._id);
      console.log('Bank Balance:', bank.currentBalance);
      console.log('Bank TXs count:', bank.transactions.length);
      const lastTx = bank.transactions[bank.transactions.length - 1];
      console.log('Last TX:', lastTx ? lastTx.amount : 'None');
    }

    const finEntries = await FinanceEntry.find({ note: `Payroll ID: ${lastPayroll._id}` });
    console.log('Finance Entries count:', finEntries.length);
    process.exit(0);
  });
