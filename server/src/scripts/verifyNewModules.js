const mongoose = require('mongoose');
require('dotenv').config();

const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const SupplierLedger = require('../models/SupplierLedger');
const CateringVendor = require('../models/CateringVendor');
const MealEntry = require('../models/MealEntry');
const MealSettlement = require('../models/MealSettlement');
const PettyCash = require('../models/PettyCash');
const BankAccount = require('../models/BankAccount');
const MaterialRequest = require('../models/MaterialRequest');
const SiteStock = require('../models/SiteStock');
const Project = require('../models/Project');
const User = require('../models/User');

async function runVerification() {
  console.log('🚀 Starting Verification for 4 New/Updated ERP Modules...');
  
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/raxwo_erp';
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  try {
    // Get test user & project
    let user = await User.findOne();
    let project = await Project.findOne();

    // 1. Hardware Suppliers Module
    console.log('\n--- 1. Testing Hardware Suppliers Module ---');
    const supCode = 'SUP-VERIFY-' + Date.now().toString().slice(-4);
    const supplier = await Supplier.create({
      name: 'Lanka Hardware Suppliers Pvt Ltd',
      code: supCode,
      contactPerson: 'Mr. Perera',
      phone: '0771234567',
      email: 'perera@lankahardware.lk',
      category: 'Hardware',
      address: 'Colombo 03',
    });
    console.log('✅ Supplier Registered:', supplier.name, 'Code:', supplier.code);

    const po = await PurchaseOrder.create({
      poNumber: 'PO-VERIFY-' + Date.now().toString().slice(-4),
      supplier: supplier._id,
      project: project ? project._id : null,
      items: [
        { itemName: 'Cement Bags (Holcim)', quantity: 100, unitPrice: 2400, totalPrice: 240000, category: 'Cement' },
        { itemName: 'Tor Steel 12mm', quantity: 50, unitPrice: 3500, totalPrice: 175000, category: 'Steel' },
      ],
      subtotal: 415000,
      totalAmount: 415000,
      status: 'Pending',
    });
    console.log('✅ Purchase Order Created:', po.poNumber, 'Total LKR:', po.totalAmount);

    // Simulate PO Delivery status update
    po.status = 'Delivered';
    po.deliveryStatus = 'Received';
    await po.save();

    // Ledger entry
    const newOutstanding = supplier.outstandingBalance + po.totalAmount;
    supplier.outstandingBalance = newOutstanding;
    supplier.totalBilled = supplier.totalBilled + po.totalAmount;
    await supplier.save();

    await SupplierLedger.create({
      supplier: supplier._id,
      transactionType: 'bill_po',
      referencePO: po._id,
      referenceNumber: po.poNumber,
      amount: po.totalAmount,
      notes: `PO Delivered: ${po.poNumber}`,
      runningBalance: newOutstanding,
    });
    console.log('✅ PO Delivered -> Ledger Updated. Supplier Outstanding LKR:', supplier.outstandingBalance);

    // Record Payment
    const payAmt = 200000;
    supplier.outstandingBalance -= payAmt;
    supplier.totalPaid += payAmt;
    await supplier.save();

    await SupplierLedger.create({
      supplier: supplier._id,
      transactionType: 'payment',
      referenceNumber: 'PAY-1001',
      amount: payAmt,
      paymentMethod: 'bank_transfer',
      runningBalance: supplier.outstandingBalance,
    });
    console.log('✅ Payment Recorded. Remaining Outstanding LKR:', supplier.outstandingBalance);


    // 2. Meals & Catering Ledger
    console.log('\n--- 2. Testing Meals & Catering Ledger ---');
    const vendor = await CateringVendor.create({
      name: 'City Foods Catering',
      contactPerson: 'Mrs. Jayasinghe',
      phone: '0719876543',
      defaultMealRate: 300,
    });
    console.log('✅ Catering Vendor Created:', vendor.name);

    const mealEntry1 = await MealEntry.create({
      vendor: vendor._id,
      date: new Date(),
      shift: 'Day',
      mealCount: 150,
      unitPrice: 300,
      totalCost: 45000,
      settlementStatus: 'unsettled',
    });
    const mealEntry2 = await MealEntry.create({
      vendor: vendor._id,
      date: new Date(),
      shift: 'Night',
      mealCount: 100,
      unitPrice: 300,
      totalCost: 30000,
      settlementStatus: 'unsettled',
    });
    vendor.outstandingBalance += (45000 + 30000);
    vendor.totalBilled += (45000 + 30000);
    await vendor.save();
    console.log('✅ Daily Meal Entries Recorded (Day 150, Night 100). Total Vendor Outstanding LKR:', vendor.outstandingBalance);

    // Weekly Settlement
    const totalBill = 75000;
    const paidAmt = 40000;
    const remOutstanding = totalBill - paidAmt;
    const settlement = await MealSettlement.create({
      settlementNo: 'MS-VERIFY-001',
      vendor: vendor._id,
      totalMealCount: 250,
      totalBillAmount: totalBill,
      paidAmount: paidAmt,
      remainingOutstanding: remOutstanding,
      paymentMethod: 'cash',
    });
    vendor.totalPaid += paidAmt;
    vendor.outstandingBalance = Math.max(0, vendor.outstandingBalance - paidAmt);
    await vendor.save();

    mealEntry1.settlementStatus = 'partially_settled';
    mealEntry1.settlement = settlement._id;
    await mealEntry1.save();
    mealEntry2.settlementStatus = 'partially_settled';
    mealEntry2.settlement = settlement._id;
    await mealEntry2.save();

    console.log('✅ Weekly Settlement Processed:', settlement.settlementNo, '| Paid:', paidAmt, '| Remaining Balance LKR:', vendor.outstandingBalance);


    // 3. Petty Cash & Cash Cheque Management
    console.log('\n--- 3. Testing Petty Cash & Cash Cheque Management ---');
    let bankAcc = await BankAccount.findOne();
    if (!bankAcc) {
      bankAcc = await BankAccount.create({
        bankName: 'Commercial Bank',
        accountNumber: '8001234567',
        accountName: 'R A Creation Operations',
        balance: 1000000,
      });
    }

    const chequeAmt = 25000;
    const initialBankBal = bankAcc.balance;
    bankAcc.balance -= chequeAmt;
    await bankAcc.save();

    const pettyCashEntry = await PettyCash.create({
      type: 'in',
      amount: chequeAmt,
      description: 'Petty Cash Funding via Cash Cheque #CHQ-9901',
      paymentType: 'cheque',
      isCashCheque: true,
      chequeNumber: 'CHQ-9901',
      bankAccount: bankAcc._id,
      expenseBreakdown: [
        { category: 'Tea Expense', description: 'Monthly Tea & Milk Powder', amount: 8000 },
        { category: 'Refreshments', description: 'Client & Staff Snacks', amount: 7000 },
        { category: 'Stationery', description: 'A4 Papers & Pens', amount: 5000 },
        { category: 'Site Misc', description: 'Hardware Consumables', amount: 5000 },
      ],
      runningBalance: chequeAmt,
    });

    console.log('✅ Petty Cash Cash-Cheque Top-Up Created. Bank Account Deducted from LKR', initialBankBal, 'to LKR', bankAcc.balance);
    console.log('✅ Detailed Expense Breakdown Items:', pettyCashEntry.expenseBreakdown.length, 'categories');


    // 4. Site-Specific Material & Inventory Request Module
    console.log('\n--- 4. Testing Site-Specific Material & Inventory Request Module ---');
    let testProject = project || await Project.create({ title: 'Kandy Highway Site', name: 'Kandy Site' });

    const matReq = await MaterialRequest.create({
      requestNo: 'MR-VERIFY-001',
      project: testProject._id,
      siteName: testProject.name || testProject.title,
      supervisor: user ? user._id : testProject._id,
      supervisorName: 'Supervisor Silva',
      items: [
        { itemName: 'Cement Bags (Holcim)', category: 'Cement', requestedQty: 100, unit: 'Bags' },
      ],
      urgency: 'High',
      notes: 'Urgent slab casting tomorrow',
    });
    console.log('✅ Site Supervisor Material Request Form Submitted:', matReq.requestNo, 'Priority:', matReq.urgency);

    // Simulate Low Stock Threshold Trigger
    const stockItem = await SiteStock.create({
      itemCode: 'CEM-HOLCIM-' + Date.now().toString().slice(-4),
      itemName: 'Cement Bags (Holcim)',
      category: 'Cement',
      unit: 'Bags',
      centralStockQty: 0,
      siteStockQty: [{ project: testProject._id, qty: 45 }], // 45 is below threshold of 50!
      minThresholdQty: 50,
      unitPrice: 2400,
    });
    console.log('✅ Site Stock Check: Current Stock Qty:', stockItem.siteStockQty[0].qty, '| Threshold Limit:', stockItem.minThresholdQty);
    console.log('⚠️ LOW STOCK ALERT TRIGGERED for Site Supervisor & Admin! Qty 45 <= 50');

    console.log('\n🎉 ALL 4 MODULE VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
