const Subscription = require('../models/Subscription');
const Project = require('../models/Project');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const { isLedgerBankMethod, appendBankTransaction } = require('../utils/bankLedger');
const { mapSubscriptionPaymentMethod, logSubscriptionIncome } = require('../utils/financeSubscriptionIncome');

// ── helpers ────────────────────────────────────────────
const SUBSCRIPTION_TYPE_LABELS = {
  website_maintenance: 'Website Maintenance',
  app_maintenance: 'App Maintenance',
  hosting_domain: 'Hosting & Domain',
  social_media_facebook: 'Facebook Management',
  social_media_instagram: 'Instagram Management',
  social_media_tiktok: 'TikTok Marketing',
  content_management: 'Content Management',
  technical_support: 'Technical Support',
  bug_fixing: 'Bug Fixing',
  seo_marketing: 'SEO & Marketing',
  custom: 'Custom Service',
};

function calendarDaysUntilDue(nextDueDate) {
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  const t0 = new Date();
  t0.setHours(0, 0, 0, 0);
  return Math.round((due - t0) / 86400000);
}

/** Full days past due (0 if still within the due calendar day). */
function calcOverdueDays(nextDueDate) {
  if (!nextDueDate) return 0;
  const now = new Date();
  const dueEnd = new Date(nextDueDate);
  dueEnd.setHours(23, 59, 59, 999);
  if (now <= dueEnd) return 0;
  return Math.ceil((now - dueEnd) / 86400000);
}

async function sendAdminSubscriptionReminders() {
  const subs = await Subscription.find({
    status: { $in: ['active', 'overdue'] },
    reminderDaysBefore: { $gte: 1, $lte: 120 },
  }).populate('client', 'name');

  const admins = await User.find({ role: { $in: ['admin', 'manager'] } }).select('_id');
  const adminIds = admins.map((a) => a._id);
  if (!subs.length || !adminIds.length) return;

  for (const sub of subs) {
    const n = Number(sub.reminderDaysBefore);
    if (!n) continue;
    const daysUntil = calendarDaysUntilDue(sub.nextDueDate);
    if (daysUntil !== n) continue;

    const dueKey = `${sub._id}-${new Date(sub.nextDueDate).toISOString().slice(0, 10)}`;
    if (String(sub.lastSubscriptionReminderDay || '') === dueKey) continue;

    await Subscription.updateOne({ _id: sub._id }, { $set: { lastSubscriptionReminderDay: dueKey } });

    const title = `Subscription due soon: ${sub.title}`;
    const msg = `${sub.client?.name || 'Client'} — "${sub.title}" is due in ${n} day(s) (due ${new Date(sub.nextDueDate).toLocaleDateString('en-LK')}).`;

    await Promise.all(
      adminIds.map((rid) =>
        createNotification({
          recipient: rid,
          title,
          message: msg,
          type: 'subscription',
          link: '/admin/subscriptions',
        })
      )
    );
  }
}

function advanceDueDate(current, frequency) {
  const d = new Date(current);
  switch (frequency) {
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'semi_annual': d.setMonth(d.getMonth() + 6); break;
    case 'annual': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

// ── GET all subscriptions ──────────────────────────────
// Admin: all, Client: own
exports.getSubscriptions = async (req, res, next) => {
  try {
    const query = req.user.role === 'client' ? { client: req.user._id } : {};

    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.subscriptionType = req.query.type;
    if (req.query.clientId && req.user.role !== 'client') query.client = req.query.clientId;

    const subs = await Subscription.find(query)
      .populate('client', 'name email phone')
      .populate('project', 'title status')
      .populate('previousProjects', 'title status')
      .sort({ createdAt: -1 });

    if (req.user.role !== 'client') {
      setImmediate(() => {
        sendAdminSubscriptionReminders().catch(() => {});
      });
    }

    // Compute live overdue for each
    const enriched = subs.map((s) => {
      const obj = s.toObject();
      obj.overdueDays = calcOverdueDays(s.nextDueDate);
      obj.remainingBalance = Math.max(0, s.totalBilled - s.totalPaid);
      obj.typeLabel = SUBSCRIPTION_TYPE_LABELS[s.subscriptionType] || s.subscriptionType;
      return obj;
    });

    res.json({ success: true, count: enriched.length, subscriptions: enriched });
  } catch (err) { next(err); }
};

// ── GET single subscription ───────────────────────────
exports.getSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id)
      .populate('client', 'name email phone')
      .populate('project', 'title status progress budget')
      .populate('previousProjects', 'title status')
      .populate('payments.recordedBy', 'name');
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    if (req.user.role === 'client' && String(sub.client._id) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const obj = sub.toObject();
    obj.overdueDays = calcOverdueDays(sub.nextDueDate);
    obj.remainingBalance = Math.max(0, sub.totalBilled - sub.totalPaid);
    obj.typeLabel = SUBSCRIPTION_TYPE_LABELS[sub.subscriptionType] || sub.subscriptionType;
    res.json({ success: true, subscription: obj });
  } catch (err) { next(err); }
};

