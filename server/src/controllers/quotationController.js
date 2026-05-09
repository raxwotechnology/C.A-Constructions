const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const { createAuditLog } = require('./auditController');

// @desc    Get all quotations
// @route   GET /api/quotations
exports.getQuotations = async (req, res, next) => {
  try {
    const { status, client, startDate, endDate } = req.query;
    const query = {};
    if (status) query.status = status;
    if (client) query.client = client;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    const quotations = await Quotation.find(query)
      .populate('client', 'name email phone')
      .populate('booking', 'projectTitle')
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: quotations.length, quotations });
  } catch (err) { next(err); }
};

// @desc    Create quotation
// @route   POST /api/quotations
exports.createQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.create({ ...req.body, generatedBy: req.user._id });
    await createAuditLog({ user: req.user, action: 'create', module: 'quotations', entityId: quotation._id, entityName: quotation.quotationNo, description: `Quotation ${quotation.quotationNo} created` });
    res.status(201).json({ success: true, quotation });
  } catch (err) { next(err); }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
exports.updateQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await createAuditLog({ user: req.user, action: 'update', module: 'quotations', entityId: quotation._id, entityName: quotation.quotationNo, description: `Quotation ${quotation.quotationNo} updated to status: ${quotation.status}` });
    res.json({ success: true, quotation });
  } catch (err) { next(err); }
};

// @desc    Confirm quotation
// @route   PUT /api/quotations/:id/confirm
exports.confirmQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', confirmedAt: new Date(), confirmedBy: req.user._id },
      { new: true }
    ).populate('client', 'name email');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await createAuditLog({ user: req.user, action: 'approve', module: 'quotations', entityId: quotation._id, entityName: quotation.quotationNo, description: `Quotation ${quotation.quotationNo} confirmed` });
    res.json({ success: true, quotation });
  } catch (err) { next(err); }
};

// @desc    Convert quotation to invoice
// @route   POST /api/quotations/:id/convert-to-invoice
exports.convertToInvoice = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('client', 'name email');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    if (quotation.status !== 'confirmed') return res.status(400).json({ success: false, message: 'Quotation must be confirmed first' });

    const count = await Invoice.countDocuments();
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await Invoice.create({
      invoiceNo,
      client: quotation.client._id,
      quotation: quotation._id,
      title: quotation.title,
      items: quotation.items,
      subtotal: quotation.subtotal,
      discount: quotation.discountTotal,
      tax: quotation.tax,
      taxRate: quotation.taxRate,
      total: quotation.total,
      currency: quotation.currency,
      notes: quotation.notes,
      status: 'unpaid',
      createdBy: req.user._id,
    });

    await Quotation.findByIdAndUpdate(quotation._id, { status: 'converted', convertedToInvoice: invoice._id });
    await createAuditLog({ user: req.user, action: 'create', module: 'quotations', entityId: quotation._id, entityName: quotation.quotationNo, description: `Quotation ${quotation.quotationNo} converted to invoice ${invoiceNo}` });

    res.json({ success: true, invoice, quotation });
  } catch (err) { next(err); }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
exports.deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await createAuditLog({ user: req.user, action: 'delete', module: 'quotations', entityId: quotation._id, entityName: quotation.quotationNo, description: `Quotation ${quotation.quotationNo} deleted`, severity: 'warning' });
    res.json({ success: true, message: 'Quotation deleted' });
  } catch (err) { next(err); }
};
