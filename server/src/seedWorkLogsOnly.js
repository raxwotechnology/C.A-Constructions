const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Employee = require('./models/Employee');
const Project = require('./models/Project');
const WorkLog = require('./models/WorkLog');

async function seedWorkLogs() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ca_constructions';
  console.log('Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri);

  // Find or create admin/manager/supervisor user
  let adminUser = await User.findOne({ role: 'admin' });
  let managerUser = await User.findOne({ role: 'manager' });

  if (!adminUser) {
    adminUser = await User.create({
      name: 'Super Admin CEO',
      email: 'ceo@ca-constructions.lk',
      password: 'password123',
      role: 'admin',
    });
  }

  if (!managerUser) {
    managerUser = await User.create({
      name: 'Eng. Bandara (PM)',
      email: 'pm@ca-constructions.lk',
      password: 'password123',
      role: 'manager',
    });
  }

  let empAdmin = await Employee.findOne({ userId: adminUser._id });
  if (!empAdmin) {
    empAdmin = await Employee.create({
      userId: adminUser._id,
      employeeNo: 'EMP-1001',
      designation: 'CEO / Admin',
      employmentType: 'full_time',
      basicSalary: 250000,
      status: 'active',
    });
  }

  let empPM = await Employee.findOne({ userId: managerUser._id });
  if (!empPM) {
    empPM = await Employee.create({
      userId: managerUser._id,
      employeeNo: 'EMP-1002',
      designation: 'Project Manager',
      employmentType: 'full_time',
      basicSalary: 180000,
      status: 'active',
    });
  }

  let project = await Project.findOne({});

  await WorkLog.deleteMany({});
  await WorkLog.create([
    {
      employee: empPM._id,
      employeeRole: 'manager',
      date: new Date(),
      tasks: [
        { taskName: 'SLS 573 BOQ Review & Inspection for Lotus Villa', hours: 4, project: project?._id, notes: 'Checked beam reinforcement' },
        { taskName: 'Client Progress Meeting & Milestone Review', hours: 3, project: project?._id, notes: 'Approved Phase 1 payments' }
      ],
      totalHours: 7,
      status: 'submitted',
      approvalStatus: 'approved',
      blockers: 'None',
      notes: 'On track with weekly site progress schedule.'
    },
    {
      employee: empAdmin._id,
      employeeRole: 'admin',
      date: new Date(),
      tasks: [
        { taskName: 'Executive Site Oversight & Material Approval', hours: 5, project: project?._id, notes: 'Reviewed cement delivery logs' },
        { taskName: 'Payroll & Supplier Invoice Verification', hours: 3, project: project?._id, notes: 'Verified weekly wage payouts' }
      ],
      totalHours: 8,
      status: 'submitted',
      approvalStatus: 'approved',
      blockers: 'None',
      notes: 'Reviewed all branch logs and approved pending payments.'
    }
  ]);

  console.log('✓ 2 WorkLog Daily Submissions Successfully Seeded!');
  mongoose.connection.close();
}

seedWorkLogs().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
