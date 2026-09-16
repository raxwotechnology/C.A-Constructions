const Reward = require('../models/Reward');
const RewardRule = require('../models/RewardRule');
const Voucher = require('../models/Voucher');
const Referral = require('../models/Referral');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { calcTier, getOrCreateReward, validateVoucherForClient } = require('../services/rewardService');
const { createNotification } = require('../services/notificationService');

const makeVoucherCode = async () => {
  let code = '';
  let exists = true;
  while (exists) {
    code = `RAX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    exists = await Voucher.exists({ code });
  }
  return code;
};

exports.getMyRewards = async (req, res, next) => {
  try {
    const reward = await getOrCreateReward(req.user._id);
    const vouchers = await Voucher.find({ owner: req.user._id }).sort({ createdAt: -1 });
    const referrals = await Referral.find({ referrerId: req.user._id })
      .populate('referredUserId', 'name email')
      .sort({ createdAt: -1 });
    const expiringSoon = vouchers.filter((v) => v.isActive && v.expiryDate && (new Date(v.expiryDate).getTime() - Date.now()) < (7 * 24 * 60 * 60 * 1000));
    for (const voucher of expiringSoon) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const existing = await Notification.findOne({
        recipient: req.user._id,
        type: 'voucher',
        title: 'Voucher Expiring Soon',
        message: { $regex: voucher.code },
        createdAt: { $gte: todayStart },
      });
      if (!existing) {
        await createNotification({
          recipient: req.user._id,
          title: 'Voucher Expiring Soon',
          message: `Voucher ${voucher.code} is expiring on ${new Date(voucher.expiryDate).toLocaleDateString()}.`,
          type: 'voucher',
          link: '/rewards',
        });
      }
    }
    res.json({
      success: true,
      reward,
      tier: calcTier(reward.totalPoints),
      vouchers,
      referrals,
      expiringSoonCount: expiringSoon.length,
    });
  } catch (err) { next(err); }
};

exports.getCatalog = async (req, res, next) => {
  try {
    const templates = await Voucher.find({ isTemplate: true, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, templates });
  } catch (err) { next(err); }
};

exports.previewVoucher = async (req, res, next) => {
  try {
    const { invoiceId, voucherCode } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const result = await validateVoucherForClient({ code: voucherCode, clientId: req.user._id, invoiceTotal: invoice.total });
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });
    res.json({ success: true, discount: result.discount, finalAmount: result.finalAmount, voucher: result.voucher });
  } catch (err) { next(err); }
};

exports.redeemVoucher = async (req, res, next) => {
  try {
    const { templateId } = req.body;
    const reward = await getOrCreateReward(req.user._id);
    const template = await Voucher.findOne({ _id: templateId, isTemplate: true, isActive: true });
    if (!template) return res.status(404).json({ success: false, message: 'Voucher template not found' });
    if (reward.totalPoints < Number(template.pointsCost || 0)) {
      return res.status(400).json({ success: false, message: 'Insufficient points balance' });
    }
    reward.totalPoints -= Number(template.pointsCost || 0);
    reward.pointsHistory.push({
      action: 'voucher_redeemed',
      points: -Math.abs(Number(template.pointsCost || 0)),
      sourceKey: `voucher_redeem:${template._id}:${Date.now()}`,
      note: `Redeemed voucher ${template.title || template.code}`,
      meta: { templateId: template._id },
    });
    await reward.save();

    const voucher = await Voucher.create({
      code: await makeVoucherCode(),
      title: template.title,
      type: template.type,
      value: template.value,
      pointsCost: template.pointsCost,
      minimumSpend: template.minimumSpend,
      expiryDate: template.expiryDate,
      usageLimit: template.usageLimit,
      usedCount: 0,
      isActive: true,
      isTemplate: false,
      owner: req.user._id,
      campaignName: template.campaignName,
    });

    await createNotification({
      recipient: req.user._id,
      title: 'Voucher Redeemed',
      message: `Voucher ${voucher.code} redeemed successfully.`,
      type: 'voucher',
      link: '/rewards',
    });

    res.status(201).json({ success: true, voucher, totalPoints: reward.totalPoints });
  } catch (err) { next(err); }
};

exports.adminGetRules = async (req, res, next) => {
  try {
    const rules = await RewardRule.find().sort({ action: 1 });
    res.json({ success: true, rules });
  } catch (err) { next(err); }
};

exports.adminUpsertRule = async (req, res, next) => {
  try {
    const { action, points, isActive = true, campaignName = '' } = req.body;
    if (!action) return res.status(400).json({ success: false, message: 'Action is required' });
    const rule = await RewardRule.findOneAndUpdate(
      { action },
      { points: Number(points || 0), isActive: Boolean(isActive), campaignName },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, rule });
  } catch (err) { next(err); }
};

exports.adminGetVouchers = async (req, res, next) => {
  try {
    const vouchers = await Voucher.find().populate('owner', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, vouchers });
  } catch (err) { next(err); }
};

exports.adminCreateVoucherTemplate = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const voucher = await Voucher.create({
      code: payload.code ? String(payload.code).toUpperCase() : await makeVoucherCode(),
      title: payload.title || '',
      type: payload.type,
      value: Number(payload.value || 0),
      pointsCost: Number(payload.pointsCost || 0),
      minimumSpend: Number(payload.minimumSpend || 0),
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)),
      usageLimit: Number(payload.usageLimit || 1),
      isActive: payload.isActive !== false,
      isTemplate: true,
      campaignName: payload.campaignName || '',
    });
    res.status(201).json({ success: true, voucher });
  } catch (err) { next(err); }
};

exports.adminUpdateVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.json({ success: true, voucher });
  } catch (err) { next(err); }
};

exports.adminDeleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.json({ success: true, message: 'Voucher removed' });
  } catch (err) { next(err); }
};

exports.adminAnalytics = async (req, res, next) => {
  try {
    const rewards = await Reward.find().populate('userId', 'name email');
    const referrals = await Referral.find();
    const vouchers = await Voucher.find();
    const topClients = [...rewards]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10)
      .map((r) => ({ name: r.userId?.name || 'Unknown', points: r.totalPoints, email: r.userId?.email || '' }));
    const pointsEarned = rewards.reduce((sum, r) => sum + Number(r.pointsHistory.filter((x) => x.points > 0).reduce((a, b) => a + b.points, 0)), 0);
    const voucherUsage = vouchers.reduce((sum, v) => sum + Number(v.usedCount || 0), 0);
    res.json({
      success: true,
      analytics: {
        pointsEarned,
        voucherUsage,
        referralGrowth: referrals.length,
        topClients,
        totalClientsInRewards: rewards.length,
      },
    });
  } catch (err) { next(err); }
};

exports.adminClientLeaderboard = async (req, res, next) => {
  try {
    const rewards = await Reward.find().populate('userId', 'name email').sort({ totalPoints: -1 }).limit(50);
    res.json({
      success: true,
      clients: rewards.map((r) => ({
        userId: r.userId?._id,
        name: r.userId?.name,
        email: r.userId?.email,
        totalPoints: r.totalPoints,
        tier: calcTier(r.totalPoints),
      })),
    });
  } catch (err) { next(err); }
};
