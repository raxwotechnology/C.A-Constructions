const Invoice    = require('../models/Invoice');
const Quotation  = require('../models/Quotation');
const Payment    = require('../models/Payment');
const Project    = require('../models/Project');
const SiteSetting= require('../models/SiteSetting');
const crypto     = require('crypto');
const { createNotification } = require('../services/notificationService');
const { awardPoints }        = require('../services/rewardService');

const POPULATE_INVOICE = [
  { path: 'client',       select: 'name email phone' },
  { path: 'project',      select: 'title' },
  { path: 'quotationRef', select: 'quotationNo title' },
  { path: 'branch',       select: 'name' },
  { path: 'createdBy',    select: 'name' },
  { path: 'payments.recordedBy', select: 'name' },
];

// ─── Helper: recalc line totals ───────────────────────────────────────────────
function calcItems(items = [], taxRate = 0) {
  let subtotal = 0, discountTotal = 0;
  const calcedItems = items.map(item => {
    const base      = Number(item.quantity || 1) * Number(item.unitPrice || 0);
    const discAmt   = base * (Number(item.discount || 0) / 100);
    const afterDisc = base - discAmt;
    const taxAmt    = afterDisc * (Number(item.tax || 0) / 100);
    const total     = afterDisc + taxAmt;
    subtotal     += base;
    discountTotal+= discAmt;
    return { ...item, total: parseFloat(total.toFixed(2)) };
  });
  const globalTax = (subtotal - discountTotal) * (Number(taxRate) / 100);
  const grandTotal = subtotal - discountTotal + globalTax;
  return {
    items: calcedItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountTotal: parseFloat(discountTotal.toFixed(2)),
    tax: parseFloat(globalTax.toFixed(2)),
    total: parseFloat(grandTotal.toFixed(2)),
  };
}

// ─── GET all invoices ─────────────────────────────────────────────────────────
exports.getInvoices = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'client') query.client = req.user._id;
    if (req.query.status)   query.status  = req.query.status;
    if (req.query.branch)   query.branch  = req.query.branch;
    if (req.query.client)   query.client  = req.query.client;
    if (req.query.project)  query.project = req.query.project;

    // Auto-mark overdue
    const now = new Date();
    await Invoice.updateMany(
      { status: { $in: ['unpaid', 'partial'] }, dueDate: { $lt: now } },
      { status: 'overdue' }
    );

    const invoices = await Invoice.find(query)
      .populate('client', 'name email')
      .populate('project', 'title')
      .populate('branch', 'name')
      .populate('quotationRef', 'quotationNo')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: invoices.length, invoices });
  } catch (err) { next(err); }
};

// ─── GET single invoice ───────────────────────────────────────────────────────
exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(POPULATE_INVOICE);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (err) { next(err); }
};

// ─── CREATE invoice (manual or from quotation) ────────────────────────────────
exports.createInvoice = async (req, res, next) => {
  try {
    const {
      client, project, quotationRef, branch, dueDate, invoiceDate,
      items = [], taxRate = 0, notes, paymentTerms, invoicePrefix, currency,
    } = req.body;

    let sourceItems = items;
    let quotationData = {};

    // If converting from quotation, pull items from it
    if (quotationRef) {
      const quotation = await Quotation.findById(quotationRef);
      if (quotation) {
        sourceItems   = quotation.items;
        taxRate       = quotation.taxRate || 0;
        quotationData = { quotationRef: quotation._id };
        // Mark quotation as converted
        await Quotation.findByIdAndUpdate(quotationRef, { status: 'converted' });
      }
    }

    const { items: calcedItems, subtotal, discountTotal, tax, total } = calcItems(sourceItems, taxRate);

    const invoice = await Invoice.create({
      client, project: project || undefined,
      ...quotationData,
      branch: branch || undefined,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || undefined,
      items: calcedItems, subtotal, discountTotal, tax, taxRate: Number(taxRate), total,
      currency: currency || 'LKR',
      notes, paymentTerms,
      invoicePrefix: invoicePrefix || 'INV',
      status: 'unpaid',
      createdBy: req.user._id,
    });

    // Notify client
    await createNotification({
      recipient: invoice.client,
      title: 'New Invoice',
      message: `Invoice ${invoice.invoiceNo} for LKR ${total.toLocaleString()} has been issued. Due: ${dueDate ? new Date(dueDate).toLocaleDateString('en-LK') : 'N/A'}.`,
      type: 'payment',
      link: '/invoices',
    });

    res.status(201).json({ success: true, invoice });
  } catch (err) { next(err); }
};

// ─── UPDATE invoice (items / dates / meta) ────────────────────────────────────
exports.updateInvoice = async (req, res, next) => {
  try {
    const existing = await Invoice.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot edit a fully paid invoice' });

    const {
      items, taxRate, notes, paymentTerms, dueDate, invoiceDate,
      client, project, branch, quotationRef, currency, status,
    } = req.body;

    let updates = {
      notes, paymentTerms, currency,
      dueDate: dueDate || existing.dueDate,
      invoiceDate: invoiceDate || existing.invoiceDate,
      client: client || existing.client,
      project: project !== undefined ? (project || null) : existing.project,
      branch: branch !== undefined ? (branch || null) : existing.branch,
      quotationRef: quotationRef !== undefined ? (quotationRef || null) : existing.quotationRef,
    };

    if (items) {
      const { items: calcedItems, subtotal, discountTotal, tax, total } = calcItems(items, taxRate ?? existing.taxRate);
      updates = { ...updates, items: calcedItems, subtotal, discountTotal, tax, taxRate: Number(taxRate ?? existing.taxRate), total };
    }

    if (status) updates.status = status;

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate(POPULATE_INVOICE);

    res.json({ success: true, invoice });
  } catch (err) { next(err); }
};

