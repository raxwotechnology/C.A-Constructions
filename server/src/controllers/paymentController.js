const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Voucher = require('../models/Voucher');
const { validateVoucherForClient, awardPoints } = require('../services/rewardService');
const { createNotification } = require('../services/notificationService');

// @desc  Initiate PayHere payment for an invoice
// @route POST /api/payments/payhere/init
exports.initiatePayment = async (req, res, next) => {
  try {
    const { invoiceId, voucherCode = '' } = req.body;
    const invoice = await Invoice.findById(invoiceId).populate('client', 'name email phone');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Invoice already paid' });

    const merchantId  = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SECRET;
    const orderId    = invoice.invoiceNo;
    let discountAmount = 0;
    let finalAmountNum = Number(invoice.total || 0);
    let appliedVoucherCode = '';
    if (voucherCode) {
      const voucherValidation = await validateVoucherForClient({
        code: voucherCode,
        clientId: req.user._id,
        invoiceTotal: invoice.total,
      });
      if (!voucherValidation.valid) return res.status(400).json({ success: false, message: voucherValidation.message });
      discountAmount = Number(voucherValidation.discount || 0);
      finalAmountNum = Number(voucherValidation.finalAmount || invoice.total);
      appliedVoucherCode = voucherValidation.voucher.code;
    }

    const amount     = finalAmountNum.toFixed(2);
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
      amount:  finalAmountNum,
      originalAmount: Number(invoice.total || 0),
      discountAmount,
      voucherCode: appliedVoucherCode,
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
      discountPreview: {
        originalAmount: Number(invoice.total || 0),
        discountAmount,
        finalAmount: finalAmountNum,
        voucherCode: appliedVoucherCode || null,
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

        const payment = await Payment.findOneAndUpdate(
          { payhere_order_id: order_id },
          { status: 'completed', paidAt: new Date(), payhere_payment_id: req.body.payment_id, payhere_status_code: status_code, md5sig },
          { new: true }
        );
        if (payment?.voucherCode) {
          await Voucher.findOneAndUpdate(
            { code: payment.voucherCode },
            { $inc: { usedCount: 1 }, ...(payment.discountAmount > 0 ? { isActive: false } : {}) },
            { new: true }
          );
        }
        await awardPoints({
          userId: invoice.client,
          action: 'complete_invoice_payment',
          sourceKey: `invoice-paid:${invoice._id}`,
          note: 'Points for completed invoice payment',
        });
        const hasPremium = (invoice.items || []).some((item) => /premium|membership|subscription/i.test(item.description || ''));
        if (hasPremium) {
          await awardPoints({
            userId: invoice.client,
            action: 'buy_premium_service',
            sourceKey: `premium-purchase:${invoice._id}`,
            note: 'Premium service purchase reward',
          });
        }
        await createNotification({
          recipient: invoice.client,
          title: 'Payment Completed',
          message: `Invoice ${invoice.invoiceNo} paid successfully.${payment?.discountAmount ? ` Voucher discount applied: LKR ${Number(payment.discountAmount).toLocaleString()}.` : ''}`,
          type: 'payment',
          link: '/payments',
        });
      }
    }
    res.send('OK');
  } catch (err) { next(err); }
};
