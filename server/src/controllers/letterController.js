const Letter = require('../models/Letter');
const LetterTemplate = require('../models/LetterTemplate');
const Employee = require('../models/Employee');
const SiteSetting = require('../models/SiteSetting');
const { buildLetterBodyHtml } = require('../lib/letterTemplatesHtml');
const { createAuditLog } = require('./auditController');
const { createNotification } = require('../services/notificationService');
const { verifyActionPassword } = require('../utils/actionPassword');

function letterAuditSnapshot(doc) {
  if (!doc) return null;
  const c = doc.content != null ? String(doc.content) : '';
  return {
    title: doc.title,
    type: doc.type,
    approvalStatus: doc.approvalStatus,
    letterRef: doc.letterRef,
    contentLength: c.length,
    contentPreview: c.length > 400 ? `${c.slice(0, 400)}…` : c,
  };
}

async function getCompany() {
  const s = await SiteSetting.findOne().lean();
  return {
    name: s?.siteName || 'Raxwo Pvt Ltd',
    logo: s?.logoUrl || '',
    address: s?.contactAddress || 'Weliweriya, Sri Lanka',
    email: s?.contactEmail || 'hello@raxwo.com',
    phone: s?.contactPhone || '',
    website: s?.websiteUrl || '',
    tagline: s?.siteDescription || '',
    footer: s?.footerText || '',
  };
}

// ── Letter templates (saved HTML fragments) ─────────────────────────────────
exports.getLetterTemplates = async (req, res, next) => {
  try {
    const list = await LetterTemplate.find().sort({ updatedAt: -1 }).limit(80).populate('createdBy', 'name');
    res.json({ success: true, templates: list });
  } catch (err) { next(err); }
};

exports.createLetterTemplate = async (req, res, next) => {
  try {
    const { name, type, content } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Template name required' });
    const t = await LetterTemplate.create({
      name: name.trim(),
      type: type || 'custom',
      content: content || '',
      createdBy: req.user._id,
    });
    await createAuditLog({
      user: req.user,
      action: 'create',
      module: 'letters',
      entityId: String(t._id),
      entityName: t.name,
      description: `Letter template saved: "${t.name}"`,
      changes: {
        before: null,
        after: { name: t.name, type: t.type, contentLength: (t.content && String(t.content).length) || 0 },
      },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });
    res.status(201).json({ success: true, template: t });
  } catch (err) { next(err); }
};

exports.deleteLetterTemplate = async (req, res, next) => {
  try {
    const pw = req.body?.password ?? req.query?.password;
    const check = await verifyActionPassword(req.user._id, pw);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });

    const tpl = await LetterTemplate.findById(req.params.templateId).lean();
    if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });

    await LetterTemplate.findByIdAndDelete(req.params.templateId);
    await createAuditLog({
      user: req.user,
      action: 'delete',
      module: 'letters',
      entityId: String(tpl._id),
      entityName: tpl.name,
      description: `Letter template deleted: "${tpl.name}"`,
      changes: { before: { name: tpl.name, type: tpl.type }, after: null },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
      severity: 'warning',
    });
    res.json({ success: true, message: 'Template removed' });
  } catch (err) { next(err); }
};

