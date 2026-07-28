const SiteStock = require('../models/SiteStock');
const MaterialTransfer = require('../models/MaterialTransfer');
const GRN = require('../models/GRN');
const Project = require('../models/Project');

// Get all inventory items (Central Warehouse & per-site)
exports.getInventory = async (req, res) => {
  try {
    const { siteId } = req.query;
    const filter = siteId ? { site: siteId } : {};
    const stock = await SiteStock.find(filter).populate('site', 'title description');
    const warehouseStock = await SiteStock.find({ isCentralWarehouse: true });
    
    res.json({ success: true, stock, warehouseStock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add or update stock item
exports.upsertStock = async (req, res) => {
  try {
    const { id, site, isCentralWarehouse, itemName, category, quantity, unit, unitPrice, reorderLevel } = req.body;
    
    let item;
    if (id) {
      item = await SiteStock.findByIdAndUpdate(id, {
        site: site || null,
        isCentralWarehouse: !!isCentralWarehouse,
        itemName, category, quantity, unit, unitPrice, reorderLevel,
        lastRestocked: new Date(),
        updatedBy: req.user._id,
      }, { new: true });
    } else {
      item = await SiteStock.create({
        site: site || null,
        isCentralWarehouse: !!isCentralWarehouse,
        itemName, category, quantity, unit, unitPrice, reorderLevel,
        lastRestocked: new Date(),
        updatedBy: req.user._id,
      });
    }

    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create material transfer (Central Warehouse -> Site N)
exports.createTransfer = async (req, res) => {
  try {
    const { fromSite, toSite, itemName, category, quantity, unit } = req.body;
    const transferNo = 'MT-' + Date.now().toString().slice(-6);

    const transfer = await MaterialTransfer.create({
      transferNo,
      fromSite: fromSite || null,
      toSite,
      itemName,
      category,
      quantity,
      unit,
      dispatchedBy: req.user._id,
      status: 'in_transit'
    });

    // Deduct stock from source warehouse if present
    const sourceStock = await SiteStock.findOne({ isCentralWarehouse: true, itemName });
    if (sourceStock && sourceStock.quantity >= quantity) {
      sourceStock.quantity -= Number(quantity);
      await sourceStock.save();
    }

    res.json({ success: true, transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Receive material transfer at Site
exports.receiveTransfer = async (req, res) => {
  try {
    const { id, receivedQty, discrepancyNote } = req.body;
    const transfer = await MaterialTransfer.findById(id);
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

    const diff = transfer.quantity - Number(receivedQty || transfer.quantity);
    transfer.receivedBy = req.user._id;
    transfer.receivedAt = new Date();

    if (diff > 0) {
      transfer.status = 'discrepancy_flagged';
      transfer.discrepancyQty = diff;
      transfer.discrepancyNote = discrepancyNote || `Shortage of ${diff} ${transfer.unit} flagged at destination site.`;
    } else {
      transfer.status = 'received';
    }
    await transfer.save();

    // Add to target site stock
    let targetStock = await SiteStock.findOne({ site: transfer.toSite, itemName: transfer.itemName });
    if (targetStock) {
      targetStock.quantity += Number(receivedQty || transfer.quantity);
      await targetStock.save();
    } else {
      await SiteStock.create({
        site: transfer.toSite,
        isCentralWarehouse: false,
        itemName: transfer.itemName,
        category: transfer.category || 'Cement',
        quantity: Number(receivedQty || transfer.quantity),
        unit: transfer.unit || 'bags',
        lastRestocked: new Date(),
        updatedBy: req.user._id,
      });
    }

    res.json({ success: true, transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get transfers list
exports.getTransfers = async (req, res) => {
  try {
    const transfers = await MaterialTransfer.find()
      .populate('fromSite', 'title')
      .populate('toSite', 'title')
      .populate('dispatchedBy', 'name')
      .populate('receivedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, transfers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create GRN with Fraud Protection Variance Warning
exports.createGRN = async (req, res) => {
  try {
    const { site, supplierName, poNumber, itemName, orderedQty, receivedQty, unit, unitPrice, supervisorSignatureUrl } = req.body;
    const grnNo = 'GRN-' + Date.now().toString().slice(-6);

    const ord = Number(orderedQty);
    const rec = Number(receivedQty);
    const varianceQty = ord - rec;
    const hasVariance = varianceQty !== 0;

    const grn = await GRN.create({
      grnNo,
      site,
      supplier: req.user.role === 'supplier' ? req.user._id : undefined,
      supplierName: supplierName || req.user.name,
      poNumber: poNumber || 'PO-' + Date.now().toString().slice(-4),
      itemName,
      orderedQty: ord,
      receivedQty: rec,
      unit,
      unitPrice: Number(unitPrice || 0),
      varianceQty,
      hasVariance,
      paymentHoldFlag: hasVariance,
      varianceReason: hasVariance ? `Variance detected: Ordered ${ord} ${unit}, but received ${rec} ${unit}. Payment auto-held for Accountant verification.` : '',
      receivedBy: req.user._id,
      supervisorSignatureUrl: supervisorSignatureUrl || '',
      status: hasVariance ? 'flagged_variance' : 'verified',
    });

    // Update site stock
    let targetStock = await SiteStock.findOne({ site, itemName });
    if (targetStock) {
      targetStock.quantity += rec;
      await targetStock.save();
    } else {
      await SiteStock.create({
        site,
        isCentralWarehouse: false,
        itemName,
        category: 'Cement',
        quantity: rec,
        unit: unit || 'bags',
        unitPrice: Number(unitPrice || 0),
        lastRestocked: new Date(),
        updatedBy: req.user._id,
      });
    }

    res.json({ success: true, grn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get GRN records
exports.getGRNs = async (req, res) => {
  try {
    const grns = await GRN.find()
      .populate('site', 'title')
      .populate('receivedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, grns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
