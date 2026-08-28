const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const SupplierLedger = require('../models/SupplierLedger');
const SiteStock = require('../models/SiteStock');
const Project = require('../models/Project');

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
    const supplier = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier updated successfully', supplier });
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
      const qty = Number(item.quantity || 1);
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
      .populate('supplier', 'name code phone contactPerson email')
      .populate('project', 'name title code location')
      .populate('createdBy', 'name email')
      .sort(sortObj);

    res.json({ success: true, pos: pos || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, pos: [] });
  }
};

// Update PO Status (Delivered -> Auto Stock In + Ledger Update)
exports.updatePOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const po = await PurchaseOrder.findById(id).populate('supplier');
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    const previousStatus = po.status;
    po.status = status;
    if (notes) po.notes = notes;

    // When status changes to Delivered for the first time
    if (status === 'Delivered' && previousStatus !== 'Delivered') {
      po.deliveryStatus = 'Received';
      po.deliveredAt = new Date();

      // 1. Stock In to SiteStock (Direct site delivery or central stock)
      for (const item of po.items) {
        let stockItem = await SiteStock.findOne({ itemName: item.itemName });
        if (stockItem) {
          if (po.project) {
            let siteEntry = stockItem.siteStockQty.find(s => s.project?.toString() === po.project.toString());
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

      // 2. Update Supplier Ledger & Outstanding Balance
      const supplier = await Supplier.findById(po.supplier._id);
      if (supplier) {
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
          recordedBy: req.user?._id,
        });
      }
    }

    await po.save();
    res.json({ success: true, message: `PO status updated to ${status}`, po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Purchase Order
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, projectId, expectedDeliveryDate, items, tax, discount, notes, status } = req.body;

    const po = await PurchaseOrder.findById(id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

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
    if (status) po.status = status;

    if (items && Array.isArray(items)) {
      let subtotal = 0;
      const formattedItems = items.map(item => {
        const qty = Number(item.quantity || 1);
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

    await po.save();
    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name code phone')
      .populate('project', 'name title location')
      .populate('createdBy', 'name');

    res.json({ success: true, message: 'Purchase Order updated successfully', po: populatedPO });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Purchase Order
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.findByIdAndDelete(id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    res.json({ success: true, message: 'Purchase Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

