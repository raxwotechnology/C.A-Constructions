const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const SupplierLedger = require('../models/SupplierLedger');
const SiteStock = require('../models/SiteStock');
const Project = require('../models/Project');
const FinanceEntry = require('../models/FinanceEntry');

// Get all suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json({ success: true, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, code, contactPerson, phone, email, address, category, brNumber, vatNumber, bankDetails, notes } = req.body;
    
    const supplierCode = code ? code.toUpperCase() : 'SUP-' + Date.now().toString().slice(-5);
    const existing = await Supplier.findOne({ code: supplierCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Supplier code ${supplierCode} already exists.` });
    }

    const supplier = await Supplier.create({
      name,
      code: supplierCode,
      contactPerson,
      phone,
      email,
      address,
      category: category || 'Hardware',
      brNumber,
      vatNumber,
      bankDetails: bankDetails || {},
      notes,
      totalBilled: Number(req.body.totalBilled) || 0,
      totalPaid: Number(req.body.totalPaid) || 0,
      outstandingBalance: req.body.outstandingBalance !== undefined
        ? (Number(req.body.outstandingBalance) || 0)
        : ((Number(req.body.totalBilled) || 0) - (Number(req.body.totalPaid) || 0)),
      createdBy: req.user?._id,
    });

    res.json({ success: true, message: 'Hardware Supplier registered successfully', supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update supplier
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.totalBilled !== undefined) updateData.totalBilled = Number(updateData.totalBilled) || 0;
    if (updateData.totalPaid !== undefined) updateData.totalPaid = Number(updateData.totalPaid) || 0;
    if (updateData.outstandingBalance !== undefined) {
      updateData.outstandingBalance = Number(updateData.outstandingBalance) || 0;
    }

    const supplier = await Supplier.findByIdAndUpdate(id, updateData, { new: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier updated successfully', supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByIdAndDelete(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    await SupplierLedger.deleteMany({ supplier: id });
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single supplier with full ledger
exports.getSupplierLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    // Guarantee running balances and supplier totals are mathematically accurate
    await reconcileSupplierLedger(id);

    const ledger = await SupplierLedger.find({ supplier: id })
      .populate('referencePO', 'poNumber totalAmount status')
      .populate('recordedBy', 'name')
      .sort({ date: -1, createdAt: -1, _id: -1 });

    const purchaseOrders = await PurchaseOrder.find({ supplier: id }).sort({ createdAt: -1 });
    const updatedSupplier = await Supplier.findById(id);

    res.json({ success: true, supplier: updatedSupplier || supplier, ledger, purchaseOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record payment to supplier
exports.recordSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, referenceNumber, chequeNumber, chequeDate, bankAccount, notes, poNumber } = req.body;

    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const payAmount = Number(amount || 0);
    if (payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });
    }

    const refNo = referenceNumber || 'PAY-' + Date.now().toString().slice(-6);

    const category = (supplier?.category && ['Hardware', 'Materials', 'Electrical', 'Plumbing', 'Machinery', 'Raw Material'].includes(supplier.category))
      ? (supplier.category === 'Raw Material' ? 'Hardware' : supplier.category)
      : 'Hardware';

    const pMethod = paymentMethod === 'cash' ? 'Cash' : (paymentMethod === 'cheque' ? 'Cheque' : 'Bank Transfer');
    const txNo = `TX-${refNo}`;

    const poLabel = poNumber ? ` | PO: ${poNumber}` : '';

    // Create Expense in FinanceEntry
    const financeEntry = await FinanceEntry.create({
      transactionNo: txNo,
      type: 'expense',
      transactionType: 'Expense',
      category: category,
      masterCategory: category,
      subCategory: 'Supplier Payment',
      title: `Supplier Payment - ${supplier.name}${poLabel}`,
      amount: payAmount,
      date: new Date(),
      paymentMethod: pMethod,
      payeeOrPayer: supplier.name,
      bankAccount: bankAccount || null,
      chequeDetails: chequeNumber ? {
        chequeNumber,
        realizationDate: chequeDate || null,
        status: 'Pending'
      } : undefined,
      description: notes || `Payment to supplier ${supplier.name} (${supplier.code || ''})`,
      note: `Ref: ${refNo}, Method: ${pMethod}${poLabel}`,
      status: 'Approved',
      createdBy: req.user?._id || null,
    });

    const ledgerEntry = await SupplierLedger.create({
      supplier: id,
      transactionType: 'payment',
      referenceNumber: refNo,
      amount: payAmount,
      paymentMethod: paymentMethod || 'bank_transfer',
      chequeNumber: chequeNumber || '',
      chequeDate: chequeDate || null,
      bankAccount: bankAccount || null,
      notes: notes || `Payment made to ${supplier.name}`,
      runningBalance: 0,
      financeEntryRef: financeEntry._id,
      recordedBy: req.user?._id,
    });

    await reconcileSupplierLedger(id);
    const updatedSupplier = await Supplier.findById(id);

    res.json({
      success: true,
      message: 'Payment recorded in Supplier Ledger and added to Expenses',
      supplier: updatedSupplier || supplier,
      ledgerEntry,
      financeEntry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Purchase Order
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, projectId, expectedDeliveryDate, items, tax, discount, notes } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    let projectObj = null;
    let siteName = 'Central Warehouse';
    if (projectId) {
      projectObj = await Project.findById(projectId);
      if (projectObj) siteName = projectObj.name || projectObj.title;
    }

    const poNumber = 'PO-' + Date.now().toString().slice(-6);

    let subtotal = 0;
    const formattedItems = (items || []).map(item => {
      const qty = item.quantity !== undefined && item.quantity !== '' && !isNaN(Number(item.quantity)) ? Number(item.quantity) : 1;
      const price = Number(item.unitPrice || 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;
      return {
        itemName: item.itemName,
        itemCode: item.itemCode || '',
        category: item.category || 'Hardware',
        quantity: qty,
        unit: item.unit || 'Units',
        unitPrice: price,
        totalPrice: lineTotal,
      };
    });

    const taxVal = Number(tax || 0);
    const discVal = Number(discount || 0);
    const totalAmount = subtotal + taxVal - discVal;

    const po = await PurchaseOrder.create({
      poNumber,
      supplier: supplierId,
      project: projectId || null,
      siteName,
      expectedDeliveryDate: expectedDeliveryDate || null,
      items: formattedItems,
      subtotal,
      tax: taxVal,
      discount: discVal,
      totalAmount,
      status: 'Pending',
      deliveryStatus: 'Pending',
      notes,
      createdBy: req.user?._id,
    });

    // Immediately record bill in Supplier Ledger (increases supplier outstanding balance)
    await applyPOSupplierBilling(po, req.user?._id);

    res.json({ success: true, message: 'Purchase Order created successfully', po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Purchase Order Stock, Ledger & Finance Helpers ---

const reconcileProjectExpense = async (projectId) => {
  try {
    if (!projectId) return;
    const proj = await Project.findById(projectId);
    if (!proj) return;
    const expAgg = await FinanceEntry.aggregate([
      { $match: { project: proj._id, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const realExpense = expAgg[0]?.total || 0;
    proj.totalExpense = realExpense;
    proj.actualCost = realExpense;
    proj.netProfitLoss = (proj.totalIncome || 0) - realExpense;
    await proj.save();
  } catch (err) {
    console.error('[reconcileProjectExpense] Error:', err);
  }
};

const applyPOStockIn = async (po) => {
  try {
    for (const item of (po.items || [])) {
      let stockItem = await SiteStock.findOne({ itemName: item.itemName });
      if (stockItem) {
        if (po.project) {
          let siteEntry = stockItem.siteStockQty.find((s) => s.project?.toString() === po.project.toString());
          if (siteEntry) {
            siteEntry.qty += item.quantity;
          } else {
            stockItem.siteStockQty.push({ project: po.project, qty: item.quantity });
          }
        } else {
          stockItem.centralStockQty += item.quantity;
        }
        await stockItem.save();
      } else {
        await SiteStock.create({
          itemCode: item.itemCode || 'ITEM-' + Date.now().toString().slice(-4),
          itemName: item.itemName,
          category: item.category || 'Hardware',
          unit: item.unit || 'Units',
          centralStockQty: po.project ? 0 : item.quantity,
          siteStockQty: po.project ? [{ project: po.project, qty: item.quantity }] : [],
          unitPrice: item.unitPrice,
          supplier: po.supplier?.name || '',
          lastRestockedAt: new Date(),
        });
      }
    }
  } catch (err) {
    console.error('[applyPOStockIn] Error:', err);
  }
};

const reversePOStock = async (po) => {
  try {
    for (const item of (po.items || [])) {
      let stockItem = await SiteStock.findOne({ itemName: item.itemName });
      if (stockItem) {
        if (po.project) {
          let siteEntry = stockItem.siteStockQty.find((s) => s.project?.toString() === po.project.toString());
          if (siteEntry) {
            siteEntry.qty = Math.max(0, siteEntry.qty - item.quantity);
          }
        } else {
          stockItem.centralStockQty = Math.max(0, stockItem.centralStockQty - item.quantity);
        }
        await stockItem.save();
      }
    }
  } catch (err) {
    console.error('[reversePOStock] Error:', err);
  }
};

const reconcileSupplierLedger = async (supplierId) => {
  try {
    if (!supplierId) return;
    const entries = await SupplierLedger.find({ supplier: supplierId })
      .sort({ date: 1, createdAt: 1, _id: 1 });

    let runningBalance = 0;
    let totalBilled = 0;
    let totalPaid = 0;
    const bulkOps = [];

    for (const entry of entries) {
      const amt = Number(entry.amount || 0);
      if (entry.transactionType === 'payment') {
        totalPaid += amt;
        runningBalance -= amt;
      } else if (entry.transactionType === 'bill_po') {
        totalBilled += amt;
        runningBalance += amt;
      } else if (entry.transactionType === 'adjustment') {
        runningBalance += amt;
      }
      bulkOps.push({
        updateOne: {
          filter: { _id: entry._id },
          update: { $set: { runningBalance } },
        },
      });
    }

    if (bulkOps.length > 0) {
      await SupplierLedger.bulkWrite(bulkOps);
    }

    const supplier = await Supplier.findById(supplierId);
    if (supplier) {
      supplier.totalBilled = totalBilled;
      supplier.totalPaid = totalPaid;
      supplier.outstandingBalance = runningBalance;
      await supplier.save();
    }
    return { runningBalance, totalBilled, totalPaid };
  } catch (err) {
    console.error('[reconcileSupplierLedger] Error:', err);
  }
};

const applyPOSupplierBilling = async (po, userId) => {
  try {
    const supplierId = po.supplier?._id || po.supplier;
    if (!supplierId) return;

    const existingLedger = await SupplierLedger.findOne({
      supplier: supplierId,
      referencePO: po._id,
      transactionType: 'bill_po',
    });

    const poAmount = Number(po.totalAmount || 0);
    const poDate = po.orderDate || po.createdAt || new Date();

    if (!existingLedger) {
      await SupplierLedger.create({
        supplier: supplierId,
        transactionType: 'bill_po',
        referencePO: po._id,
        referenceNumber: po.poNumber,
        amount: poAmount,
        date: poDate,
        notes: `PO Bill: ${po.poNumber}`,
        runningBalance: 0,
        recordedBy: userId || po.createdBy || null,
      });
    } else {
      existingLedger.amount = poAmount;
      existingLedger.referenceNumber = po.poNumber;
      if (!existingLedger.date) existingLedger.date = poDate;
      await existingLedger.save();
    }

    await reconcileSupplierLedger(supplierId);
  } catch (err) {
    console.error('[applyPOSupplierBilling] Error:', err);
  }
};

const reversePOSupplierBilling = async (po) => {
  try {
    const supplierId = po.supplier?._id || po.supplier;
    if (!supplierId) return;

    await SupplierLedger.deleteMany({ referencePO: po._id, transactionType: 'bill_po' });
    await reconcileSupplierLedger(supplierId);
  } catch (err) {
    console.error('[reversePOSupplierBilling] Error:', err);
  }
};

const syncPOToFinanceExpense = async (po, userId) => {
  try {
    const supplier = po.supplier?._id ? po.supplier : (po.supplier ? await Supplier.findById(po.supplier) : null);
    const supplierName = supplier?.name || 'Hardware Supplier';
    const siteDesc = po.siteName || (po.project ? 'Site' : 'Central Warehouse');

    const category = (supplier?.category && ['Hardware', 'Materials', 'Electrical', 'Plumbing', 'Machinery', 'Raw Material'].includes(supplier.category))
      ? (supplier.category === 'Raw Material' ? 'Hardware' : supplier.category)
      : (po.items?.[0]?.category || 'Hardware');

    let branchId = null;
    if (po.project) {
      const proj = await Project.findById(po.project);
      if (proj) {
        branchId = proj.branch || null;
      }
    }

    const txNo = po.poNumber && po.poNumber.startsWith('PO-') ? `TX-${po.poNumber}` : `TX-PO-${po.poNumber || Date.now()}`;
    let entry = null;
    if (po.financeEntryRef) {
      entry = await FinanceEntry.findById(po.financeEntryRef);
    }
    if (!entry) {
      entry = await FinanceEntry.findOne({ transactionNo: txNo });
    }

    const amount = Number(po.totalAmount || 0);
    const poDate = po.deliveredAt || po.orderDate || new Date();

    if (entry) {
      entry.amount = amount;
      entry.title = `Purchase Order - ${po.poNumber} (${supplierName})`;
      entry.date = poDate;
      entry.project = po.project || null;
      entry.branch = branchId;
      entry.category = category;
      entry.masterCategory = category;
      entry.payeeOrPayer = supplierName;
      entry.description = `Delivered Purchase Order ${po.poNumber} (${supplierName}) for ${siteDesc}`;
      entry.note = `PO: ${po.poNumber}, Items: ${po.items?.length || 0}, Delivery Site: ${siteDesc}`;
      await entry.save();
    } else {
      entry = await FinanceEntry.create({
        transactionNo: txNo,
        type: 'expense',
        transactionType: 'Expense',
        category: category,
        masterCategory: category,
        subCategory: 'Purchase Order',
        title: `Purchase Order - ${po.poNumber} (${supplierName})`,
        amount: amount,
        date: poDate,
        paymentMethod: 'Bank Transfer',
        payeeOrPayer: supplierName,
        project: po.project || null,
        branch: branchId,
        description: `Delivered Purchase Order ${po.poNumber} (${supplierName}) for ${siteDesc}`,
        note: `PO: ${po.poNumber}, Items: ${po.items?.length || 0}, Delivery Site: ${siteDesc}`,
        status: 'Approved',
        createdBy: userId || po.createdBy || null,
      });
    }

    if (!po.financeEntryRef || String(po.financeEntryRef) !== String(entry._id)) {
      po.financeEntryRef = entry._id;
    }
    po.isSentToExpenses = true;
    if (!po.sentToExpensesAt) po.sentToExpensesAt = new Date();
    await po.save();

    if (po.project) {
      await reconcileProjectExpense(po.project);
    }

    return entry;
  } catch (err) {
    console.error('[syncPOToFinanceExpense] Error:', err);
    return null;
  }
};

const removePOFinanceExpense = async (po) => {
  try {
    const txNo = po.poNumber && po.poNumber.startsWith('PO-') ? `TX-${po.poNumber}` : `TX-PO-${po.poNumber || ''}`;
    if (po.financeEntryRef) {
      await FinanceEntry.findByIdAndDelete(po.financeEntryRef);
      po.financeEntryRef = null;
      po.isSentToExpenses = false;
      po.sentToExpensesAt = null;
      await po.save();
    }
    if (txNo) {
      await FinanceEntry.deleteMany({ transactionNo: txNo });
    }

    if (po.project) {
      await reconcileProjectExpense(po.project);
    }
  } catch (err) {
    console.error('[removePOFinanceExpense] Error:', err);
  }
};

// Get all POs
exports.getPurchaseOrders = async (req, res) => {
  try {
    const { supplierId, status, projectId, sortBy, sortOrder } = req.query;
    const filter = {};
    if (supplierId) filter.supplier = supplierId;
    if (status) filter.status = status;
    if (projectId) filter.project = projectId;

    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;
    const sortObj = { [sortField]: sortDirection };

    const pos = await PurchaseOrder.find(filter)
      .populate('supplier', 'name code phone contactPerson email category')
      .populate('project', 'name title code location')
      .populate('createdBy', 'name email')
      .populate('financeEntryRef')
      .sort(sortObj);

    res.json({ success: true, pos: pos || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, pos: [] });
  }
};

// Update PO Status (Delivered -> Auto Stock In + Ledger Update + Expense Creation)
exports.updatePOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const po = await PurchaseOrder.findById(id).populate('supplier');
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    const previousStatus = po.status;
    po.status = status;
    if (notes) po.notes = notes;

    // When status changes to Delivered
    if (status === 'Delivered' && previousStatus !== 'Delivered') {
      po.deliveryStatus = 'Received';
      if (!po.deliveredAt) po.deliveredAt = new Date();

      // 1. Stock In to SiteStock (Direct site delivery or central stock)
      await applyPOStockIn(po);

      // 2. Ensure Supplier Ledger & Outstanding Balance are updated
      await applyPOSupplierBilling(po, req.user?._id);
    } else if (previousStatus === 'Delivered' && status && status !== 'Delivered') {
      // Reverting from Delivered status
      po.deliveryStatus = 'Pending';
      await reversePOStock(po);
    }

    await po.save();

    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name code phone contactPerson email category')
      .populate('project', 'name title code location')
      .populate('createdBy', 'name email')
      .populate('financeEntryRef');

    res.json({
      success: true,
      message: `PO status updated to ${status}`,
      po: populatedPO,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Purchase Order
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, projectId, expectedDeliveryDate, items, tax, discount, notes, status } = req.body;

    const po = await PurchaseOrder.findById(id).populate('supplier');
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    const previousStatus = po.status;
    if (supplierId) po.supplier = supplierId;
    if (projectId !== undefined) {
      po.project = projectId || null;
      if (projectId) {
        const projectObj = await Project.findById(projectId);
        po.siteName = projectObj ? (projectObj.name || projectObj.title) : 'Central Warehouse';
      } else {
        po.siteName = 'Central Warehouse';
      }
    }
    if (expectedDeliveryDate !== undefined) po.expectedDeliveryDate = expectedDeliveryDate || null;
    if (notes !== undefined) po.notes = notes;

    if (items && Array.isArray(items)) {
      let subtotal = 0;
      const formattedItems = items.map(item => {
        const qty = item.quantity !== undefined && item.quantity !== '' && !isNaN(Number(item.quantity)) ? Number(item.quantity) : 1;
        const price = Number(item.unitPrice || 0);
        const lineTotal = qty * price;
        subtotal += lineTotal;
        return {
          itemName: item.itemName,
          itemCode: item.itemCode || '',
          category: item.category || 'Hardware',
          quantity: qty,
          unit: item.unit || 'Units',
          unitPrice: price,
          totalPrice: lineTotal,
        };
      });

      const taxVal = Number(tax !== undefined ? tax : (po.tax || 0));
      const discVal = Number(discount !== undefined ? discount : (po.discount || 0));
      const totalAmount = subtotal + taxVal - discVal;

      po.items = formattedItems;
      po.subtotal = subtotal;
      po.tax = taxVal;
      po.discount = discVal;
      po.totalAmount = totalAmount;
    }

    if (status) po.status = status;

    if (po.status === 'Delivered' && previousStatus !== 'Delivered') {
      po.deliveryStatus = 'Received';
      if (!po.deliveredAt) po.deliveredAt = new Date();
      await applyPOStockIn(po);
    } else if (previousStatus === 'Delivered' && status && status !== 'Delivered') {
      po.deliveryStatus = 'Pending';
      await reversePOStock(po);
    }

    // Always keep supplier ledger billing synced
    await applyPOSupplierBilling(po, req.user?._id);

    // If PO was already sent to expenses, keep FinanceEntry synced
    if (po.financeEntryRef) {
      await syncPOToFinanceExpense(po, req.user?._id);
    }

    await po.save();
    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name code phone')
      .populate('project', 'name title location')
      .populate('createdBy', 'name')
      .populate('financeEntryRef');

    res.json({ success: true, message: 'Purchase Order updated successfully', po: populatedPO });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Purchase Order
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findById(id).populate('supplier');
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    if (po.status === 'Delivered') {
      await reversePOStock(po);
    }
    await reversePOSupplierBilling(po);
    if (po.financeEntryRef) {
      await removePOFinanceExpense(po);
    }

    await PurchaseOrder.findByIdAndDelete(id);
    res.json({ success: true, message: 'Purchase Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send selected POs to Finance Expenses
exports.sendPOsToExpenses = async (req, res) => {
  try {
    const { poIds } = req.body;
    if (!Array.isArray(poIds) || poIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No Purchase Orders selected' });
    }

    const pos = await PurchaseOrder.find({ _id: { $in: poIds } }).populate('supplier');
    const synced = [];

    for (const po of pos) {
      const entry = await syncPOToFinanceExpense(po, req.user?._id);
      if (entry) {
        po.financeEntryRef = entry._id;
        po.isSentToExpenses = true;
        if (!po.sentToExpensesAt) po.sentToExpensesAt = new Date();
        await po.save();
        synced.push(po.poNumber);
      }
    }

    res.json({
      success: true,
      message: `${synced.length} Purchase Order(s) sent to Expenses successfully!`,
      syncedCount: synced.length,
      syncedPOs: synced,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dedicated Sync / Reconcile All Delivered PO Expenses API
exports.syncAllDeliveredPOExpenses = async (req, res) => {
  try {
    const deliveredPOs = await PurchaseOrder.find({ status: 'Delivered' }).populate('supplier');
    let syncedCount = 0;
    for (const po of deliveredPOs) {
      await syncPOToFinanceExpense(po, req.user?._id);
      syncedCount++;
    }
    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} delivered purchase order(s) to Expenses.`,
      syncedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

