const mongoose = require('mongoose');
const BankAccount = require('./server/src/models/BankAccount');
const { appendBankTransaction } = require('./server/src/utils/bankLedger');

mongoose.connect('mongodb+srv://raxwotechnology_db_user:2ZPD18kFcIVlwTBm@cluster0.4zrxp6p.mongodb.net/raxwo_db?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    try {
      // Find the first bank account
      const account = await BankAccount.findOne();
      if (!account) {
        console.log('No bank account found');
        process.exit(0);
      }
      
      console.log('Bank Account:', account.bankName);
      console.log('Current Balance Before:', account.currentBalance);
      
      // Try to append a transaction
      const tx = await appendBankTransaction(account._id, {
        type: 'withdrawal',
        amount: 500,
        description: 'Test Payroll Deduction',
        date: new Date(),
        referenceId: 'TEST-PAY-1',
        moduleSource: 'payroll',
        sourceType: 'Payroll',
        paymentMethod: 'bank_transfer',
      });
      
      if (!tx) {
        console.log('appendBankTransaction returned null');
      } else {
        console.log('Transaction appended!');
        const updated = await BankAccount.findById(account._id);
        console.log('Current Balance After:', updated.currentBalance);
      }
      
    } catch (e) {
      console.error('Error:', e);
    }
    process.exit(0);
  });
