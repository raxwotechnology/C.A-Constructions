const BOQ = require('../models/BOQ');

const DEFAULT_SLS_573_ITEMS = [
  {
    code: 'DIV-03-01',
    division: 'Earthworks & Excavation',
    item: 'Site clearing, topsoil stripping & foundation trench excavation',
    unit: 'm3',
    qty: 450,
    rate: 3500,
    amount: 1575000,
  },
  {
    code: 'DIV-04-02',
    division: 'Concrete & Formwork',
    item: 'Grade 30 ReadyMix Concrete for Columns & Beams including shuttering',
    unit: 'm3',
    qty: 180,
    rate: 48000,
    amount: 8640000,
  },
  {
    code: 'DIV-05-01',
    division: 'Reinforcement Steel',
    item: 'High yield Tor Steel (12mm & 16mm TMT) cut, bend & place',
    unit: 'kg',
    qty: 12500,
    rate: 340,
    amount: 4250000,
  },
  {
    code: 'DIV-08-03',
    division: 'Masonry & Wall Construction',
    item: '9 inch thick wire cut brickwork masonry in cement mortar 1:5',
    unit: 'sqft',
    qty: 6200,
    rate: 420,
    amount: 2604000,
  },
  {
    code: 'DIV-12-01',
    division: 'Finishes & Tiling',
    item: '600x600mm homogeneous porcelain floor tiling for main hall & corridors',
    unit: 'sqft',
    qty: 3400,
    rate: 650,
    amount: 2210000,
  },
];

// Helper: Ensure a master BOQ exists and return it
async function getOrCreateMasterBOQ(projectId = null) {
  let query = projectId ? { project: projectId } : { project: { $in: [null, undefined] } };
  let boq = await BOQ.findOne(query).sort({ createdAt: -1 });

  if (!boq) {
    boq = await BOQ.create({
      title: 'SLS 573 Standard Bill of Quantities',
      serviceType: 'Residential Construction',
      project: projectId || null,
      items: DEFAULT_SLS_573_ITEMS,
      grandTotalEstimated: DEFAULT_SLS_573_ITEMS.reduce((sum, i) => sum + i.amount, 0),
    });
  }
  return boq;
}

// @desc    Get master or project BOQ items
// @route   GET /api/boqs
exports.getBOQ = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const boq = await getOrCreateMasterBOQ(projectId);
    res.json({
      success: true,
      boq,
      items: boq.items || [],
      total: boq.items.reduce((sum, item) => sum + (item.amount || item.totalAmount || 0), 0)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a BOQ line item
// @route   POST /api/boqs/items
exports.addBOQItem = async (req, res, next) => {
  try {
    const { projectId, code, division, item, unit, qty, rate } = req.body;
    if (!code || !item) {
      return res.status(400).json({ success: false, message: 'BOQ Code and Item Description are required.' });
    }

    const boq = await getOrCreateMasterBOQ(projectId);
    const quantity = Number(qty || 0);
    const unitRate = Number(rate || 0);
    const amount = quantity * unitRate;

    const newItem = {
      code: String(code).toUpperCase().trim(),
      division: division || 'Earthworks & Excavation',
      item: String(item).trim(),
      unit: unit || 'sqft',
      qty: quantity,
      rate: unitRate,
      amount,
      estimatedQty: quantity,
      unitRate: unitRate,
      totalAmount: amount,
      status: 'Pending'
    };

    boq.items.push(newItem);
    boq.grandTotalEstimated = boq.items.reduce((sum, i) => sum + (i.amount || i.totalAmount || 0), 0);
    await boq.save();

    res.status(201).json({
      success: true,
      message: `BOQ Item "${newItem.code}" added successfully.`,
      item: boq.items[boq.items.length - 1],
      boq,
      items: boq.items
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a BOQ line item
// @route   PUT /api/boqs/items/:codeOrId
exports.updateBOQItem = async (req, res, next) => {
  try {
    const { codeOrId } = req.params;
    const { projectId, code, division, item, unit, qty, rate } = req.body;

    const boq = await getOrCreateMasterBOQ(projectId);
    const itemIndex = boq.items.findIndex(
      i => String(i._id) === String(codeOrId) || String(i.code).toUpperCase() === String(codeOrId).toUpperCase()
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'BOQ item not found.' });
    }

    const quantity = qty !== undefined ? Number(qty) : boq.items[itemIndex].qty;
    const unitRate = rate !== undefined ? Number(rate) : boq.items[itemIndex].rate;
    const amount = quantity * unitRate;

    boq.items[itemIndex].code = (code || boq.items[itemIndex].code).toUpperCase().trim();
    if (division) boq.items[itemIndex].division = division;
    if (item) boq.items[itemIndex].item = item;
    if (unit) boq.items[itemIndex].unit = unit;
    boq.items[itemIndex].qty = quantity;
    boq.items[itemIndex].rate = unitRate;
    boq.items[itemIndex].amount = amount;

    boq.grandTotalEstimated = boq.items.reduce((sum, i) => sum + (i.amount || i.totalAmount || 0), 0);
    await boq.save();

    res.json({
      success: true,
      message: `BOQ Item updated successfully.`,
      item: boq.items[itemIndex],
      boq,
      items: boq.items
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a BOQ line item
// @route   DELETE /api/boqs/items/:codeOrId
exports.deleteBOQItem = async (req, res, next) => {
  try {
    const { codeOrId } = req.params;
    const { projectId } = req.query;

    const boq = await getOrCreateMasterBOQ(projectId);
    const initialLen = boq.items.length;
    boq.items = boq.items.filter(
      i => String(i._id) !== String(codeOrId) && String(i.code).toUpperCase() !== String(codeOrId).toUpperCase()
    );

    if (boq.items.length === initialLen) {
      return res.status(404).json({ success: false, message: 'BOQ item not found.' });
    }

    boq.grandTotalEstimated = boq.items.reduce((sum, i) => sum + (i.amount || i.totalAmount || 0), 0);
    await boq.save();

    res.json({
      success: true,
      message: `BOQ item removed successfully.`,
      boq,
      items: boq.items
    });
  } catch (err) {
    next(err);
  }
};
