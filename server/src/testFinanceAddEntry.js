const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const FinanceEntry = require('./models/FinanceEntry');

async function testLocalEntry() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ca_constructions';
  console.log('Testing Mongoose creation with URI:', mongoUri);
  await mongoose.connect(mongoUri);

  try {
    const testEntry = await FinanceEntry.create({
      type: 'expense',
      category: 'Materials Purchase',
      title: 'Cement Bag Purchase (Test)',
      amount: 15000,
      date: new Date(),
      note: 'Direct test creation',
      paymentMethod: 'Cash',
    });
    console.log('✓ Successfully created test FinanceEntry in database:', testEntry._id);
    await FinanceEntry.findByIdAndDelete(testEntry._id);
    console.log('✓ Cleaned up test FinanceEntry');
  } catch (err) {
    console.error('❌ Mongoose Creation Error:', err.message);
  } finally {
    mongoose.connection.close();
  }
}

testLocalEntry();
