require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('./server/src/models/Subscription');

async function fixMonths() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/raxwo', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const subs = await Subscription.find({});
  let updated = 0;

  for (let sub of subs) {
    let changed = false;
    
    if (sub.nextDueDate) {
      const d = new Date(sub.nextDueDate);
      if (d.getMonth() === 7) { // 7 is August (0-indexed)
        d.setMonth(6); // 6 is July
        sub.nextDueDate = d;
        changed = true;
      }
    }

    if (sub.startDate) {
      const d = new Date(sub.startDate);
      if (d.getMonth() === 7) {
        d.setMonth(6);
        sub.startDate = d;
        changed = true;
      }
    }
    
    if (changed) {
      await sub.save();
      updated++;
    }
  }

  console.log(`Updated ${updated} subscriptions from month 8 (August) to month 7 (July).`);
  process.exit(0);
}

fixMonths().catch(console.error);
