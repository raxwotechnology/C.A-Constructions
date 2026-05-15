const ClientProfile = require('../models/ClientProfile');
const User = require('../models/User');
const Reward = require('../models/Reward');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');

exports.getClients = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.branch) query.branch = req.query.branch;
    
    // First find all users with role 'client'
    const userQuery = { role: 'client' };
    if (req.query.branch) userQuery.branch = req.query.branch;
    const clientUsers = await User.find(userQuery).select('name email phone branch isActive createdAt').populate('branch', 'name');
    
    // Then get their profiles
    const profiles = await ClientProfile.find({ userId: { $in: clientUsers.map(u => u._id) } });
    const profileMap = profiles.reduce((acc, p) => { acc[p.userId.toString()] = p; return acc; }, {});

    const rewards = await Reward.find({ userId: { $in: clientUsers.map(u => u._id) } }).select('userId referralCode');
    const referralMap = rewards.reduce((acc, r) => { acc[r.userId.toString()] = r.referralCode; return acc; }, {});

    const clients = clientUsers.map(u => ({
      ...u.toObject(),
      profile: profileMap[u._id.toString()] || null,
      referralCode: referralMap[u._id.toString()] || '',
    }));

    res.json({ success: true, clients });
  } catch (err) { next(err); }
};

exports.getClientProfile = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate('branch', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'Client not found' });

    let profile = await ClientProfile.findOne({ userId }).populate('accountManager', 'name');
    if (!profile) {
      profile = await ClientProfile.create({ userId, companyName: user.name, branch: user.branch });
    }

    // Fetch related tab data
    const Agreement = require('../models/Agreement');
    const [projects, invoices, subscriptions, payments, agreements] = await Promise.all([
      Project.find({ client: userId }).select('title status progress budget invoice'),
      Invoice.find({ client: userId }).select('invoiceNo total remainingBalance status dueDate'),
      Subscription.find({ client: userId }).select('title subscriptionType status amount nextDueDate'),
      Payment.find({ client: userId }).select('amount currency status createdAt method reference'),
      Agreement.find({ client: userId }).select('title agreementType status agreementNo createdAt')
    ]);

    res.json({
      success: true,
      client: { ...user.toObject(), profile },
      projects,
      invoices,
      subscriptions,
      payments,
      agreements
    });
  } catch (err) { next(err); }
};

exports.updateClientProfile = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { companyName, contactPerson, designation, clientType, industry, clientSource, primaryPhone, secondaryPhone, billingAddress, shippingAddress, branch, accountManager, status } = req.body;
    
    let profile = await ClientProfile.findOne({ userId });
    if (!profile) {
      profile = new ClientProfile({ userId });
    }
    
    if (companyName) profile.companyName = companyName;
    if (contactPerson) profile.contactPerson = contactPerson;
    if (designation) profile.designation = designation;
    if (clientType) profile.clientType = clientType;
    if (industry) profile.industry = industry;
    if (clientSource) profile.clientSource = clientSource;
    if (primaryPhone) profile.primaryPhone = primaryPhone;
    if (secondaryPhone) profile.secondaryPhone = secondaryPhone;
    if (billingAddress) profile.billingAddress = billingAddress;
    if (shippingAddress) profile.shippingAddress = shippingAddress;
    if (branch) profile.branch = branch;
    if (accountManager) profile.accountManager = accountManager;
    if (status) profile.status = status;

    await profile.save();
    
    res.json({ success: true, profile });
  } catch (err) { next(err); }
};

exports.addClientNote = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { type, notes, followUpDate } = req.body;
    
    let profile = await ClientProfile.findOne({ userId });
    if (!profile) profile = new ClientProfile({ userId });

    profile.notes.push({
      type: type || 'note',
      notes,
      followUpDate: followUpDate || null,
      recordedBy: req.user._id
    });

    await profile.save();
    res.json({ success: true, profile });
  } catch (err) { next(err); }
};
