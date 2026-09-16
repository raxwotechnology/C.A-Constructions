const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Subscription = require('./src/models/Subscription');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zage_db')
  .then(async () => {
    const sub = await Subscription.findOne({});
    if (!sub) { console.log('No sub'); process.exit(0); }
    
    sub.payments.push({
      amount: 100,
      method: 'cash',
      reference: '',
      note: '',
      bankAccount: null,
      recordedBy: sub.client, // Fake
      paidAt: new Date(),
      chequeNumber: '',
      chequeDate: undefined,
      chequeBank: '',
      chequeDrawer: ''
    });
    
    try {
      await sub.save();
      console.log('Payment saved!');
    } catch (err) {
      console.log('Error saving payment:', err.message);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
