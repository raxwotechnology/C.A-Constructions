const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const User = require('../server/src/models/User');
const Project = require('../server/src/models/Project');
const Invoice = require('../server/src/models/Invoice');
const { syncProjectsForInvoice } = require('../server/src/utils/projectInvoiceSync');
const { buildPaymentReceiptHtml, buildInvoiceDocumentHtml } = require('../server/src/services/documentHtmlService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:Vm3PSMtCmX1umJvx@cluster0.huenj2f.mongodb.net/raxwo_db?retryWrites=true&w=majority';

async function runUserVerification() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  try {
    // 1. Find or create a test client
    let client = await User.findOne({ role: 'client' });
    if (!client) {
      client = await User.create({
        name: 'Kasun Bandara (Test Client)',
        email: 'kasun.test@example.com',
        phone: '0779998877',
        role: 'client',
        password: 'Password123!',
      });
    }
    console.log(`👤 Client: ${client.name} (${client.phone})`);

    // 2. Create a Test Project with Contract Value = 100,000 LKR
    const project = await Project.create({
      title: 'Luxury Villa Architectural Design',
      name: 'Luxury Villa Architectural Design',
      client: client._id,
      clientName: client.name,
      contractValue: 100000,
      totalBilled: 100000,
      totalCollected: 0,
      remainingBalance: 100000,
      status: 'Active',
      startDate: new Date(),
    });
    console.log(`📁 Project Created: "${project.title}" | Contract Value: LKR ${project.contractValue.toLocaleString()}`);

    // 3. Create an Invoice of 100,000 LKR linked to the Project
    const invoiceNo = `INV-TEST-${Date.now().toString().slice(-4)}`;
    const invoice = await Invoice.create({
      invoiceNo,
      client: client._id,
      project: project._id,
      items: [
        { description: 'Architectural Blueprint & 3D Modeling', quantity: 1, unitPrice: 100000, discount: 0, tax: 0, total: 100000 }
      ],
      subtotal: 100000,
      total: 100000,
      currency: 'LKR',
      status: 'unpaid',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: 'Payment plan: 25k advance, 10k stage 1, 65k final delivery.',
    });

    // Link invoice to project
    project.invoice = invoice._id;
    project.linkedInvoices = [invoice._id];
    await project.save();
    await syncProjectsForInvoice(invoice._id);

    console.log('\n--- 📌 INITIAL STATE ---');
    console.log(`Invoice ${invoice.invoiceNo}: Total = LKR ${invoice.total.toLocaleString()} | Paid = LKR ${invoice.totalPaid.toLocaleString()} | Remaining = LKR ${invoice.remainingBalance.toLocaleString()} | Status = ${invoice.status}`);

    // ==========================================
    // STEP 1: First payment of 25,000 LKR
    // ==========================================
    console.log('\n--- 💳 STEP 1: Client makes 1st payment of LKR 25,000 (Advance) ---');
    invoice.payments.push({
      amount: 25000,
      date: new Date(),
      method: 'bank_transfer',
      reference: 'TXN-BK-25000',
      notes: 'Initial commitment advance',
      isAdvance: true,
    });
    await invoice.save();
    await syncProjectsForInvoice(invoice._id);

    const invAfterStep1 = await Invoice.findById(invoice._id);
    const pay1 = invAfterStep1.payments[0];

    console.log(`✅ Step 1 Verified:`);
    console.log(`   - Receipt No: ${pay1.receiptNo}`);
    console.log(`   - Previous Balance: LKR ${pay1.previousBalance.toLocaleString()}`);
    console.log(`   - Paid in this step: LKR ${pay1.amount.toLocaleString()}`);
    console.log(`   - Remaining Balance After: LKR ${pay1.remainingBalanceAfter.toLocaleString()}`);
    console.log(`   - Invoice Total Paid: LKR ${invAfterStep1.totalPaid.toLocaleString()}`);
    console.log(`   - Invoice Remaining Balance: LKR ${invAfterStep1.remainingBalance.toLocaleString()}`);
    console.log(`   - Invoice Status: ${invAfterStep1.status}`);

    if (invAfterStep1.remainingBalance !== 75000) throw new Error(`Expected remaining balance 75000, got ${invAfterStep1.remainingBalance}`);
    if (invAfterStep1.status !== 'partial') throw new Error(`Expected status 'partial', got ${invAfterStep1.status}`);

    // Generate Step 1 Receipt HTML & verify
    const receiptHtml1 = await buildPaymentReceiptHtml(invAfterStep1, pay1);
    if (!receiptHtml1.includes(pay1.receiptNo) || !receiptHtml1.includes('25,000.00') || !receiptHtml1.includes('75,000.00')) {
      throw new Error('Receipt 1 HTML does not contain expected receipt or balance data');
    }
    console.log(`   - Payment Receipt Voucher 1 generated successfully (${receiptHtml1.length} bytes HTML)`);

    // ==========================================
    // STEP 2: Second payment of 10,000 LKR (1 week later)
    // ==========================================
    console.log('\n--- 💳 STEP 2: 1 week later, client pays LKR 10,000 (Installment) ---');
    invAfterStep1.payments.push({
      amount: 10000,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      method: 'cash',
      reference: 'CASH-REC-10K',
      notes: 'Stage 1 completion payment',
      isAdvance: false,
    });
    await invAfterStep1.save();
    await syncProjectsForInvoice(invAfterStep1._id);

    const invAfterStep2 = await Invoice.findById(invoice._id);
    const pay2 = invAfterStep2.payments[1];

    console.log(`✅ Step 2 Verified:`);
    console.log(`   - Receipt No: ${pay2.receiptNo}`);
    console.log(`   - Previous Balance: LKR ${pay2.previousBalance.toLocaleString()}`);
    console.log(`   - Paid in this step: LKR ${pay2.amount.toLocaleString()}`);
    console.log(`   - Remaining Balance After: LKR ${pay2.remainingBalanceAfter.toLocaleString()}`);
    console.log(`   - Invoice Total Paid: LKR ${invAfterStep2.totalPaid.toLocaleString()}`);
    console.log(`   - Invoice Remaining Balance: LKR ${invAfterStep2.remainingBalance.toLocaleString()}`);
    console.log(`   - Invoice Status: ${invAfterStep2.status}`);

    if (invAfterStep2.remainingBalance !== 65000) throw new Error(`Expected remaining balance 65000, got ${invAfterStep2.remainingBalance}`);
    if (invAfterStep2.totalPaid !== 35000) throw new Error(`Expected total paid 35000, got ${invAfterStep2.totalPaid}`);

    // Generate Step 2 Receipt HTML
    const receiptHtml2 = await buildPaymentReceiptHtml(invAfterStep2, pay2);
    if (!receiptHtml2.includes(pay2.receiptNo) || !receiptHtml2.includes('10,000.00') || !receiptHtml2.includes('65,000.00')) {
      throw new Error('Receipt 2 HTML does not contain expected receipt or balance data');
    }
    console.log(`   - Payment Receipt Voucher 2 generated successfully`);

    // Verify Invoice Document with full Installment Ledger Table
    const invoiceDocHtml = await buildInvoiceDocumentHtml(invAfterStep2);
    if (!invoiceDocHtml.includes('Payment History & Installment Ledger') || !invoiceDocHtml.includes('REC-') || !invoiceDocHtml.includes('65,000.00')) {
      throw new Error('Invoice document HTML missing installment ledger breakdown table');
    }
    console.log(`   - Full Invoice Document HTML with Installment Ledger table generated successfully`);

    // ==========================================
    // STEP 3: Final settlement of 65,000 LKR
    // ==========================================
    console.log('\n--- 💳 STEP 3: Client settles remaining LKR 65,000 (Final Payment) ---');
    invAfterStep2.payments.push({
      amount: 65000,
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      method: 'online_transfer',
      reference: 'TXN-FINAL-65K',
      notes: 'Final settlement on handover',
      isAdvance: false,
    });
    await invAfterStep2.save();
    await syncProjectsForInvoice(invAfterStep2._id);

    const invAfterStep3 = await Invoice.findById(invoice._id);
    const pay3 = invAfterStep3.payments[2];

    console.log(`✅ Step 3 Verified:`);
    console.log(`   - Receipt No: ${pay3.receiptNo}`);
    console.log(`   - Previous Balance: LKR ${pay3.previousBalance.toLocaleString()}`);
    console.log(`   - Paid in this step: LKR ${pay3.amount.toLocaleString()}`);
    console.log(`   - Remaining Balance After: LKR ${pay3.remainingBalanceAfter.toLocaleString()}`);
    console.log(`   - Invoice Total Paid: LKR ${invAfterStep3.totalPaid.toLocaleString()}`);
    console.log(`   - Invoice Remaining Balance: LKR ${invAfterStep3.remainingBalance.toLocaleString()}`);
    console.log(`   - Invoice Status: ${invAfterStep3.status}`);

    if (invAfterStep3.remainingBalance !== 0) throw new Error(`Expected remaining balance 0, got ${invAfterStep3.remainingBalance}`);
    if (invAfterStep3.status !== 'paid') throw new Error(`Expected status 'paid', got ${invAfterStep3.status}`);

    // Clean up test data
    await Invoice.findByIdAndDelete(invoice._id);
    await Project.findByIdAndDelete(project._id);
    console.log('\n🧹 Test Invoice and Project cleaned up from database.');

    console.log('\n🎉 ALL USER FLOW VERIFICATIONS COMPLETED SUCCESSFULLY WITH 100% ACCURACY!');
  } catch (err) {
    console.error('❌ Verification Error:', err);
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

runUserVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
