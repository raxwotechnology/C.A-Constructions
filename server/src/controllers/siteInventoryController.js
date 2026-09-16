const mongoose = require('mongoose');
const SiteStock = require('../models/SiteStock');
const MaterialTransfer = require('../models/MaterialTransfer');
const GRN = require('../models/GRN');
const Project = require('../models/Project');

// Get all inventory items (Central Warehouse & per-site)
exports.getInventory = async (req, res) => {
  try {
    const rawStock = await SiteStock.find().populate('siteStockQty.project', 'name location');
    const stock = rawStock.map(s => {
      const obj = s.toObject ? s.toObject() : s;
      const totalSiteQty = (obj.siteStockQty || []).reduce((sum, item) => sum + (item.qty || 0), 0);
      obj.quantity = (obj.centralStockQty !== undefined && obj.centralStockQty !== null ? obj.centralStockQty : 0) + totalSiteQty;
      return obj;
    });
    const warehouseStock = stock.filter(s => (s.centralStockQty || 0) > 0);
    
    res.json({ success: true, stock, warehouseStock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add or update stock item
exports.upsertStock = async (req, res) => {
  try {
    const { id, site, isCentralWarehouse, itemName, category, quantity, unit, unitPrice, reorderLevel } = req.body;
    const qtyVal = Number(quantity) || 0;
    const cleanName = String(itemName || '').trim();

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Material Item Name is required' });
    }

    let item;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      item = await SiteStock.findByIdAndUpdate(id, {
        site: site || null,
        isCentralWarehouse: isCentralWarehouse !== undefined ? !!isCentralWarehouse : true,
        itemName: cleanName, category, quantity: qtyVal, centralStockQty: qtyVal, unit, unitPrice: Number(unitPrice || 0), reorderLevel: Number(reorderLevel || 10),
        lastRestockedAt: new Date(),
        updatedBy: req.user?._id,
      }, { new: true });
    } else {
      // Check if stock item with exact same name already exists in database
      const existing = await SiteStock.findOne({
        itemName: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });

      if (existing) {
        existing.quantity = Number(existing.quantity || 0) + qtyVal;
        existing.centralStockQty = Number(existing.centralStockQty || 0) + qtyVal;
        if (unitPrice) existing.unitPrice = Number(unitPrice);
        if (category) existing.category = category;
        if (unit) existing.unit = unit;
        existing.lastRestockedAt = new Date();
        existing.updatedBy = req.user?._id;
        await existing.save();
        item = existing;
      } else {
        const itemCode = 'STK-' + Date.now().toString().slice(-6);
        item = await SiteStock.create({
          itemCode,
          site: site || null,
          isCentralWarehouse: isCentralWarehouse !== undefined ? !!isCentralWarehouse : true,
          itemName: cleanName, category: category || 'General', quantity: qtyVal, centralStockQty: qtyVal, unit: unit || 'bags', unitPrice: Number(unitPrice || 0), reorderLevel: Number(reorderLevel || 10),
          lastRestockedAt: new Date(),
          updatedBy: req.user?._id,
        });
      }
    }

    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete stock item
exports.deleteStock = async (req, res) => {
  try {
    const item = await SiteStock.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Stock item not found' });
    res.json({ success: true, message: 'Stock item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create material transfer (Central Warehouse -> Site N)
exports.createTransfer = async (req, res) => {
  try {
    const { fromSite, toSite, itemName, category, quantity, unit } = req.body;
    const reqQty = Number(quantity);

    if (isNaN(reqQty) || reqQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'කරුණාකර වලංගු ප්‍රමාණයක් (Quantity) ඇතුළත් කරන්න.',
      });
    }

    // Find matching source stock item (by site or central warehouse or case-insensitive name)
    let sourceStock;
    if (fromSite && mongoose.Types.ObjectId.isValid(fromSite)) {
      sourceStock = await SiteStock.findOne({ site: fromSite, itemName });
    }
    if (!sourceStock) {
      sourceStock = await SiteStock.findOne({
        itemName: { $regex: new RegExp(`^${String(itemName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }

    const mainQty = sourceStock ? Number(sourceStock.quantity || 0) : 0;
    const centralQty = sourceStock ? Number(sourceStock.centralStockQty || 0) : 0;
    const totalSiteQty = sourceStock ? (sourceStock.siteStockQty || []).reduce((sum, i) => sum + Number(i.qty || 0), 0) : 0;
    const availableQty = sourceStock ? (Math.max(mainQty, centralQty) + totalSiteQty) : 0;

    if (!sourceStock || availableQty < reqQty) {
      return res.status(400).json({
        success: false,
        message: `ප්‍රමාණවත් stock එකක් නොමැත! Available: ${availableQty} ${unit || sourceStock?.unit || 'units'}`,
        availableQuantity: availableQty,
      });
    }

    const transferNo = 'MT-' + Date.now().toString().slice(-6);

    // Deduct stock from source warehouse/site
    const updatedQty = Math.max(0, availableQty - reqQty);
    sourceStock.quantity = updatedQty;
    sourceStock.centralStockQty = updatedQty;
    await sourceStock.save();

    const transfer = await MaterialTransfer.create({
      transferNo,
      fromSite: fromSite || null,
      toSite,
      itemName,
      category: category || sourceStock.category || 'General',
      quantity: reqQty,
      unit: unit || sourceStock.unit || 'units',
      dispatchedBy: req.user._id,
      status: 'in_transit',
    });

    res.json({ success: true, transfer, remainingStock: updatedQty });
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

    // Auto-link GRN expense to Project & Finance Entry
    if (totalAmount > 0 && site) {
      try {
        const FinanceEntry = require('../models/FinanceEntry');
        const Project = require('../models/Project');
        await FinanceEntry.create({
          entryNo: 'EXP-GRN-' + Date.now().toString().slice(-6),
          type: 'expense',
          category: 'Material & Inventory',
          amount: totalAmount,
          date: new Date(),
          description: `GRN Material Purchase (${grn.grnNo}) for ${siteName || 'Site'}`,
          project: site,
          createdBy: req.user._id,
        });
        const proj = await Project.findById(site);
        if (proj) {
          proj.expenses = Number(proj.expenses || 0) + totalAmount;
          await proj.save();
        }
      } catch (expErr) {
        console.warn('[createGRN] Project expense linking warning:', expErr.message);
      }
    }

    res.json({ success: true, grn });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get GRN records (with optional site filter)
exports.getGRNs = async (req, res) => {
  try {
    const query = {};
    if (req.query.site && mongoose.Types.ObjectId.isValid(req.query.site)) {
      query.site = req.query.site;
    }
    if (req.user && req.user.role === 'supplier') {
      query.supplier = req.user._id;
    }

    const grns = await GRN.find(query)
      .populate('site', 'name code title location')
      .populate('receivedBy', 'name email')
      .populate('supplier', 'name email company')
      .sort({ createdAt: -1 });

    res.json({ success: true, grns: grns || [] });
  } catch (error) {
    console.error('getGRNs error:', error.message);
    res.status(500).json({ success: false, message: error.message, grns: [] });
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
