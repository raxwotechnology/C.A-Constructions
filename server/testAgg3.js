const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Subscription = require('./src/models/Subscription');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zage_db')
  .then(async () => {
    const q = { date: { $gte: new Date('2026-01-01'), $lte: new Date('2027-01-01') } };
    
    const subsPayments = await Subscription.aggregate([
      { $match: {} },
      { $unwind: '$payments' },
      { ...(q.date ? { $match: { 'payments.paidAt': q.date } } : { $match: {} }) },
      { $project: { _id: '$payments._id', amount: '$payments.amount', date: '$payments.paidAt', method: '$payments.method', title: '$title' } },
      { $sort: { date: -1 } }
    ]);
    
    console.log('Result:', subsPayments);
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
