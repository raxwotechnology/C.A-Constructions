require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User.model');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const existing = await User.findOne({ phone: '03009998888' });
  if (!existing) {
    await User.create({
      fullName: 'Test Customer',
      email: 'customer@raxwo.com',
      phone: '03009998888',
      password: 'customer123',
      userType: 'customer',
      isActive: true,
      discount: 10
    });
    console.log('Customer created: 03009998888 / customer123');
  } else {
    console.log('Customer already exists');
  }
  process.exit(0);
}
seed();
