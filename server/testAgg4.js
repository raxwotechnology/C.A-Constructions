const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Subscription = require('./src/models/Subscription');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zage_db')
  .then(async () => {
    const q = { date: { $gte: new Date('2026-05-31T18:30:00.000Z'), $lte: new Date('2026-06-30T18:29:59.999Z') } };
    
    const subsPayments = await Subscription.aggregate([
      { $match: {} },
      { $unwind: '$payments' },
      { ...(q.date ? { $match: { 'payments.paidAt': q.date } } : { $match: {} }) },
      { $project: { _id: '$payments._id', amount: '$payments.amount', date: '$payments.paidAt', method: '$payments.method', title: '$title' } },
      { $sort: { date: -1 } }
    ]);
    
    const type = null;
    const paymentMethod = null;
    const subEntries = subsPayments.filter(s => !type || type === 'income')
      .filter(s => !paymentMethod || s.method === paymentMethod)
      .map(s => ({
        _id: s._id, type: 'income', category: 'Subscriptions', title: `Subscription: ${s.title}`, amount: s.amount, date: s.date, paymentMethod: s.method, note: ''
      }));
      
    console.log('Resulting subEntries:', subEntries);
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
