const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const SiteSetting = require('../models/SiteSetting');
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
      .populate('bankAccount', 'bankName accountNumber branchName')
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
      .populate('bankAccount', 'bankName accountNumber branchName')
      .populate('convertedToInvoice', 'invoiceNo total status');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    if (req.user.role === 'client') {
      const clientId = String(req.user.client || req.user._id);
      if (String(quotation.client?._id || quotation.client) !== clientId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
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

    const subtotal = Number(req.body.subtotal) || validItems.reduce((s, i) => s + i.total, 0);
    const taxRate = Number(req.body.taxRate || 0);
    const tax = Number(req.body.tax) || subtotal * taxRate / 100;
    const transportCharge = Number(req.body.transportCharge || 0);
    const role = String(req.body.directorRole || '').trim()
    const settings = await SiteSetting.findOne().lean()
    const roleSeal = settings?.signatures?.[role]?.url || ''
    const roleLabel = settings?.signatures?.[role]?.label || ''
    const payload = {
      ...req.body,
      items: validItems,
      subtotal,
      tax,
      taxRate,
      transportCharge,
      total: Number(req.body.total) || subtotal + tax + transportCharge,
      generatedBy: req.user._id,
      preparedBy: String(req.body.preparedBy || '').trim() || req.user.name || '',
      notes: String(req.body.notes || '').trim(),
      terms: String(req.body.terms || '').trim(),
      bankBranch: String(req.body.bankBranch || '').trim(),
      directorRole: role,
      directorName: String(req.body.directorName || '').trim() || roleLabel || '',
      directorSealUrl: String(req.body.directorSealUrl || '').trim() || roleSeal || settings?.sealUrl || '',
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

    const populatedOut = await Quotation.findById(quotation._id)
      .populate('client', 'name email phone')
      .populate('generatedBy', 'name')
      .populate('bankAccount', 'bankName accountNumber branchName');
    res.status(201).json({ success: true, quotation: populatedOut || quotation });
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
    if (updates.notes != null) updates.notes = String(updates.notes || '').trim()
    if (updates.terms != null) updates.terms = String(updates.terms || '').trim()
    if (updates.bankBranch != null) updates.bankBranch = String(updates.bankBranch || '').trim()
    if (updates.directorRole != null) updates.directorRole = String(updates.directorRole || '').trim()
    if (updates.directorName != null) updates.directorName = String(updates.directorName || '').trim()
    if (updates.directorSealUrl != null) updates.directorSealUrl = String(updates.directorSealUrl || '').trim()
    if (updates.directorRole && !updates.directorSealUrl) {
      const settings = await SiteSetting.findOne().lean()
      updates.directorSealUrl = settings?.signatures?.[updates.directorRole]?.url || settings?.sealUrl || ''
      if (!updates.directorName) {
        updates.directorName = settings?.signatures?.[updates.directorRole]?.label || settings?.quotationDirectorName || ''
      }
    }
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
    const populatedOut = await Quotation.findById(quotation._id)
      .populate('client', 'name email phone')
      .populate('generatedBy', 'name')
      .populate('bankAccount', 'bankName accountNumber branchName');
    res.json({ success: true, quotation: populatedOut || quotation });
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

// @desc    Send quotation (email / SMS / share link)
// @route   POST /api/quotations/:id/send
exports.sendQuotation = async (req, res, next) => {
  try {
    const methods = Array.isArray(req.body.methods) ? req.body.methods : [];
    if (!methods.length) {
      return res.status(400).json({ success: false, message: 'Select at least one send method' });
    }

    const quotation = await Quotation.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('generatedBy', 'name')
      .populate('bankAccount', 'bankName accountNumber branchName');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const shareLink = `${clientUrl}/my-account?quotation=${quotation._id}`;
    const results = { email: null, sms: null, link: null, pdf: null };
    const client = quotation.client;

    let pdfBuffer = null;
    if (methods.includes('email') || methods.includes('pdf')) {
      try {
        const { quotationToPdf } = require('../services/documentPdfService');
        pdfBuffer = await quotationToPdf(quotation);
        if (methods.includes('pdf')) results.pdf = 'ready';
      } catch (e) {
        console.error('[Quotation] PDF generation failed:', e.message);
        if (methods.includes('pdf')) results.pdf = 'failed';
      }
    }

    if (methods.includes('email')) {
      if (!client?.email) {
        results.email = 'skipped_no_email';
      } else {
        try {
          const { sendQuotationEmail } = require('../services/emailService');
          await sendQuotationEmail(client.email, client.name, quotation, { shareLink, pdfBuffer });
          results.email = 'sent';
        } catch (e) {
          results.email = 'failed';
        }
      }
    }

    if (methods.includes('sms')) {
      if (!client?.phone) {
        results.sms = 'skipped_no_phone';
      } else {
        try {
          const { sendQuotationLinkSms } = require('../services/smsService');
          await sendQuotationLinkSms(client.phone, client.name, quotation.quotationNo, shareLink);
          results.sms = 'sent';
        } catch (e) {
          results.sms = 'failed';
        }
      }
    }

    if (methods.includes('link')) {
      results.link = shareLink;
    }

    if (quotation.status === 'draft' && (results.email === 'sent' || results.sms === 'sent')) {
      quotation.status = 'sent';
      quotation.sentAt = new Date();
      await quotation.save();
    }

    const parts = [];
    if (results.email === 'sent') parts.push('email sent');
    if (results.email === 'failed') parts.push('email failed');
    if (results.sms === 'sent') parts.push('SMS sent');
    if (results.sms === 'failed') parts.push('SMS failed');
    if (results.link) parts.push('link ready');

    res.json({
      success: true,
      shareLink,
      results,
      message: parts.length ? parts.join('; ') : 'Nothing sent — check client contact details',
    });
  } catch (err) { next(err); }
};

// @desc    Download quotation PDF
// @route   GET /api/quotations/:id/pdf
exports.downloadQuotationPdf = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('generatedBy', 'name')
      .populate('bankAccount', 'bankName accountNumber branchName');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    if (req.user.role === 'client') {
      const clientId = String(req.user.client || req.user._id);
      if (String(quotation.client?._id || quotation.client) !== clientId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const { quotationToPdf } = require('../services/documentPdfService');
    const pdf = await quotationToPdf(quotation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quotation.quotationNo || 'quotation'}.pdf"`);
    res.send(pdf);
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
