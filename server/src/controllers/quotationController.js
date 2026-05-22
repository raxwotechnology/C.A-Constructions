const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const { createAuditLog } = require('./auditController');
const { createNotification } = require('../services/notificationService');
const { allocateInvoiceNoFromQuotationNo } = require('../utils/allocateInvoiceNoFromQuotation');

function quotationAuditSummary(doc) {
  if (!doc) return null;
  const items = doc.items || [];
  return {
    quotationNo: doc.quotationNo,
    title: doc.title,
    status: doc.status,
    total: doc.total,
    subtotal: doc.subtotal,
    itemCount: Array.isArray(items) ? items.length : 0,
    taxRate: doc.taxRate,
    serviceType: doc.serviceType,
  };
}

// @desc    Get all quotations
// @route   GET /api/quotations
exports.getQuotations = async (req, res, next) => {
  try {
    const { status, client, startDate, endDate } = req.query;
    const query = {};
    if (status) query.status = status;
    if (req.user.role === 'client') {
      if (!req.user.client) return res.json({ success: true, count: 0, quotations: [] });
      query.client = req.user.client;
    } else if (client) {
      query.client = client;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    const quotations = await Quotation.find(query)
      .populate('client', 'name email phone')
      .populate('booking', 'projectTitle')
      .populate('generatedBy', 'name')
      .populate('branch', 'name')
      .populate('project', 'title deadline')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: quotations.length, quotations });
  } catch (err) { next(err); }
};

// @desc    Get single quotation
// @route   GET /api/quotations/:id
exports.getQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('generatedBy', 'name')
      .populate('confirmedBy', 'name')
      .populate('convertedToInvoice', 'invoiceNo total status');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, quotation });
  } catch (err) { next(err); }
};

