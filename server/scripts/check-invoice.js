const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Invoice = require('../src/models/Invoice');
const Subscription = require('../src/models/Subscription');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const subInvoices = await Invoice.find({ source: 'subscription' }).lean();
  console.log(`Found ${subInvoices.length} subscription invoices.`);
  
  if (subInvoices.length > 0) {
    const inv = subInvoices[subInvoices.length - 1];
    console.log('Latest invoice:', inv.invoiceNo, 'invoiceDate:', inv.invoiceDate, 'subtotal:', inv.subtotal);
    
    if (inv.subscriptionRef) {
      const sub = await Subscription.findById(inv.subscriptionRef).lean();
      if (sub) {
        console.log('Subscription payments:');
        sub.payments.forEach(p => console.log('  ', p._id, 'paidAt:', p.paidAt, 'amount:', p.amount));
      }
    }
  }
  
  await mongoose.disconnect();
}
test().catch(console.error);
