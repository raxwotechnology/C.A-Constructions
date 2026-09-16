const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const crypto = require('crypto');
const { createNotification } = require('../services/notificationService');

// @desc    Get all invoices
// @route   GET /api/invoices
exports.getInvoices = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'client') query.client = req.user._id;
    const invoices = await Invoice.find(query)
      .populate('client', 'name email')
      .populate('project', 'title')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: invoices.length, invoices });
  } catch (err) { next(err); }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('project', 'title');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (err) { next(err); }
};

// @desc    Create invoice
// @route   POST /api/invoices
exports.createInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.create(req.body);
    await createNotification({
      recipient: invoice.client,
      title: 'New Invoice Created',
      message: `Invoice ${invoice.invoiceNo} has been created for LKR ${Number(invoice.total || 0).toLocaleString()}.`,
      type: 'payment',
      link: '/invoices',
    });
    res.status(201).json({ success: true, invoice });
  } catch (err) { next(err); }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
exports.updateInvoice = async (req, res, next) => {
  try {
    const existing = await Invoice.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (req.body.status && req.body.status !== existing.status) {
      await createNotification({
        recipient: invoice.client,
        title: 'Invoice Status Updated',
        message: `Invoice ${invoice.invoiceNo} status changed from ${existing.status} to ${invoice.status}.`,
        type: 'payment',
        link: '/invoices',
      });
    }
    res.json({ success: true, invoice });
  } catch (err) { next(err); }
};

// @desc    Initiate PayHere payment
// @route   POST /api/payments/payhere/init
exports.initiatePayment = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const invoice = await Invoice.findById(invoiceId).populate('client', 'name email phone');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const secret = process.env.PAYHERE_SECRET;
    const orderId = `RXW-${invoice.invoiceNo}-${Date.now()}`;
    const amount = invoice.total.toFixed(2);
    const currency = invoice.currency || 'LKR';

    // PayHere hash: MD5(merchant_id + order_id + amount + currency + MD5(secret).toUpperCase())
    const secretHash = crypto.createHash('md5').update(secret).digest('hex').toUpperCase();
    const hash = crypto.createHash('md5')
      .update(`${merchantId}${orderId}${amount}${currency}${secretHash}`)
      .digest('hex').toUpperCase();

    const payment = await Payment.create({
      invoice: invoiceId,
      client: req.user._id,
      amount: invoice.total,
      currency,
      payhere_order_id: orderId,
    });

    res.json({
      success: true,
      paymentData: {
        merchant_id: merchantId,
        return_url: `${process.env.CLIENT_URL}/client/payments/success`,
        cancel_url: `${process.env.CLIENT_URL}/client/payments/cancel`,
        notify_url: `${process.env.CLIENT_URL?.replace('5173', '5000')}/api/payments/payhere/callback`,
        order_id: orderId,
        items: invoice.items.map(i => i.description).join(', '),
        amount,
        currency,
        first_name: invoice.client.name.split(' ')[0],
        last_name: invoice.client.name.split(' ').slice(1).join(' ') || 'N/A',
        email: invoice.client.email,
        phone: invoice.client.phone || '0000000000',
        address: 'Colombo',
        city: 'Colombo',
        country: 'Sri Lanka',
        hash,
        sandbox: process.env.PAYHERE_SANDBOX === 'true',
        paymentId: payment._id,
      }
    });
  } catch (err) { next(err); }
};

// @desc    PayHere callback (webhook)
// @route   POST /api/payments/payhere/callback
exports.payhereCallback = async (req, res, next) => {
  try {
    const { merchant_id, order_id, payment_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
    const secret = process.env.PAYHERE_SECRET;

    // Verify hash
    const secretHash = crypto.createHash('md5').update(secret).digest('hex').toUpperCase();
    const localSig = crypto.createHash('md5')
      .update(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`)
      .digest('hex').toUpperCase();

    if (localSig !== md5sig) return res.status(400).send('Invalid signature');

    const payment = await Payment.findOne({ payhere_order_id: order_id });
    if (payment) {
      payment.payhere_payment_id = payment_id;
      payment.payhere_status_code = status_code;
      payment.md5sig = md5sig;
      payment.status = status_code === '2' ? 'completed' : status_code === '0' ? 'pending' : 'failed';
      if (status_code === '2') {
        payment.paidAt = new Date();
        await Invoice.findByIdAndUpdate(payment.invoice, { status: 'paid', paidAt: new Date() });
      }
      await payment.save();
    }
    res.send('OK');
  } catch (err) { next(err); }
};

// @desc    Get payment history
// @route   GET /api/payments/history
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
