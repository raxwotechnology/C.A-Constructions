const mongoose = require('mongoose');
const path = require('path');

const Invoice = require('../server/src/models/Invoice');
const Project = require('../server/src/models/Project');
const { derivePaymentStatus, deriveAggregatePaymentStatus } = require('../server/src/utils/projectInvoiceSync');
const { buildPaymentReceiptHtml, buildInvoiceDocumentHtml } = require('../server/src/services/documentHtmlService');

async function testUserFlow() {
  console.log('=====================================================');
  console.log('🧪 USER WORKFLOW & PARTIAL PAYMENT VERIFICATION TEST');
  console.log('=====================================================\n');

  // --- Initial Setup ---
  const clientId = new mongoose.Types.ObjectId();
  const projectId = new mongoose.Types.ObjectId();
  const invoiceId = new mongoose.Types.ObjectId();

  const invoice = new Invoice({
    _id: invoiceId,
    invoiceNo: 'INV-2026-0099',
    client: clientId,
    project: projectId,
    items: [
      { description: 'Full Architectural & Structural Engineering Services', quantity: 1, unitPrice: 100000, discount: 0, tax: 0, total: 100000 }
    ],
    subtotal: 100000,
    total: 100000,
    currency: 'LKR',
    status: 'unpaid',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    invoiceDate: new Date(),
    payments: []
  });

  // Verify Initial State
  console.log('📌 [INITIAL STATE]');
  console.log(`   Invoice No: ${invoice.invoiceNo}`);
  console.log(`   Total Value: LKR ${invoice.total.toLocaleString()}`);
  console.log(`   Total Paid: LKR ${invoice.totalPaid.toLocaleString()}`);
  console.log(`   Remaining Balance: LKR ${invoice.remainingBalance.toLocaleString()}`);
  console.log(`   Status: ${invoice.status}`);
  console.log(`   Payment Status (Project): ${derivePaymentStatus(invoice)}`);
  
  if (invoice.total !== 100000) throw new Error('Initial total should be 100,000');
  console.log('   ✅ Initial state is correct.\n');

  // --- STEP 1: First payment of 25,000 LKR ---
  console.log('💳 [STEP 1: Client pays LKR 25,000 as 1st Advance/Installment]');
  invoice.payments.push({
    amount: 25000,
    date: new Date('2026-08-01'),
    method: 'bank_transfer',
    reference: 'TXN-BANK-001',
    notes: 'Advance installment',
    isAdvance: true,
  });

  // Trigger pre-save hook
  await new Promise((resolve, reject) => {
    invoice.schema.s.hooks.execPre('save', invoice, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  const p1 = invoice.payments[0];
  console.log(`   Receipt No: ${p1.receiptNo}`);
  console.log(`   Previous Balance: LKR ${p1.previousBalance.toLocaleString()}`);
  console.log(`   Paid in this step: LKR ${p1.amount.toLocaleString()}`);
  console.log(`   Remaining Balance After Step 1: LKR ${p1.remainingBalanceAfter.toLocaleString()}`);
  console.log(`   Invoice Total Paid: LKR ${invoice.totalPaid.toLocaleString()}`);
  console.log(`   Invoice Remaining Balance: LKR ${invoice.remainingBalance.toLocaleString()}`);
  console.log(`   Invoice Status: ${invoice.status}`);
  console.log(`   Derived Project Payment Status: ${derivePaymentStatus(invoice)}`);

  if (p1.previousBalance !== 100000) throw new Error(`P1 previous balance should be 100000, got ${p1.previousBalance}`);
  if (p1.remainingBalanceAfter !== 75000) throw new Error(`P1 remaining balance after should be 75000, got ${p1.remainingBalanceAfter}`);
  if (invoice.remainingBalance !== 75000) throw new Error(`Invoice remaining balance should be 75000, got ${invoice.remainingBalance}`);
  if (invoice.status !== 'partial') throw new Error(`Invoice status should be 'partial', got ${invoice.status}`);
  if (derivePaymentStatus(invoice) !== 'partial') throw new Error('Project payment status should be partial');

  // Verify Receipt Voucher 1 HTML output
  const receipt1Html = await buildPaymentReceiptHtml(
    { ...invoice.toObject(), client: { name: 'Kasun Bandara', email: 'kasun@test.lk', phone: '0771234567' } },
    p1
  );
  if (!receipt1Html.includes('PAYMENT RECEIPT') || !receipt1Html.includes(p1.receiptNo) || !receipt1Html.includes('25,000.00') || !receipt1Html.includes('75,000.00')) {
    throw new Error('Receipt 1 HTML does not match expected voucher values');
  }
  console.log('   ✅ Step 1 Payment Receipt Voucher generated and verified perfectly.\n');

  // --- STEP 2: Second payment of 10,000 LKR (1 week later) ---
  console.log('💳 [STEP 2: 1 week later, client pays LKR 10,000]');
  invoice.payments.push({
    amount: 10000,
    date: new Date('2026-08-08'),
    method: 'cash',
    reference: 'CASH-002',
    notes: 'Stage 1 structural design completed',
    isAdvance: false,
  });

  // Trigger pre-save hook
  await new Promise((resolve, reject) => {
    invoice.schema.s.hooks.execPre('save', invoice, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  const p2 = invoice.payments[1];
  console.log(`   Receipt No: ${p2.receiptNo}`);
  console.log(`   Previous Balance: LKR ${p2.previousBalance.toLocaleString()}`);
  console.log(`   Paid in this step: LKR ${p2.amount.toLocaleString()}`);
  console.log(`   Remaining Balance After Step 2: LKR ${p2.remainingBalanceAfter.toLocaleString()}`);
  console.log(`   Invoice Total Paid: LKR ${invoice.totalPaid.toLocaleString()}`);
  console.log(`   Invoice Remaining Balance: LKR ${invoice.remainingBalance.toLocaleString()}`);
  console.log(`   Invoice Status: ${invoice.status}`);

  if (p2.previousBalance !== 75000) throw new Error(`P2 previous balance should be 75000, got ${p2.previousBalance}`);
  if (p2.remainingBalanceAfter !== 65000) throw new Error(`P2 remaining balance after should be 65000, got ${p2.remainingBalanceAfter}`);
  if (invoice.totalPaid !== 35000) throw new Error(`Invoice total paid should be 35000, got ${invoice.totalPaid}`);
  if (invoice.remainingBalance !== 65000) throw new Error(`Invoice remaining balance should be 65000, got ${invoice.remainingBalance}`);

  // Verify Receipt Voucher 2 HTML output
  const receipt2Html = await buildPaymentReceiptHtml(
    { ...invoice.toObject(), client: { name: 'Kasun Bandara', email: 'kasun@test.lk', phone: '0771234567' } },
    p2
  );
  if (!receipt2Html.includes(p2.receiptNo) || !receipt2Html.includes('10,000.00') || !receipt2Html.includes('65,000.00')) {
    throw new Error('Receipt 2 HTML does not match expected voucher values');
  }
  console.log('   ✅ Step 2 Payment Receipt Voucher generated and verified perfectly.');

  // Verify Invoice Document with full Installment Ledger Table
  const invoiceDocHtml = await buildInvoiceDocumentHtml({
    ...invoice.toObject(),
    client: { name: 'Kasun Bandara', email: 'kasun@test.lk', phone: '0771234567' }
  });
  if (!invoiceDocHtml.includes('Payment History &amp; Installment Ledger') && !invoiceDocHtml.includes('Payment History & Installment Ledger')) {
    throw new Error('Invoice document HTML missing Installment Ledger Table');
  }
  if (!invoiceDocHtml.includes('65,000.00') || !invoiceDocHtml.includes('35,000.00')) {
    throw new Error('Invoice document HTML missing balance amounts');
  }
  console.log('   ✅ Full Invoice Document with Installment Ledger table generated and verified.\n');

  // --- STEP 3: Final settlement of 65,000 LKR ---
  console.log('💳 [STEP 3: Client settles the remaining LKR 65,000]');
  invoice.payments.push({
    amount: 65000,
    date: new Date('2026-08-15'),
    method: 'online_transfer',
    reference: 'TXN-FINAL-003',
    notes: 'Final delivery handover payment',
    isAdvance: false,
  });

  // Trigger pre-save hook
  await new Promise((resolve, reject) => {
    invoice.schema.s.hooks.execPre('save', invoice, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  const p3 = invoice.payments[2];
  console.log(`   Receipt No: ${p3.receiptNo}`);
  console.log(`   Previous Balance: LKR ${p3.previousBalance.toLocaleString()}`);
  console.log(`   Paid in this step: LKR ${p3.amount.toLocaleString()}`);
  console.log(`   Remaining Balance After Step 3: LKR ${p3.remainingBalanceAfter.toLocaleString()}`);
  console.log(`   Invoice Total Paid: LKR ${invoice.totalPaid.toLocaleString()}`);
  console.log(`   Invoice Remaining Balance: LKR ${invoice.remainingBalance.toLocaleString()}`);
  console.log(`   Invoice Status: ${invoice.status}`);
  console.log(`   Derived Project Payment Status: ${derivePaymentStatus(invoice)}`);

  if (p3.previousBalance !== 65000) throw new Error(`P3 previous balance should be 65000, got ${p3.previousBalance}`);
  if (p3.remainingBalanceAfter !== 0) throw new Error(`P3 remaining balance after should be 0, got ${p3.remainingBalanceAfter}`);
  if (invoice.totalPaid !== 100000) throw new Error(`Invoice total paid should be 100000, got ${invoice.totalPaid}`);
  if (invoice.remainingBalance !== 0) throw new Error(`Invoice remaining balance should be 0, got ${invoice.remainingBalance}`);
  if (invoice.status !== 'paid') throw new Error(`Invoice status should be 'paid', got ${invoice.status}`);
  if (derivePaymentStatus(invoice) !== 'paid') throw new Error('Project payment status should be paid');

  console.log('   ✅ Step 3 Final Settlement verified successfully.\n');

  console.log('=====================================================');
  console.log('🎉 ALL USER SCENARIOS VERIFIED AND PASSED 100%!');
  console.log('=====================================================');
}

testUserFlow().catch((e) => {
  console.error('❌ Verification Failed:', e);
  process.exit(1);
});