// @desc    Create quotation
// @route   POST /api/quotations
exports.createQuotation = async (req, res, next) => {
  try {
    const { client, items = [] } = req.body;
    if (!client) {
      return res.status(400).json({ success: false, message: 'Client is required' });
    }
    const validItems = (Array.isArray(items) ? items : [])
      .map((item) => ({
        ...item,
        description: String(item.description || '').trim(),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        discount: Number(item.discount || 0),
        total: Number(item.total || 0) || Number(item.quantity || 1) * Number(item.unitPrice || 0) * (1 - Number(item.discount || 0) / 100),
      }))
      .filter((item) => item.description);
    if (validItems.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item with a description is required' });
    }

    const payload = {
      ...req.body,
      items: validItems,
      subtotal: Number(req.body.subtotal) || validItems.reduce((s, i) => s + i.total, 0),
      generatedBy: req.user._id,
    };
    if (!payload.title) payload.title = 'Quotation';
    if (!payload.branch) delete payload.branch;
    if (!payload.project) delete payload.project;

    const quotation = await Quotation.create(payload);
    await createAuditLog({
      user: req.user,
      action: 'create',
      module: 'quotations',
      entityId: quotation._id,
      entityName: quotation.quotationNo,
      description: `Quotation ${quotation.quotationNo} created`,
      changes: { before: null, after: quotationAuditSummary(quotation.toObject()) },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
    if (quotation.client) {
      await createNotification({
        recipient: quotation.client,
        title: 'New Quotation',
        message: `A new quotation (${quotation.quotationNo}) has been generated for you.`,
        type: 'financial',
        link: `/my-account`
      });

      const populatedQ = await Quotation.findById(quotation._id).populate('client');
      if (populatedQ.client?.email) {
        const { sendQuotationEmail } = require('../services/emailService');
        await sendQuotationEmail(populatedQ.client.email, populatedQ.client.name, quotation);
      }
      if (populatedQ.client?.phone) {
        const { sendQuotationSms } = require('../services/smsService');
        await sendQuotationSms(populatedQ.client.phone, populatedQ.client.name, quotation.quotationNo, quotation.total);
      }
    }

    res.status(201).json({ success: true, quotation });
  } catch (err) { next(err); }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
exports.updateQuotation = async (req, res, next) => {
  try {
    const prev = await Quotation.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const allowed = ['draft', 'sent', 'accepted', 'confirmed', 'rejected', 'expired', 'converted'];
    const updates = { ...req.body };
    if (updates.status && !allowed.includes(updates.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const quotation = await Quotation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await createAuditLog({
      user: req.user,
      action: 'update',
      module: 'quotations',
      entityId: quotation._id,
      entityName: quotation.quotationNo,
      description: `Quotation ${quotation.quotationNo} updated (status: ${quotation.status})`,
      changes: { before: quotationAuditSummary(prev), after: quotationAuditSummary(quotation.toObject()) },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
    res.json({ success: true, quotation });
  } catch (err) { next(err); }
};

// @desc    Confirm quotation
// @route   PUT /api/quotations/:id/confirm
exports.confirmQuotation = async (req, res, next) => {
  try {
    const prev = await Quotation.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', confirmedAt: new Date(), confirmedBy: req.user._id },
      { new: true }
    ).populate('client', 'name email');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await createAuditLog({
      user: req.user,
      action: 'approve',
      module: 'quotations',
      entityId: quotation._id,
      entityName: quotation.quotationNo,
      description: `Quotation ${quotation.quotationNo} confirmed`,
      changes: { before: quotationAuditSummary(prev), after: quotationAuditSummary(quotation.toObject()) },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
    res.json({ success: true, quotation });
  } catch (err) { next(err); }
};

// @desc    Convert quotation to invoice
// @route   POST /api/quotations/:id/convert-to-invoice
exports.convertToInvoice = async (req, res, next) => {
  try {
    const qLean = await Quotation.findById(req.params.id).select('quotationNo status convertedToInvoice').lean();
    if (!qLean) return res.status(404).json({ success: false, message: 'Quotation not found' });
    if (qLean.status === 'converted' || qLean.convertedToInvoice) {
      return res.status(400).json({ success: false, message: 'Already converted to invoice' });
    }

    const quotation = await Quotation.findById(req.params.id).populate('client', 'name email');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const quoteNo = qLean.quotationNo != null ? String(qLean.quotationNo).trim() : '';
    if (!quoteNo) {
      return res.status(400).json({
        success: false,
        message: 'This quotation has no quotation number in the database. Save the quotation again, then convert.',
      });
    }

    const { calcItems } = require('./invoiceController').helpers || {};
    // Recalc items
    const calcedItems = (quotation.items || []).map((item) => {
      const raw = item && typeof item.toObject === 'function' ? item.toObject() : { ...item };
      const base = Number(raw.quantity || 1) * Number(raw.unitPrice || 0);
      const discAmt = base * (Number(raw.discount || 0) / 100);
      const afterDisc = base - discAmt;
      const taxAmt = afterDisc * (Number(raw.tax || 0) / 100);
      return { ...raw, total: parseFloat((afterDisc + taxAmt).toFixed(2)) };
    });

    const invNo = await allocateInvoiceNoFromQuotationNo(quoteNo);
    if (!invNo) {
      return res.status(500).json({ success: false, message: 'Could not allocate a unique invoice number' });
    }

    const clientId = quotation.client?._id || quotation.client;
    const invoice = new Invoice({
      client: clientId,
      quotationRef: quotation._id,
      invoiceNo: invNo,
      items: calcedItems,
      subtotal: quotation.subtotal,
      discountTotal: quotation.discountTotal,
      tax: quotation.tax,
      taxRate: quotation.taxRate,
      total: quotation.total,
      currency: quotation.currency,
      exchangeRateToLKR: quotation.exchangeRateToLKR || 1,
      notes: quotation.notes,
      paymentTerms: quotation.terms,
      branch: quotation.branch,
      status: 'unpaid',
      createdBy: req.user._id,
    });
    await invoice.save();

    await Quotation.findByIdAndUpdate(quotation._id, { status: 'converted', convertedToInvoice: invoice._id });
    await createAuditLog({
      user: req.user,
      action: 'create',
      module: 'quotations',
      entityId: quotation._id,
      entityName: quotation.quotationNo,
      description: `Quotation ${quotation.quotationNo} converted to invoice ${invoice.invoiceNo}`,
      changes: {
        before: quotationAuditSummary(quotation.toObject()),
        after: { status: 'converted', invoiceNo: invoice.invoiceNo, invoiceId: String(invoice._id) },
      },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    const populated = await Invoice.findById(invoice._id).populate('client', 'name email').populate('quotationRef', 'quotationNo title');
    res.json({ success: true, invoice: populated, quotation });
  } catch (err) { next(err); }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
exports.deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await createAuditLog({
      user: req.user,
      action: 'delete',
      module: 'quotations',
      entityId: quotation._id,
      entityName: quotation.quotationNo,
      description: `Quotation ${quotation.quotationNo} deleted`,
      changes: { before: quotationAuditSummary(quotation.toObject()), after: null },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
      severity: 'warning',
    });
    res.json({ success: true, message: 'Quotation deleted' });
  } catch (err) { next(err); }
};