// ─── RECORD PAYMENT (partial or full) ─────────────────────────────────────────
exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, date, method, reference, notes } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.remainingBalance <= 0) return res.status(400).json({ success: false, message: 'Invoice already fully paid' });

    const payAmt = Math.min(Number(amount), invoice.remainingBalance);
    invoice.payments.push({
      amount: payAmt, date: date || new Date(),
      method: method || 'cash', reference, notes,
      recordedBy: req.user._id, isAdvance: false,
    });
    await invoice.save(); // triggers pre-save for totals + status

    // Notify client
    await createNotification({
      recipient: invoice.client,
      title: invoice.remainingBalance === 0 ? 'Invoice Fully Paid ✅' : 'Payment Received',
      message: invoice.remainingBalance === 0
        ? `Invoice ${invoice.invoiceNo} has been fully paid. Thank you!`
        : `Payment of LKR ${payAmt.toLocaleString()} recorded. Remaining: LKR ${invoice.remainingBalance.toLocaleString()}.`,
      type: 'payment',
      link: '/invoices',
    });

    if (invoice.status === 'paid') {
      await awardPoints({ userId: invoice.client, action: 'complete_invoice_payment', sourceKey: `inv-paid:${invoice._id}`, note: 'Invoice paid' });
    }

    const populated = await Invoice.findById(invoice._id).populate(POPULATE_INVOICE);
    res.json({ success: true, invoice: populated });
  } catch (err) { next(err); }
};

// ─── RECORD ADVANCE payment ───────────────────────────────────────────────────
exports.recordAdvance = async (req, res, next) => {
  try {
    const { amount, date, method, reference, notes } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.payments.push({
      amount: Number(amount), date: date || new Date(),
      method: method || 'cash', reference, notes,
      recordedBy: req.user._id, isAdvance: true,
    });
    await invoice.save();

    await createNotification({
      recipient: invoice.client,
      title: 'Advance Payment Recorded',
      message: `Advance payment of LKR ${Number(amount).toLocaleString()} recorded against invoice ${invoice.invoiceNo}.`,
      type: 'payment',
      link: '/invoices',
    });

    const populated = await Invoice.findById(invoice._id).populate(POPULATE_INVOICE);
    res.json({ success: true, invoice: populated });
  } catch (err) { next(err); }
};

// ─── DELETE invoice ───────────────────────────────────────────────────────────
exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot delete a paid invoice' });
    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) { next(err); }
};

// ─── PayHere initiate ─────────────────────────────────────────────────────────
exports.initiatePayment = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const invoice = await Invoice.findById(invoiceId).populate('client', 'name email phone');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const secret     = process.env.PAYHERE_SECRET;
    const orderId    = `RXW-${invoice.invoiceNo}-${Date.now()}`;
    const amount     = (invoice.remainingBalance || invoice.total).toFixed(2);
    const currency   = invoice.currency || 'LKR';

    const secretHash = crypto.createHash('md5').update(secret).digest('hex').toUpperCase();
    const hash = crypto.createHash('md5')
      .update(`${merchantId}${orderId}${amount}${currency}${secretHash}`)
      .digest('hex').toUpperCase();

    const payment = await Payment.create({
      invoice: invoiceId, client: req.user._id,
      amount: Number(amount), currency, payhere_order_id: orderId,
    });

    res.json({
      success: true,
      paymentData: {
        merchant_id: merchantId,
        return_url: `${process.env.CLIENT_URL}/client/payments/success`,
        cancel_url:  `${process.env.CLIENT_URL}/client/payments/cancel`,
        notify_url:  `${process.env.SERVER_URL}/api/payments/payhere/callback`,
        order_id: orderId, items: invoice.items.map(i => i.description).join(', '),
        amount, currency,
        first_name: invoice.client.name.split(' ')[0],
        last_name:  invoice.client.name.split(' ').slice(1).join(' ') || 'N/A',
        email:    invoice.client.email,
        phone:    invoice.client.phone || '0000000000',
        address:  'Colombo', city: 'Colombo', country: 'Sri Lanka',
        hash, sandbox: process.env.PAYHERE_SANDBOX === 'true', paymentId: payment._id,
      }
    });
  } catch (err) { next(err); }
};

// ─── PayHere callback ─────────────────────────────────────────────────────────
exports.payhereCallback = async (req, res, next) => {
  try {
    const { merchant_id, order_id, payment_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
    const secretHash = crypto.createHash('md5').update(process.env.PAYHERE_SECRET).digest('hex').toUpperCase();
    const localSig   = crypto.createHash('md5')
      .update(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`)
      .digest('hex').toUpperCase();
    if (localSig !== md5sig) return res.status(400).send('Invalid signature');

    const payment = await Payment.findOne({ payhere_order_id: order_id });
    if (payment) {
      payment.payhere_payment_id  = payment_id;
      payment.payhere_status_code = status_code;
      payment.md5sig = md5sig;
      payment.status = status_code === '2' ? 'completed' : status_code === '0' ? 'pending' : 'failed';
      if (status_code === '2') {
        payment.paidAt = new Date();
        const inv = await Invoice.findById(payment.invoice);
        if (inv) {
          inv.payments.push({
            amount: Number(payhere_amount), date: new Date(),
            method: 'payhere', reference: payment_id, isAdvance: false,
          });
          await inv.save();
        }
      }
      await payment.save();
    }
    res.send('OK');
  } catch (err) { next(err); }
};

// ─── Payment history ──────────────────────────────────────────────────────────
exports.getPaymentHistory = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'client') query.client = req.user._id;
    const payments = await Payment.find(query)
      .populate('invoice', 'invoiceNo total')
      .populate('client', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) { next(err); }
};
