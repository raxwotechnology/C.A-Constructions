const Agreement = require('../models/Agreement');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const User = require('../models/User');

const POPULATE = [
  { path: 'client', select: 'name email phone' },
  { path: 'project', select: 'title serviceType budget' },
  { path: 'invoice', select: 'invoiceNo total remainingBalance' },
  { path: 'subscription', select: 'name plan' },
  { path: 'createdBy', select: 'name' },
];

// ── GET /api/agreements ────────────────────────────────────────────────────────
exports.getAgreements = async (req, res, next) => {
  try {
    const { client, project, invoice, subscription, status, type } = req.query;
    const query = {};
    if (client) query.client = client;
    if (project) query.project = project;
    if (invoice) query.invoice = invoice;
    if (subscription) query.subscription = subscription;
    if (status) query.status = status;
    if (type) query.agreementType = type;

    const agreements = await Agreement.find(query)
      .populate(POPULATE)
      .sort({ createdAt: -1 });
    res.json({ success: true, count: agreements.length, agreements });
  } catch (err) { next(err); }
};

// ── GET /api/agreements/:id ────────────────────────────────────────────────────
exports.getAgreement = async (req, res, next) => {
  try {
    const agreement = await Agreement.findById(req.params.id).populate(POPULATE);
    if (!agreement) return res.status(404).json({ success: false, message: 'Agreement not found' });
    res.json({ success: true, agreement });
  } catch (err) { next(err); }
};

// ── POST /api/agreements ───────────────────────────────────────────────────────
// Generates agreement content from template tokens
exports.createAgreement = async (req, res, next) => {
  try {
    const { agreementType, title, client, project, invoice, subscription, content, status } = req.body;

    // Auto-populate template tokens if content not provided
    let finalContent = content || '';
    if (!finalContent) {
      finalContent = await buildTemplateContent(agreementType, { client, project, invoice, subscription });
    }

    const agreement = await Agreement.create({
      agreementType, title, 
      client: client || undefined, 
      project: project || undefined, 
      invoice: invoice || undefined, 
      subscription: subscription || undefined,
      content: finalContent,
      status: status || 'draft',
      createdBy: req.user._id,
    });

    const populated = await Agreement.findById(agreement._id).populate(POPULATE);
    res.status(201).json({ success: true, agreement: populated });
  } catch (err) { next(err); }
};

// ── PUT /api/agreements/:id ────────────────────────────────────────────────────
exports.updateAgreement = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (!updates.client) updates.client = undefined;
    if (!updates.project) updates.project = undefined;
    if (!updates.invoice) updates.invoice = undefined;
    if (!updates.subscription) updates.subscription = undefined;
    
    if (updates.status === 'finalised' && !updates.finalisedAt) updates.finalisedAt = new Date();
    if (updates.status === 'signed' && !updates.signedAt) updates.signedAt = new Date();

    const agreement = await Agreement.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate(POPULATE);
    if (!agreement) return res.status(404).json({ success: false, message: 'Agreement not found' });
    res.json({ success: true, agreement });
  } catch (err) { next(err); }
};

// ── DELETE /api/agreements/:id ─────────────────────────────────────────────────
exports.deleteAgreement = async (req, res, next) => {
  try {
    await Agreement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Agreement deleted' });
  } catch (err) { next(err); }
};

// ── POST /api/agreements/generate-preview ─────────────────────────────────────
// Returns auto-filled content without saving
exports.generatePreview = async (req, res, next) => {
  try {
    const { agreementType, client, project, invoice, subscription, agreementDate } = req.body;
    const content = await buildTemplateContent(agreementType, { client, project, invoice, subscription, agreementDate });
    res.json({ success: true, content });
  } catch (err) { next(err); }
};

