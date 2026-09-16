const Reward = require('../models/Reward');
const RewardRule = require('../models/RewardRule');
const Voucher = require('../models/Voucher');
const Referral = require('../models/Referral');
const User = require('../models/User');
const { createNotification } = require('./notificationService');

const DEFAULT_RULES = {
  register_account: 50,
  complete_invoice_payment: 100,
  referral_signup: 500,
  leave_review: 25,
  buy_premium_service: 1000,
  monthly_active_usage: 40,
};

const calcTier = (points) => {
  if (points >= 5000) return 'Platinum';
  if (points >= 1000) return 'Gold';
  return 'Silver';
};

const generateReferralCode = async () => {
  let code = '';
  let exists = true;
  while (exists) {
    const seed = Math.floor(1000 + Math.random() * 9000);
    code = `RAX-CLIENT-${seed}`;
    exists = await Reward.exists({ referralCode: code });
  }
  return code;
};

async function getOrCreateReward(userId) {
  let reward = await Reward.findOne({ userId });
  if (!reward) {
    reward = await Reward.create({ userId, referralCode: await generateReferralCode() });
  }
  return reward;
}

async function getRulePoints(action, fallback = 0) {
  const rule = await RewardRule.findOne({ action });
  if (!rule || !rule.isActive) return fallback;
  return Number(rule.points || fallback);
}

async function ensureDefaultRules() {
  const actions = Object.keys(DEFAULT_RULES);
  for (const action of actions) {
    const exists = await RewardRule.findOne({ action });
    if (!exists) {
      await RewardRule.create({ action, points: DEFAULT_RULES[action], isActive: true, campaignName: 'Default Campaign' });
    }
  }
}

async function awardPoints({ userId, action, sourceKey, note = '', meta = {}, fallbackPoints = 0 }) {
  if (!userId || !action || !sourceKey) return { awarded: false, reason: 'missing_required' };
  const reward = await getOrCreateReward(userId);
  const duplicate = reward.pointsHistory.some((item) => item.sourceKey === sourceKey);
  if (duplicate) return { awarded: false, reason: 'duplicate' };

  const points = await getRulePoints(action, fallbackPoints || DEFAULT_RULES[action] || 0);
  if (!points || points <= 0) return { awarded: false, reason: 'zero_points' };

  reward.pointsHistory.push({ action, points, sourceKey, note, meta });
  reward.totalPoints += Number(points);
  await reward.save();

  await createNotification({
    recipient: userId,
    title: 'Reward Points Earned',
    message: `You earned ${points} loyalty points. Current balance: ${reward.totalPoints}.`,
    type: 'reward',
    link: '/rewards',
  });
  return { awarded: true, points, totalPoints: reward.totalPoints, tier: calcTier(reward.totalPoints) };
}

async function handleReferralForNewClient({ newUserId, referralCode }) {
  if (!newUserId || !referralCode) return null;
  const referrerReward = await Reward.findOne({ referralCode: String(referralCode).trim().toUpperCase() });
  if (!referrerReward) return null;
  if (String(referrerReward.userId) === String(newUserId)) return null;

  const existing = await Referral.findOne({ referrerId: referrerReward.userId, referredUserId: newUserId });
  if (existing) return existing;

  const points = await getRulePoints('referral_signup', DEFAULT_RULES.referral_signup);
  const referral = await Referral.create({
    referrerId: referrerReward.userId,
    referredUserId: newUserId,
    referralCode: referrerReward.referralCode,
    rewardPoints: points,
    status: 'completed',
  });

  await awardPoints({
    userId: referrerReward.userId,
    action: 'referral_signup',
    sourceKey: `referral:${referral._id}:referrer`,
    note: 'Referral signup reward credited.',
    fallbackPoints: points,
    meta: { referredUserId: newUserId },
  });

  await awardPoints({
    userId: newUserId,
    action: 'register_account',
    sourceKey: `referral:${referral._id}:new_client_bonus`,
    note: 'Welcome bonus for joining with referral code.',
    fallbackPoints: 30,
    meta: { referralCode: referrerReward.referralCode },
  });

  const referrer = await User.findById(referrerReward.userId).select('_id');
  if (referrer) {
    await createNotification({
      recipient: referrer._id,
      title: 'Referral Completed',
      message: 'Your referral signed up successfully. Referral bonus credited.',
      type: 'referral',
      link: '/rewards',
    });
  }

  return referral;
}

function calculateVoucherDiscount({ voucher, invoiceTotal }) {
  const total = Number(invoiceTotal || 0);
  if (!voucher || total <= 0) return 0;
  if (voucher.type === 'percentage') return Math.min(total, Math.round((total * Number(voucher.value || 0)) / 100));
  if (voucher.type === 'fixed' || voucher.type === 'hosting_discount') return Math.min(total, Number(voucher.value || 0));
  if (voucher.type === 'free_consultation') return Math.min(total, Number(voucher.value || 0) || 5000);
  if (voucher.type === 'premium_support') return Math.min(total, Number(voucher.value || 0) || 3000);
  return 0;
}

async function validateVoucherForClient({ code, clientId, invoiceTotal }) {
  if (!code) return { valid: false, message: 'Voucher code is required' };
  const voucher = await Voucher.findOne({ code: String(code).trim().toUpperCase() });
  if (!voucher) return { valid: false, message: 'Voucher not found' };
  if (!voucher.isActive) return { valid: false, message: 'Voucher is inactive' };
  if (voucher.expiryDate && new Date(voucher.expiryDate) < new Date()) return { valid: false, message: 'Voucher has expired' };
  if (voucher.owner && String(voucher.owner) !== String(clientId)) return { valid: false, message: 'Voucher is not assigned to this client' };
  if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) return { valid: false, message: 'Voucher usage limit reached' };
  if (Number(invoiceTotal || 0) < Number(voucher.minimumSpend || 0)) {
    return { valid: false, message: `Minimum spend is LKR ${Number(voucher.minimumSpend || 0).toLocaleString()}` };
  }
  const discount = calculateVoucherDiscount({ voucher, invoiceTotal });
  return {
    valid: true,
    voucher,
    discount,
    finalAmount: Math.max(Number(invoiceTotal || 0) - discount, 0),
  };
}

module.exports = {
  DEFAULT_RULES,
  calcTier,
  ensureDefaultRules,
  getOrCreateReward,
  getRulePoints,
  awardPoints,
  handleReferralForNewClient,
  validateVoucherForClient,
};
