const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

// @desc  Initiate PayHere payment for an invoice
// @route POST /api/payments/payhere/init
exports.initiatePayment = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const invoice = await Invoice.findById(invoiceId).populate('client', 'name email phone');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Invoice already paid' });

    const merchantId  = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SECRET;
    const orderId    = invoice.invoiceNo;
    const amount     = invoice.total.toFixed(2);
    const currency   = 'LKR';
    const sandbox    = process.env.NODE_ENV !== 'production';

    // MD5 hash: merchantId + orderId + amount + currency + MD5(merchantSecret).toUpperCase()
    const secretHash  = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const rawHash     = `${merchantId}${orderId}${amount}${currency}${secretHash}`;
    const hash        = crypto.createHash('md5').update(rawHash).digest('hex').toUpperCase();

    // Create pending payment record
    const payment = await Payment.create({
      invoice: invoice._id,
      client:  invoice.client._id,
      amount:  invoice.total,
      currency,
      payhere_order_id: orderId,
      status:  'pending',
    });

    res.json({
      success: true,
      paymentId: payment._id,
      paymentData: {
        sandbox,
        merchant_id:    merchantId,
        return_url:     `${process.env.CLIENT_URL}/payments?payment=success`,
        cancel_url:     `${process.env.CLIENT_URL}/payments?payment=cancelled`,
        notify_url:     `${process.env.SERVER_URL || 'http://localhost:5000'}/api/payments/payhere/notify`,
        order_id:       orderId,
        items:          `Invoice ${orderId}`,
        amount,
        currency,
        first_name:     invoice.client.name.split(' ')[0] || invoice.client.name,
        last_name:      invoice.client.name.split(' ').slice(1).join(' ') || '-',
        email:          invoice.client.email,
        phone:          invoice.client.phone || '0000000000',
        address:        'Colombo',
        city:           'Colombo',
        country:        'Sri Lanka',
        hash,
      },
    });
  } catch (err) { next(err); }
};

// @desc  Handle PayHere payment notification webhook
// @route POST /api/payments/payhere/notify
exports.payhereNotify = async (req, res, next) => {
  try {
    const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
    const merchantSecret = process.env.PAYHERE_SECRET;

    // Verify signature
    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const rawHash    = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`;
    const localSig   = crypto.createHash('md5').update(rawHash).digest('hex').toUpperCase();

    if (localSig !== md5sig) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    if (status_code === '2') { // 2 = successful
      const invoice = await Invoice.findOne({ invoiceNo: order_id });
      if (invoice) {
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        await invoice.save();

        await Payment.findOneAndUpdate(
          { payhere_order_id: order_id },
          { status: 'completed', paidAt: new Date(), payhere_payment_id: req.body.payment_id, payhere_status_code: status_code, md5sig },
          { new: true }
        );
      }
    }
    res.send('OK');
  } catch (err) { next(err); }
};
