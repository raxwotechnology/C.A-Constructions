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

    const ledger = await SupplierLedger.find({ supplier: id })
      .populate('referencePO', 'poNumber totalAmount status')
      .populate('recordedBy', 'name')
      .sort({ date: -1 });

    const purchaseOrders = await PurchaseOrder.find({ supplier: id }).sort({ createdAt: -1 });

    res.json({ success: true, supplier, ledger, purchaseOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record payment to supplier
exports.recordSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, referenceNumber, chequeNumber, chequeDate, bankAccount, notes } = req.body;

    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const payAmount = Number(amount || 0);
    if (payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });
    }

    const newOutstanding = (supplier.outstandingBalance || 0) - payAmount;
    supplier.outstandingBalance = newOutstanding;
    supplier.totalPaid = (supplier.totalPaid || 0) + payAmount;
    await supplier.save();

    const ledgerEntry = await SupplierLedger.create({
      supplier: id,
      transactionType: 'payment',
      referenceNumber: referenceNumber || 'PAY-' + Date.now().toString().slice(-6),
      amount: payAmount,
      paymentMethod: paymentMethod || 'bank_transfer',
      chequeNumber: chequeNumber || '',
      chequeDate: chequeDate || null,
      bankAccount: bankAccount || null,
      notes: notes || `Payment made to ${supplier.name}`,
      runningBalance: newOutstanding,
      recordedBy: req.user?._id,
    });

    res.json({ success: true, message: 'Payment recorded in Supplier Ledger', supplier, ledgerEntry });
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

const applyPOSupplierBilling = async (po, userId) => {
  try {
    const supplierId = po.supplier?._id || po.supplier;
    if (!supplierId) return;
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return;

    const existingLedger = await SupplierLedger.findOne({
      supplier: supplier._id,
      referencePO: po._id,
      transactionType: 'bill_po',
    });

    if (!existingLedger) {
      const newOutstanding = (supplier.outstandingBalance || 0) + po.totalAmount;
      supplier.outstandingBalance = newOutstanding;
      supplier.totalBilled = (supplier.totalBilled || 0) + po.totalAmount;
      await supplier.save();

      await SupplierLedger.create({
        supplier: supplier._id,
        transactionType: 'bill_po',
        referencePO: po._id,
        referenceNumber: po.poNumber,
        amount: po.totalAmount,
        notes: `PO Delivered: ${po.poNumber}`,
        runningBalance: newOutstanding,
        recordedBy: userId || po.createdBy || null,
      });
    }
  } catch (err) {
    console.error('[applyPOSupplierBilling] Error:', err);
  }
};

const reversePOSupplierBilling = async (po) => {
  try {
    const supplierId = po.supplier?._id || po.supplier;
    if (!supplierId) return;
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return;

    const existingLedger = await SupplierLedger.findOne({
      supplier: supplier._id,
      referencePO: po._id,
      transactionType: 'bill_po',
    });

    if (existingLedger) {
      supplier.outstandingBalance = Math.max(0, (supplier.outstandingBalance || 0) - po.totalAmount);
      supplier.totalBilled = Math.max(0, (supplier.totalBilled || 0) - po.totalAmount);
      await supplier.save();
      await SupplierLedger.deleteMany({ referencePO: po._id, transactionType: 'bill_po' });
    }
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
      await po.save();
    }

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

    // Auto-reconcile any Delivered POs that are missing their FinanceEntry record
    try {
      const unlinkedDeliveredPOs = await PurchaseOrder.find({
        status: 'Delivered',
        $or: [{ financeEntryRef: null }, { financeEntryRef: { $exists: false } }],
      }).populate('supplier');

      if (unlinkedDeliveredPOs && unlinkedDeliveredPOs.length > 0) {
        for (const delPO of unlinkedDeliveredPOs) {
          await syncPOToFinanceExpense(delPO, delPO.createdBy);
        }
      }
    } catch (reconcileErr) {
      console.warn('[getPurchaseOrders] Reconcile warning:', reconcileErr.message);
    }

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

      // 2. Update Supplier Ledger & Outstanding Balance
      await applyPOSupplierBilling(po, req.user?._id);

      // 3. Create / Sync Expense in FinanceEntry & Project
      await syncPOToFinanceExpense(po, req.user?._id);
    } else if (previousStatus === 'Delivered' && status && status !== 'Delivered') {
      // Reverting from Delivered status
      po.deliveryStatus = 'Pending';
      await reversePOStock(po);
      await reversePOSupplierBilling(po);
      await removePOFinanceExpense(po);
    }

    await po.save();

    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name code phone contactPerson email category')
      .populate('project', 'name title code location')
      .populate('createdBy', 'name email')
      .populate('financeEntryRef');

    res.json({
      success: true,
      message: status === 'Delivered'
        ? `PO status updated to Delivered and recorded in Expenses!`
        : `PO status updated to ${status}`,
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
      await applyPOSupplierBilling(po, req.user?._id);
      await syncPOToFinanceExpense(po, req.user?._id);
    } else if (previousStatus === 'Delivered' && status && status !== 'Delivered') {
      po.deliveryStatus = 'Pending';
      await reversePOStock(po);
      await reversePOSupplierBilling(po);
      await removePOFinanceExpense(po);
    } else if (po.status === 'Delivered') {
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
      await reversePOSupplierBilling(po);
      await removePOFinanceExpense(po);
    }

    await PurchaseOrder.findByIdAndDelete(id);
    res.json({ success: true, message: 'Purchase Order deleted successfully' });
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

