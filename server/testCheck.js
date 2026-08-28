const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const FinanceEntry = require('./src/models/FinanceEntry');
const Subscription = require('./src/models/Subscription');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zage_db')
  .then(async () => {
    const entries = await FinanceEntry.find({ category: 'Subscriptions' }).sort({ date: -1 });
    console.log('FinanceEntries for Subscriptions:', entries);
    
    const subs = await Subscription.find({});
    console.log('Subscriptions:', JSON.stringify(subs, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