// ── Template builder ──────────────────────────────────────────────────────────
async function buildTemplateContent(type, { client, project, invoice, subscription, agreementDate }) {
  const siteSettings = await require('../models/SiteSetting').findOne().catch(() => null);
  const companyName = siteSettings?.siteName || 'Raxwo Technology';
  const companyAddress = siteSettings?.address || '';
  const companyPhone = siteSettings?.phone || '';
  const companyEmail = siteSettings?.email || '';
  
  const today = agreementDate ? new Date(agreementDate).toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });

  let clientDoc = null, projectDoc = null, invoiceDoc = null;
  if (client) clientDoc = await User.findById(client).select('name email phone');
  if (project) projectDoc = await Project.findById(project).populate('client', 'name').select('title serviceType budget description startDate deadline');
  if (invoice) invoiceDoc = await Invoice.findById(invoice).populate('client', 'name').select('invoiceNo total remainingBalance dueDate');

  const clientName = clientDoc?.name || projectDoc?.client?.name || invoiceDoc?.client?.name || '{{CLIENT_NAME}}';
  const clientEmail = clientDoc?.email || '{{CLIENT_EMAIL}}';
  const clientPhone = clientDoc?.phone || '{{CLIENT_PHONE}}';

  const templates = {
    client_project: `
<h2>PROJECT AGREEMENT</h2>
<p>This Project Agreement ("Agreement") is entered into as of <strong>${today}</strong> between:</p>
<p><strong>${companyName}</strong>${companyAddress ? `, ${companyAddress}` : ''} ("Service Provider")</p>
<p>and</p>
<p><strong>${clientName}</strong>${clientEmail ? `, ${clientEmail}` : ''}${clientPhone ? `, ${clientPhone}` : ''} ("Client")</p>

<h3>1. Project Details</h3>
<p><strong>Project Name:</strong> ${projectDoc?.title || '{{PROJECT_NAME}}'}</p>
<p><strong>Service Type:</strong> ${projectDoc?.serviceType || '{{SERVICE_TYPE}}'}</p>
<p><strong>Description:</strong> ${projectDoc?.description || '{{PROJECT_DESCRIPTION}}'}</p>
<p><strong>Start Date:</strong> ${projectDoc?.startDate ? new Date(projectDoc.startDate).toLocaleDateString('en-LK') : '{{START_DATE}}'}</p>
<p><strong>Expected Completion:</strong> ${projectDoc?.deadline ? new Date(projectDoc.deadline).toLocaleDateString('en-LK') : '{{DEADLINE}}'}</p>

<h3>2. Project Budget</h3>
<p>The total project budget is <strong>LKR ${projectDoc?.budget?.toLocaleString() || '{{BUDGET}}'}</strong></p>

<h3>3. Payment Terms</h3>
<p>Payment schedule and terms to be agreed upon separately. All payments must be made according to the invoice issued by the Service Provider.</p>

<h3>4. Scope of Work</h3>
<p>The scope of work is defined by the project description above and any attached specifications. Any changes to scope must be agreed in writing by both parties.</p>

<h3>5. Confidentiality</h3>
<p>Both parties agree to maintain confidentiality of proprietary information shared during the project.</p>

<h3>6. Intellectual Property</h3>
<p>Upon receipt of full payment, the Client shall own all deliverables produced specifically for this project.</p>

<h3>7. Governing Law</h3>
<p>This Agreement shall be governed by the laws of Sri Lanka.</p>

<p>By proceeding with this project, both parties agree to the terms outlined in this Agreement.</p>

<p>__________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__________________________</p>
<p><strong>${companyName}</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${clientName}</strong></p>
<p>Service Provider&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Client</p>
<p>Date: ${today}</p>
    `.trim(),

    subscription_service: `
<h2>SUBSCRIPTION SERVICE AGREEMENT</h2>
<p>This Subscription Service Agreement ("Agreement") is entered into as of <strong>${today}</strong> between:</p>
<p><strong>${companyName}</strong> ("Service Provider") and <strong>${clientName}</strong> ("Subscriber")</p>

<h3>1. Service Details</h3>
<p>The Service Provider agrees to provide the subscribed services as outlined in the subscription plan selected by the Subscriber.</p>

<h3>2. Subscription Term</h3>
<p>This agreement is effective from the subscription start date and renews automatically unless cancelled.</p>

<h3>3. Payment</h3>
<p>The Subscriber agrees to pay the subscription fee on the agreed billing cycle (monthly/annual). Late payments may result in service suspension.</p>

<h3>4. Service Level</h3>
<p>The Service Provider shall endeavour to maintain 99% uptime for hosted services. Scheduled maintenance will be notified in advance.</p>

<h3>5. Termination</h3>
<p>Either party may terminate this agreement with 30 days written notice. No refunds for partial periods.</p>

<p>__________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__________________________</p>
<p><strong>${companyName}</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${clientName}</strong></p>
<p>Date: ${today}</p>
    `.trim(),

    invoice_payment: `
<h2>PAYMENT AGREEMENT</h2>
<p>This Payment Agreement is entered into as of <strong>${today}</strong> between <strong>${companyName}</strong> and <strong>${clientName}</strong>.</p>

<h3>Invoice Reference</h3>
<p><strong>Invoice No:</strong> ${invoiceDoc?.invoiceNo || '{{INVOICE_NO}}'}</p>
<p><strong>Total Amount:</strong> LKR ${invoiceDoc?.total?.toLocaleString() || '{{AMOUNT}}'}</p>
<p><strong>Outstanding Balance:</strong> LKR ${invoiceDoc?.remainingBalance?.toLocaleString() || '{{BALANCE}}'}</p>
<p><strong>Due Date:</strong> ${invoiceDoc?.dueDate ? new Date(invoiceDoc.dueDate).toLocaleDateString('en-LK') : '{{DUE_DATE}}'}</p>

<h3>Payment Schedule</h3>
<p>The Client agrees to settle the outstanding balance by the due date specified above.</p>

<h3>Late Payment</h3>
<p>Late payments may incur charges at the discretion of the Service Provider.</p>

<p>__________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__________________________</p>
<p><strong>${companyName}</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${clientName}</strong></p>
<p>Date: ${today}</p>
    `.trim(),

    general: `
<h2>GENERAL AGREEMENT</h2>
<p>This Agreement is entered into as of <strong>${today}</strong> between <strong>${companyName}</strong> and <strong>${clientName}</strong>.</p>
<p>[Enter agreement details here]</p>
<p>__________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__________________________</p>
<p><strong>${companyName}</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${clientName}</strong></p>
<p>Date: ${today}</p>
    `.trim(),
  };

  return templates[type] || templates.general;
}