// ── CREATE subscription (admin) ───────────────────────
exports.createSubscription = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (payload.branch === '') payload.branch = null;
    if (payload.project === '') payload.project = null;

    // Ensure valid client
    const client = await User.findById(payload.client);
    if (!client || client.role !== 'client') {
      return res.status(400).json({ success: false, message: 'Valid client required' });
    }

    // Calculate initial nextDueDate if not provided
    if (!payload.nextDueDate) {
      const now = new Date();
      const billingDay = payload.billingDay || 1;
      const next = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
      payload.nextDueDate = next;
    }

    // Set initial totalBilled to the amount (first billing cycle)
    payload.totalBilled = payload.amount || 0;

    const sub = await Subscription.create(payload);

    const setupAmount = Number(sub.amount || 0);
    if (setupAmount > 0) {
      const incomeDate = sub.startDate ? new Date(sub.startDate) : new Date();
      await logSubscriptionIncome({
        sub,
        amount: setupAmount,
        date: incomeDate,
        createdBy: req.user._id,
        kind: 'created',
        method: 'manual',
        note: `Subscription setup income | ${SUBSCRIPTION_TYPE_LABELS[sub.subscriptionType] || sub.subscriptionType}`,
        syncPayment: true,
      });
    }

    await createNotification({
      recipient: sub.client,
      title: 'New Subscription Created',
      message: `Subscription "${sub.title}" (${SUBSCRIPTION_TYPE_LABELS[sub.subscriptionType] || sub.subscriptionType}) has been set up. Monthly amount: LKR ${Number(sub.amount).toLocaleString()}.`,
      type: 'subscription',
      link: '/my-subscriptions',
    });

    const fresh = await Subscription.findById(sub._id)
      .populate('client', 'name email phone')
      .populate('project', 'title status');

    res.status(201).json({ success: true, subscription: fresh || sub });
  } catch (err) { next(err); }
};

// ── UPDATE subscription (admin) ───────────────────────
exports.updateSubscription = async (req, res, next) => {
  try {
    const existing = await Subscription.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const updates = { ...req.body };
    if (updates.branch === '') updates.branch = null;
    if (updates.project === '') updates.project = null;
    // Don't allow overwriting payments via update
    delete updates.payments;

    ['amount', 'billingDay', 'gracePeriodDays', 'reminderDaysBefore'].forEach((k) => {
      if (updates[k] !== undefined && updates[k] !== null && updates[k] !== '') {
        const num = Number(updates[k]);
        if (Number.isFinite(num)) updates[k] = num;
        else delete updates[k];
      }
    });
    if (updates.reminderDaysBefore === 0) updates.reminderDaysBefore = null;

    const sub = await Subscription.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('client', 'name email phone')
      .populate('project', 'title status');

    // Notify client of important changes
    if (updates.amount !== undefined && Number(updates.amount) !== Number(existing.amount)) {
      await createNotification({
        recipient: sub.client._id || sub.client,
        title: 'Subscription Amount Updated',
        message: `Your "${sub.title}" subscription amount changed from LKR ${Number(existing.amount).toLocaleString()} to LKR ${Number(sub.amount).toLocaleString()}.`,
        type: 'subscription',
        link: '/my-subscriptions',
      });
    }
    if (updates.status && updates.status !== existing.status) {
      await createNotification({
        recipient: sub.client._id || sub.client,
        title: 'Subscription Status Changed',
        message: `Your "${sub.title}" subscription status is now "${sub.status}".`,
        type: 'subscription',
        link: '/my-subscriptions',
      });
    }

    res.json({ success: true, subscription: sub });
  } catch (err) { next(err); }
};

