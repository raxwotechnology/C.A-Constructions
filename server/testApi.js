const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('./src/models/User');
const jwt = require('jsonwebtoken');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zage_db')
  .then(async () => {
    // Generate an admin token
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) { console.log('No admin found'); process.exit(1); }
    
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Find a subscription
    const Subscription = require('./src/models/Subscription');
    const sub = await Subscription.findOne({ subscriptionNo: 'SUB-2026-0003' });
    if (!sub) { console.log('Sub not found'); process.exit(1); }
    
    console.log('Testing payment endpoint for sub:', sub._id);
    
    try {
      const res = await axios.post(`http://localhost:5000/api/subscriptions/${sub._id}/payments`, {
        amount: 50,
        method: 'cash',
        reference: 'TEST-123',
        note: 'Testing from script'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response:', res.data);
    } catch (err) {
      console.error('API Error:', err.response?.data || err.message);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('DB Error:', err);
    process.exit(1);
  });
