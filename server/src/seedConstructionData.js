const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Employee = require('./models/Employee');
const Project = require('./models/Project');
const SiteStock = require('./models/SiteStock');
const MaterialTransfer = require('./models/MaterialTransfer');
const GRN = require('./models/GRN');
const DailyDiary = require('./models/DailyDiary');
const SupplierPriceIndex = require('./models/SupplierPriceIndex');

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ca_constructions';
  console.log('Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri);

  console.log('--- Seeding Construction Example Data ---');

  // 1. Seed Roles & Users
  const rolesData = [
    { name: 'Super Admin CEO', email: 'ceo@ca-constructions.lk', role: 'admin' },
    { name: 'Eng. Bandara (PM)', email: 'pm@ca-constructions.lk', role: 'manager', allowedTabs: ['projects', 'quotations', 'agreements', 'daily-diary', 'attendance', 'inventory'] },
    { name: 'Supervisor Perera', email: 'supervisor@ca-constructions.lk', role: 'supervisor' },
    { name: 'Accountant Jayasinghe', email: 'accountant@ca-constructions.lk', role: 'accountant' },
    { name: 'Worker Kamal (Daily Wage)', email: 'worker@ca-constructions.lk', role: 'worker' },
    { name: 'Subcontractor ElectroTech', email: 'subcontractor@ca-constructions.lk', role: 'subcontractor' },
    { name: 'Supplier LankaCement', email: 'supplier@ca-constructions.lk', role: 'supplier' },
    { name: 'Client Property Owner', email: 'client@ca-constructions.lk', role: 'client' },
  ];

  const userMap = {};
  for (const u of rolesData) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create({
        name: u.name,
        email: u.email,
        password: 'password123',
        role: u.role,
        allowedTabs: u.allowedTabs || [],
      });
    }
    userMap[u.role] = user;
  }
  console.log('✓ 8 Role Users Verified/Seeded');

  // 2. Seed Employee Profile for Daily Wage Worker
  let empWorker = await Employee.findOne({ userId: userMap.worker._id });
  if (!empWorker) {
    empWorker = await Employee.create({
      userId: userMap.worker._id,
      employeeNo: 'EMP-9001',
      designation: 'Site Worker / Labour',
      employmentType: 'daily_wage',
      dailyWageRate: 3500,
      basicSalary: 0,
      status: 'active',
    });
  }
  console.log('✓ Daily Wage Worker Employee Profile Seeded');

  // 3. Seed Construction Sites
  const sitesData = [
    { title: 'Colombo Commercial Tower', serviceType: 'Structural Work', budget: 45000000, progress: 65, escrowBalance: 15000000, status: 'active', client: userMap.client._id, projectManager: userMap.manager._id },
    { title: 'Kandy Residential Complex', serviceType: 'Finishing', budget: 28000000, progress: 40, escrowBalance: 8000000, status: 'active', client: userMap.client._id, projectManager: userMap.manager._id },
    { title: 'Galle Highway Overpass', serviceType: 'Earthworks', budget: 62000000, progress: 80, escrowBalance: 20000000, status: 'active', client: userMap.client._id, projectManager: userMap.manager._id },
  ];

  const sitesList = [];
  for (const s of sitesData) {
    let site = await Project.findOne({ title: s.title });
    if (!site) {
      site = await Project.create(s);
    }
    sitesList.push(site);
  }
  console.log('✓ Construction Sites Seeded:', sitesList.length);

  // 4. Seed Stock Items (Central Warehouse vs Site)
  await SiteStock.deleteMany({});
  await SiteStock.create([
    { isCentralWarehouse: true, itemName: 'Tokyo Super Cement 50kg', category: 'Cement', quantity: 1500, unit: 'bags', unitPrice: 2350, reorderLevel: 200 },
    { isCentralWarehouse: true, itemName: 'Melwa Tor Steel 16mm', category: 'Steel', quantity: 12000, unit: 'kg', unitPrice: 320, reorderLevel: 1000 },
    { site: sitesList[0]._id, isCentralWarehouse: false, itemName: 'Tokyo Super Cement 50kg', category: 'Cement', quantity: 350, unit: 'bags', unitPrice: 2350, reorderLevel: 50 },
    { site: sitesList[1]._id, isCentralWarehouse: false, itemName: 'Fine Sand Cubes', category: 'Sand', quantity: 24, unit: 'cubes', unitPrice: 28000, reorderLevel: 5 },
  ]);
  console.log('✓ Central Warehouse & Site Stock Items Seeded');

  // 5. Seed GRN with Fraud Protection Variance Warning
  await GRN.deleteMany({});
  await GRN.create({
    grnNo: 'GRN-9941',
    site: sitesList[0]._id,
    supplier: userMap.supplier._id,
    supplierName: 'LankaCement PLC',
    poNumber: 'PO-8812',
    itemName: 'Tokyo Super Cement 50kg',
    orderedQty: 200,
    receivedQty: 195,
    unit: 'bags',
    unitPrice: 2350,
    varianceQty: 5,
    hasVariance: true,
    paymentHoldFlag: true,
    varianceReason: 'Variance Detected: 200 ordered vs 195 received. Auto-held payment for Accountant audit.',
    receivedBy: userMap.supervisor._id,
    status: 'flagged_variance',
  });
  console.log('✓ GRN Delivery Fraud Variance Hold Seeded');

  // 6. Seed 12-Section Daily Diary
  await DailyDiary.deleteMany({});
  await DailyDiary.create({
    site: sitesList[0]._id,
    date: new Date(),
    supervisor: userMap.supervisor._id,
    s1_attendanceSummary: { engineers: 2, supervisors: 3, skilledLabours: 14, unskilledLabours: 20 },
    s4_weather: { condition: 'sunny', temperatureC: 33, impactNote: 'Good concrete curing weather' },
    s12_supervisorRemarksSignature: { remarks: 'Completed 2nd floor beam concreting successfully.', supervisorName: userMap.supervisor.name, signedAt: new Date() }
  });
  console.log('✓ 12-Section Interactive Daily Diary Entry Seeded');

  // 7. Seed Supplier Price Indexing Alert
  await SupplierPriceIndex.deleteMany({});
  await SupplierPriceIndex.create({
    supplier: userMap.supplier._id,
    supplierName: 'Lanka ReadyMix Concrete Ltd',
    itemName: 'ReadyMix G30 Concrete (m3)',
    historicalPrice: 18500,
    currentPrice: 19800,
    priceIncreasePercentage: 7.02,
    isFlagged: true,
    notes: '7.02% price hike exceeds 5% threshold! Accountant alert raised.',
  });
  console.log('✓ Supplier Price Hike Alert (>5%) Seeded');

  console.log('🎉 ALL EXAMPLES SEEDED SUCCESSFULLY!');
  mongoose.connection.close();
}

seed().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