// ── DELETE subscription (admin) ───────────────────────
exports.deleteSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findByIdAndDelete(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.json({ success: true, message: 'Subscription deleted' });
  } catch (err) { next(err); }
};

// ── RECORD PAYMENT (admin) ───────────────────────────
exports.recordPayment = async (req, res, next) => {
  try {
    const {
      amount, method, reference, note, bankAccount,
      chequeNumber, chequeDate, chequeBank, chequeDrawer,
      paidAt,
    } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const m = method || 'cash';
    if (m === 'bank_transfer' && !bankAccount) {
      return res.status(400).json({ success: false, message: 'Select a bank account for bank transfer payments' });
    }
    if (m === 'cheque' && !chequeNumber) {
      return res.status(400).json({ success: false, message: 'Cheque number is required for cheque payments' });
    }
    const paymentDate = paidAt ? new Date(paidAt) : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid payment date' });
    }
    paymentDate.setHours(12, 0, 0, 0);

    sub.payments.push({
      amount: Number(amount),
      method: m,
      reference: reference || '',
      note: note || '',
      bankAccount: bankAccount || null,
      recordedBy: req.user._id,
      paidAt: paymentDate,
      chequeNumber: chequeNumber || '',
      chequeDate: chequeDate ? new Date(chequeDate) : undefined,
      chequeBank: chequeBank || '',
      chequeDrawer: chequeDrawer || '',
    });

    sub.totalPaid += Number(amount);

    // If fully paid for current cycle, advance due date
    if (sub.totalPaid >= sub.totalBilled) {
      sub.nextDueDate = advanceDueDate(sub.nextDueDate, sub.billingFrequency);
      sub.totalBilled += sub.amount; // Add next cycle billing
      if (sub.status === 'overdue') sub.status = 'active';
      sub.overdueDays = 0;
    }

    await sub.save();

    await logSubscriptionIncome({
      sub,
      amount: Number(amount),
      date: paymentDate,
      createdBy: req.user._id,
      kind: 'payment',
      method: m,
      note: `Sub No: ${sub.subscriptionNo || ''} | Ref: ${reference || '—'} | Method: ${m}`,
      reference: reference || '',
      bankAccount: bankAccount || null,
      syncPayment: false,
    });

    if (bankAccount && isLedgerBankMethod(m)) {
      const amt = Number(amount);
      await appendBankTransaction(bankAccount, {
        type: 'deposit',
        amount: amt,
        description: `Subscription Payment: ${sub.subscriptionNo || sub.title}`,
        date: paymentDate,
        reference: reference || '',
        recordedBy: req.user._id,
      });
    }

    await createNotification({
      recipient: sub.client?._id || sub.client,
      title: 'Payment Recorded',
      message: `Payment of LKR ${Number(amount).toLocaleString()} recorded for "${sub.title}". Remaining: LKR ${Math.max(0, sub.totalBilled - sub.totalPaid).toLocaleString()}.`,
      type: 'subscription',
      link: '/my-subscriptions',
    });

    res.json({ success: true, subscription: sub });
  } catch (err) { next(err); }
};

