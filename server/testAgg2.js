const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Subscription = require('./src/models/Subscription');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zage_db')
  .then(async () => {
    
    // Simulate what getOverview does
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const range = {
      $gte: new Date(y, m - 1, 1),
      $lte: new Date(y, m, 0, 23, 59, 59, 999)
    };
    console.log('Range:', range);

    const subscriptionPaymentsAgg = await Subscription.aggregate([
      { $match: {} },
      { $unwind: '$payments' },
      { $match: { 'payments.paidAt': range } },
      { $group: { _id: null, total: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
    ]);
    
    console.log('Result:', subscriptionPaymentsAgg);
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
