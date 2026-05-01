/**
 * Seed script — creates the default Admin user for Raxwo Technologies
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User.model');

const ADMIN = {
  fullName: 'Raxwo Admin',
  email: 'admin@raxwo.com',
  phone: '03001234567',
  password: 'admin123',
  userType: 'admin',
  department: 'Administration',
  position: 'System Administrator',
  isActive: true,
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const existing = await User.findOne({ phone: ADMIN.phone });
    if (existing) {
      console.log('⚠️  Admin already exists:', existing.email);
      console.log('   Phone:', existing.phone, '| Password: admin123');
    } else {
      const admin = await User.create(ADMIN);
      console.log('✅ Admin user created!');
      console.log('   Name:', admin.fullName);
      console.log('   Phone:', admin.phone);
      console.log('   Password: admin123');
      console.log('   Employee ID:', admin.employeeId);
    }

    // Seed some sample services
    const { Service } = require('./src/models/Appointment.model');
    const services = [
      { name: 'Web Development Consultation', category: 'IT Services', price: 5000, duration: 60, description: 'One-hour web development consultation session' },
      { name: 'Mobile App Design Review', category: 'Design', price: 3500, duration: 45, description: 'Review and feedback on mobile app design' },
      { name: 'SEO Audit', category: 'Marketing', price: 2500, duration: 30, description: 'Complete SEO audit for your website' },
      { name: 'Digital Marketing Strategy', category: 'Marketing', price: 8000, duration: 90, description: 'Full digital marketing strategy session' },
    ];

    for (const svc of services) {
      const ex = await Service.findOne({ name: svc.name });
      if (!ex) {
        await Service.create(svc);
        console.log('✅ Service created:', svc.name);
      }
    }

    console.log('\n🎉 Seeding complete! You can now login at http://localhost:5173');
    console.log('   Phone: 03001234567');
    console.log('   Password: admin123');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