// ── ADD AGREEMENT (admin) ─────────────────────────────
exports.addAgreement = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/agreements/${req.file.filename}`;
    const agreement = {
      title: req.body.title || 'Subscription Agreement',
      type: req.body.type || 'service',
      fileUrl,
      fileName: req.file.originalname,
      validFrom: req.body.validFrom || undefined,
      validUntil: req.body.validUntil || undefined,
      notes: req.body.notes || '',
    };

    sub.agreements.push(agreement);
    await sub.save();

    // Also push to CRM Agreements so it appears in the client's agreement history
    const Agreement = require('../models/Agreement');
    await Agreement.create({
      agreementType: 'subscription_service',
      title: agreement.title,
      client: sub.client,
      subscription: sub._id,
      content: `Subscription Agreement attached for: ${sub.title}<br/>${agreement.notes || ''}`,
      fileUrl,
      status: 'finalised',
      createdBy: req.user._id,
      agreementDate: agreement.validFrom || new Date(),
    });

    res.json({ success: true, message: 'Agreement added and synced to CRM', subscription: sub });
  } catch (err) { next(err); }
};

exports.removeAgreement = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    sub.agreements = sub.agreements.filter(a => String(a._id) !== req.params.agreementId);
    await sub.save();

    res.json({ success: true, message: 'Agreement removed', subscription: sub });
  } catch (err) { next(err); }
};

// ── SEND HISTORY (admin) ──────────────────────────────
exports.sendHistory = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate('client', 'name email phone');
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const client = sub.client;
    if (!client) return res.status(400).json({ success: false, message: 'Client not associated with this subscription' });

    const methods = req.body.methods || ['email'];
    const emailService = require('../services/emailService');
    const smsService = require('../services/smsService');

    let sentEmail = false;
    let sentSms = false;

    if (methods.includes('email') && client.email) {
      await emailService.sendSubscriptionHistoryEmail(client.email, client.name, sub);
      sentEmail = true;
    }

    if (methods.includes('sms') && client.phone) {
      await smsService.sendSubscriptionHistorySms(client.phone, client.name, sub.title, sub.totalPaid);
      sentSms = true;
    }

    if (!sentEmail && !sentSms) {
      return res.status(400).json({ success: false, message: 'No valid contact methods found for client.' });
    }

    res.json({ success: true, message: 'History sent successfully' });
  } catch (err) { next(err); }
};

// ── BILLING OVERVIEW (admin dashboard) ────────────────
exports.getBillingOverview = async (req, res, next) => {
  try {
    const { branch } = req.query;
    const subMatch = { status: { $in: ['active', 'overdue'] }, ...(branch ? { branch } : {}) };

    const subs = await Subscription.find(subMatch)
      .populate('client', 'name email')
      .populate('project', 'title');

    let totalMRR = 0;
    let totalOverdue = 0;
    let totalCollected = 0;
    let overdueCount = 0;
    const now = new Date();

    const clientSummaries = {};

    subs.forEach((s) => {
      // Monthly Recurring Revenue
      let monthlyEquiv = s.amount;
      if (s.billingFrequency === 'quarterly') monthlyEquiv = s.amount / 3;
      else if (s.billingFrequency === 'semi_annual') monthlyEquiv = s.amount / 6;
      else if (s.billingFrequency === 'annual') monthlyEquiv = s.amount / 12;
      totalMRR += monthlyEquiv;

      const overdue = calcOverdueDays(s.nextDueDate);
      const remaining = Math.max(0, s.totalBilled - s.totalPaid);

      if (overdue > 0) {
        totalOverdue += remaining;
        overdueCount++;
      }
      totalCollected += s.totalPaid;

      const clientId = String(s.client._id);
      if (!clientSummaries[clientId]) {
        clientSummaries[clientId] = {
          client: s.client,
          subscriptions: [],
          totalDue: 0,
          totalPaid: 0,
          overdueAmount: 0,
          overdueSubs: 0,
        };
      }
      clientSummaries[clientId].subscriptions.push({
        _id: s._id,
        title: s.title,
        type: s.subscriptionType,
        typeLabel: SUBSCRIPTION_TYPE_LABELS[s.subscriptionType] || s.subscriptionType,
        amount: s.amount,
        status: overdue > 0 ? 'overdue' : s.status,
        overdueDays: overdue,
        nextDueDate: s.nextDueDate,
        remaining,
      });
      clientSummaries[clientId].totalDue += s.totalBilled;
      clientSummaries[clientId].totalPaid += s.totalPaid;
      if (overdue > 0) {
        clientSummaries[clientId].overdueAmount += remaining;
        clientSummaries[clientId].overdueSubs++;
      }
    });

    // Hosting renewals coming up (next 30 days)
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const hostingRenewals = await Subscription.find({
      'hostingDetails.expiryDate': { $lte: thirtyDaysOut, $gte: now },
      status: { $in: ['active', 'overdue'] },
      ...(branch ? { branch } : {}),
    }).populate('client', 'name email').populate('project', 'title');

    // Monthly revenue for chart (last 12 months)
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      let revenue = 0;
      subs.forEach((s) => {
        s.payments.forEach((p) => {
          const pd = new Date(p.paidAt);
          if (pd >= monthStart && pd <= monthEnd) revenue += p.amount;
        });
      });
      monthlyRevenue.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        revenue,
      });
    }

    // Subscription type distribution
    const typeDist = {};
    subs.forEach((s) => {
      const label = SUBSCRIPTION_TYPE_LABELS[s.subscriptionType] || s.subscriptionType;
      typeDist[label] = (typeDist[label] || 0) + 1;
    });

    res.json({
      success: true,
      overview: {
        totalMRR: Math.round(totalMRR),
        totalOverdue: Math.round(totalOverdue),
        totalCollected: Math.round(totalCollected),
        overdueCount,
        activeCount: subs.filter(s => s.status === 'active').length,
        totalSubscriptions: subs.length,
        clientSummaries: Object.values(clientSummaries),
        hostingRenewals,
        monthlyRevenue,
        typeDist: Object.entries(typeDist).map(([name, value]) => ({ name, value })),
      },
    });
  } catch (err) { next(err); }
};

// ── CHECK & UPDATE OVERDUE (cron-like) ────────────────
exports.processOverdue = async (req, res, next) => {
  try {
    const subs = await Subscription.find({ status: 'active' });
    let updated = 0;

    for (const sub of subs) {
      const days = calcOverdueDays(sub.nextDueDate);
      if (days > 0 && sub.status !== 'overdue') {
        sub.status = 'overdue';
        sub.overdueDays = days;
        sub.lastOverdueCheck = new Date();
        await sub.save();
        updated++;

        await createNotification({
          recipient: sub.client,
          title: '⚠️ Subscription Overdue',
          message: `Your "${sub.title}" subscription is ${days} day(s) overdue. Please make payment to avoid service interruption.`,
          type: 'subscription',
          link: '/my-subscriptions',
        });
      } else if (days > 0) {
        sub.overdueDays = days;
        sub.lastOverdueCheck = new Date();
        await sub.save();
      }
    }

    res.json({ success: true, message: `Processed ${subs.length} subscriptions, ${updated} marked overdue` });
  } catch (err) { next(err); }
};

// ── CLIENT: get my subscription summary ───────────────
exports.getMySubscriptionSummary = async (req, res, next) => {
  try {
    const subs = await Subscription.find({ client: req.user._id })
      .populate('project', 'title status progress')
      .populate('previousProjects', 'title status')
      .sort({ createdAt: -1 });

    let totalDue = 0;
    let totalPaid = 0;
    let overdueCount = 0;

    const enriched = subs.map((s) => {
      const obj = s.toObject();
      obj.overdueDays = calcOverdueDays(s.nextDueDate);
      obj.remainingBalance = Math.max(0, s.totalBilled - s.totalPaid);
      obj.typeLabel = SUBSCRIPTION_TYPE_LABELS[s.subscriptionType] || s.subscriptionType;
      totalDue += s.totalBilled;
      totalPaid += s.totalPaid;
      if (obj.overdueDays > 0) overdueCount++;
      return obj;
    });

    res.json({
      success: true,
      subscriptions: enriched,
      summary: {
        total: enriched.length,
        active: enriched.filter(s => s.status === 'active').length,
        overdue: overdueCount,
        totalDue,
        totalPaid,
        remaining: Math.max(0, totalDue - totalPaid),
      },
    });
  } catch (err) { next(err); }
};


