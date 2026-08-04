const CateringVendor = require('../models/CateringVendor');
const MealEntry = require('../models/MealEntry');
const MealSettlement = require('../models/MealSettlement');
const Project = require('../models/Project');
const smsService = require('../services/smsService');

// Get all vendors
exports.getVendors = async (req, res) => {
  try {
    const vendors = await CateringVendor.find().sort({ name: 1 });
    res.json({ success: true, vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create vendor
exports.createVendor = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, defaultMealRate, bankDetails, notes } = req.body;
    const vendor = await CateringVendor.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      defaultMealRate: Number(defaultMealRate || 250),
      bankDetails: bankDetails || {},
      notes,
      createdBy: req.user?._id,
    });

    res.json({ success: true, message: 'Catering Vendor created successfully', vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Log Daily Meal Entry
exports.createMealEntry = async (req, res) => {
  try {
    const { vendorId, date, shift, mealCount, unitPrice, projectId, notes } = req.body;

    const vendor = await CateringVendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: 'Catering Vendor not found' });

    const count = Number(mealCount || 0);
    const rate = Number(unitPrice || vendor.defaultMealRate || 250);
    const totalCost = count * rate;

    let siteName = 'Head Office / Site';
    if (projectId) {
      const proj = await Project.findById(projectId);
      if (proj) siteName = proj.name || proj.title;
    }

    const entry = await MealEntry.create({
      vendor: vendorId,
      date: date || new Date(),
      shift: shift || 'Day',
      mealCount: count,
      unitPrice: rate,
      totalCost,
      project: projectId || null,
      siteName,
      settlementStatus: 'unsettled',
      notes: notes || '',
      recordedBy: req.user?._id,
    });

    // Update vendor balances
    vendor.outstandingBalance = (vendor.outstandingBalance || 0) + totalCost;
    vendor.totalBilled = (vendor.totalBilled || 0) + totalCost;
    await vendor.save();

    res.json({ success: true, message: 'Daily Meal Entry recorded', entry, vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get meal entries (with optional vendor or date filters)
exports.getMealEntries = async (req, res) => {
  try {
    const { vendorId, status, startDate, endDate } = req.query;
    const filter = {};
    if (vendorId) filter.vendor = vendorId;
    if (status) filter.settlementStatus = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const entries = await MealEntry.find(filter)
      .populate('vendor', 'name phone')
      .populate('project', 'name title')
      .sort({ date: -1 });

    res.json({ success: true, entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Weekly Settlement
exports.createSettlement = async (req, res) => {
  try {
    const { vendorId, startDate, endDate, totalBillAmount, paidAmount, paymentMethod, chequeNumber, notes } = req.body;

    const vendor = await CateringVendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ success: false, message: 'Catering Vendor not found' });

    const totalBill = Number(totalBillAmount || 0);
    const paid = Number(paidAmount || 0);
    const remaining = totalBill - paid;

    const settlementNo = 'MS-' + Date.now().toString().slice(-6);

    // Find unsettled meal entries in date range (or all unsettled for vendor)
    const entryQuery = { vendor: vendorId, settlementStatus: 'unsettled' };
    if (startDate && endDate) {
      entryQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const unsettledEntries = await MealEntry.find(entryQuery);

    let totalMealCount = 0;
    for (const e of unsettledEntries) {
      totalMealCount += e.mealCount;
    }

    const settlement = await MealSettlement.create({
      settlementNo,
      vendor: vendorId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      totalMealCount,
      totalBillAmount: totalBill,
      paidAmount: paid,
      remainingOutstanding: remaining,
      paymentMethod: paymentMethod || 'cash',
      chequeNumber: chequeNumber || '',
      paymentDate: new Date(),
      notes: notes || '',
      recordedBy: req.user?._id,
    });

    // Update entries status
    for (const e of unsettledEntries) {
      e.settlementStatus = paid >= totalBill ? 'settled' : 'partially_settled';
      e.settlement = settlement._id;
      await e.save();
    }

    // Update vendor total paid & outstanding balance
    vendor.totalPaid = (vendor.totalPaid || 0) + paid;
    vendor.outstandingBalance = Math.max(0, (vendor.outstandingBalance || 0) - paid);
    await vendor.save();

    // Trigger SMS Alert to Catering Vendor
    let smsSent = false;
    if (vendor.phone) {
      const formattedPaid = paid.toLocaleString();
      const formattedRemaining = remaining.toLocaleString();
      const smsMsg = `RA Creation / C.A: Payment Alert! Settlement ${settlementNo} processed. Paid: LKR ${formattedPaid}. Remaining Balance: LKR ${formattedRemaining}. Thank you.`;
      smsSent = await smsService.sendSms(vendor.phone, smsMsg, vendor.name, 'meal_settlement');
      settlement.smsSent = smsSent;
      settlement.smsResponse = smsSent ? 'SMS sent successfully' : 'SMS failed or queued';
      await settlement.save();
    }

    res.json({
      success: true,
      message: 'Weekly Settlement recorded successfully & SMS Alert triggered',
      settlement,
      vendor,
      smsSent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get list of settlements
exports.getSettlements = async (req, res) => {
  try {
    const { vendorId } = req.query;
    const filter = vendorId ? { vendor: vendorId } : {};

    const settlements = await MealSettlement.find(filter)
      .populate('vendor', 'name phone contactPerson bankDetails')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, settlements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Single Settlement Printable Details
exports.getSettlementPrintDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const settlement = await MealSettlement.findById(id).populate('vendor').populate('recordedBy', 'name');
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });

    const entries = await MealEntry.find({ settlement: id }).populate('project', 'name title');

    res.json({ success: true, settlement, entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