// @desc    Generate letter
// @route   POST /api/letters/generate
exports.generateLetter = async (req, res, next) => {
  try {
    const { employeeId, type, data = {}, approvalStatus } = req.body;
    const employee = await Employee.findById(employeeId)
      .populate('userId', 'name email')
      .populate('branch', 'name')
      .populate('manager', 'name');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const company = await getCompany();
    data.issuedByName = req.user.name;
    const content = buildLetterBodyHtml(type, employee, data, company);

    const typeLabels = {
      offer: 'Offer',
      appointment: 'Appointment',
      internship: 'Internship',
      contract: 'Contract',
      part_time: 'Part-Time',
      resignation: 'Resignation Acceptance',
      experience: 'Experience',
      salary: 'Salary Confirmation',
      confirmation: 'Employment Confirmation',
      service_agreement: 'Service Agreement',
      custom: data.letterTitle || 'Custom',
    };
    const title = `${typeLabels[type] || type} — ${employee.userId.name}`;

    const letter = await Letter.create({
      employee: employeeId,
      type,
      title,
      content,
      bodyFormat: 'html',
      issuedBy: req.user._id,
      approvalStatus: approvalStatus && ['none', 'pending', 'approved'].includes(approvalStatus) ? approvalStatus : 'none',
    });

    const populated = await Letter.findById(letter._id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('issuedBy', 'name');

    await createAuditLog({
      user: req.user,
      action: 'create',
      module: 'letters',
      entityId: String(letter._id),
      entityName: letter.letterRef || title,
      description: `Letter generated: ${title} (${type}) for ${employee.userId?.name || 'employee'}`,
      changes: { before: null, after: letterAuditSnapshot(populated.toObject()) },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    await createNotification({
      recipient: employee.userId._id,
      title: 'New Letter Issued',
      message: `A new ${typeLabels[type] || type} letter has been issued to you.`,
      type: 'hr',
      link: '/employee/letters'
    });

    res.status(201).json({ success: true, letter: populated });
  } catch (err) { next(err); }
};

// @desc    Get all letters
// @route   GET /api/letters
exports.getLetters = async (req, res, next) => {
  try {
    const { employeeId, type } = req.query;
    const query = {};
    if (employeeId) query.employee = employeeId;
    if (type) query.type = type;
    const letters = await Letter.find(query)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: letters.length, letters });
  } catch (err) { next(err); }
};

// @desc    Get single letter
// @route   GET /api/letters/:id
exports.getLetter = async (req, res, next) => {
  try {
    const letter = await Letter.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('issuedBy', 'name');
    if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });
    res.json({ success: true, letter });
  } catch (err) { next(err); }
};

// @desc    Get my letters (employee)
// @route   GET /api/letters/my
exports.getMyLetters = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const letters = await Letter.find({ employee: employee._id }).sort({ createdAt: -1 });
    res.json({ success: true, letters });
  } catch (err) { next(err); }
};

// @desc    Update letter content/details
// @route   PUT /api/letters/:id
exports.updateLetter = async (req, res, next) => {
  try {
    const prev = await Letter.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ success: false, message: 'Letter not found' });

    const { title, content, type, approvalStatus, signatures } = req.body;
    const update = {
      ...(title ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(type ? { type } : {}),
      ...(approvalStatus && ['none', 'pending', 'approved'].includes(approvalStatus) ? { approvalStatus } : {}),
    };
    if (signatures && typeof signatures === 'object') {
      update.signatures = {
        hr: { ...prev.signatures?.hr, ...signatures.hr },
        manager: { ...prev.signatures?.manager, ...signatures.manager },
      };
    }
    const letter = await Letter.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .populate('issuedBy', 'name');
    if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });

    const afterDoc = letter.toObject ? letter.toObject() : letter;
    await createAuditLog({
      user: req.user,
      action: 'update',
      module: 'letters',
      entityId: String(letter._id),
      entityName: letter.letterRef || letter.title,
      description: `Letter updated: ${letter.title}`,
      changes: { before: letterAuditSnapshot(prev), after: letterAuditSnapshot(afterDoc) },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, letter });
  } catch (err) { next(err); }
};

// @desc    Delete issued letter
// @route   DELETE /api/letters/:id
exports.deleteLetter = async (req, res, next) => {
  try {
    const pw = req.body?.password ?? req.query?.password;
    const check = await verifyActionPassword(req.user._id, pw);
    if (!check.ok) return res.status(check.status).json({ success: false, message: check.message });

    const prev = await Letter.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ success: false, message: 'Letter not found' });

    await Letter.findByIdAndDelete(req.params.id);
    await createAuditLog({
      user: req.user,
      action: 'delete',
      module: 'letters',
      entityId: String(prev._id),
      entityName: prev.letterRef || prev.title,
      description: `Letter deleted: ${prev.title}`,
      changes: { before: letterAuditSnapshot(prev), after: null },
      ipAddress: req.ip || '',
      userAgent: req.get('user-agent') || '',
      severity: 'warning',
    });

    res.json({ success: true, message: 'Letter deleted' });
  } catch (err) { next(err); }
};

// @desc    Get company branding for letters
// @route   GET /api/letters/company-info
exports.getCompanyInfo = async (req, res, next) => {
  try {
    const company = await getCompany();
    res.json({ success: true, company });
  } catch (err) { next(err); }
};
