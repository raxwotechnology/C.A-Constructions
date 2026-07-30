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

// Create Multi-Item GRN with Fraud Protection Variance Warning
exports.createGRN = async (req, res) => {
  try {
    const { site, siteName, supplierName, poNumber, items, supervisorSignatureUrl } = req.body;
    const grnNo = 'GRN-' + Date.now().toString().slice(-6);

    let processedItems = [];
    let hasVariance = false;
    let varianceDetails = [];
    let totalAmount = 0;

    if (Array.isArray(items) && items.length > 0) {
      processedItems = items.map(item => {
        const ord = Number(item.orderedQty || 0);
        const rec = Number(item.receivedQty || 0);
        const price = Number(item.unitPrice || 0);
        const varQty = ord - rec;
        const itemHasVariance = varQty !== 0;

        if (itemHasVariance) {
          hasVariance = true;
          varianceDetails.push(`${item.itemName}: Ordered ${ord} ${item.unit || 'units'}, Received ${rec} ${item.unit || 'units'}`);
        }

        const lineTotal = rec * price;
        totalAmount += lineTotal;

        return {
          itemName: item.itemName,
          category: item.category || 'General',
          orderedQty: ord,
          receivedQty: rec,
          unit: item.unit || 'units',
          unitPrice: price,
          lineTotal,
          varianceQty: varQty,
          hasVariance: itemHasVariance,
        };
      });
    } else {
      // Legacy single-item fallback
      const { itemName, orderedQty, receivedQty, unit, unitPrice } = req.body;
      const ord = Number(orderedQty || 0);
      const rec = Number(receivedQty || 0);
      const price = Number(unitPrice || 0);
      const varQty = ord - rec;
      hasVariance = varQty !== 0;
      totalAmount = rec * price;

      if (hasVariance) {
        varianceDetails.push(`${itemName}: Ordered ${ord} ${unit}, Received ${rec} ${unit}`);
      }

      processedItems.push({
        itemName,
        category: 'General',
        orderedQty: ord,
        receivedQty: rec,
        unit: unit || 'units',
        unitPrice: price,
        lineTotal: totalAmount,
        varianceQty: varQty,
        hasVariance,
      });
    }

    const grn = await GRN.create({
      grnNo,
      site,
      siteName: siteName || 'Central Warehouse',
      supplier: req.user.role === 'supplier' ? req.user._id : undefined,
      supplierName: supplierName || req.user.name,
      poNumber: poNumber || 'PO-' + Date.now().toString().slice(-4),
      items: processedItems,
      totalAmount,
      hasVariance,
      paymentHoldFlag: hasVariance,
      varianceReason: hasVariance ? `Variance detected: ${varianceDetails.join('; ')}. Payment auto-held for Accountant verification.` : '',
      receivedBy: req.user._id,
      supervisorSignatureUrl: supervisorSignatureUrl || '',
      status: hasVariance ? 'flagged_variance' : 'verified',
    });

    // Update site stock for each item in the GRN
    for (const item of processedItems) {
      if (item.receivedQty > 0) {
        let targetStock = await SiteStock.findOne({ site, itemName: item.itemName });
        if (targetStock) {
          targetStock.quantity += item.receivedQty;
          await targetStock.save();
        } else {
          await SiteStock.create({
            site,
            isCentralWarehouse: !site,
            itemName: item.itemName,
            category: item.category || 'General',
            quantity: item.receivedQty,
            unit: item.unit || 'units',
            unitPrice: item.unitPrice,
            lastRestocked: new Date(),
            updatedBy: req.user._id,
          });
        }
      }
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

// Resolve GRN Payment Hold / Variance Flag
exports.resolveGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const grn = await GRN.findById(id);
    if (!grn) {
      return res.status(404).json({ success: false, message: 'GRN record not found' });
    }

    grn.hasVariance = false;
    grn.paymentHoldFlag = false;
    grn.status = 'resolved';
    grn.varianceReason = resolutionNotes ? `Resolved by Audit: ${resolutionNotes}` : 'Variance audit completed & Payment Hold released by Accountant.';
    
    if (Array.isArray(grn.items)) {
      grn.items = grn.items.map(item => ({ ...item, hasVariance: false }));
    }

    await grn.save();

    res.json({ success: true, message: 'GRN Payment Hold released & resolved successfully', grn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Transfer Status (e.g. In Transit -> Received at Site)
exports.updateTransferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'received' or 'in_transit'

    const transfer = await MaterialTransfer.findById(id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    transfer.status = status || 'received';
    transfer.receivedAt = new Date();
    await transfer.save();

    res.json({ success: true, message: `Material Transfer status updated to ${transfer.status}`, transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
