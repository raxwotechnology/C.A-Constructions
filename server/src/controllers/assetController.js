const Asset = require('../models/Asset');

// Auto-seed sample assets with values if collection is empty
const seedDefaultAssets = async () => {
  const count = await Asset.countDocuments();
  if (count === 0) {
    await Asset.create([
      {
        assetCode: 'AST-EXC-01',
        name: 'KOBELCO SK200 Excavator',
        category: 'Machinery & Heavy Equipment',
        registrationNumber: 'EXC-8890',
        assetValue: 18500000,
        amount: 18500000,
        status: 'Operational',
        insuranceExpiry: new Date('2026-11-15'),
        currentEngineHours: 3420,
        fuelLog: [
          { date: new Date(), litersAdded: 45, costPerLiter: 360, totalCost: 16200, meterReading: 3420 }
        ]
      },
      {
        assetCode: 'AST-LRY-04',
        name: 'ISUZU 10-Wheeler Tipper Truck',
        category: 'Vehicles',
        registrationNumber: 'WP LA-4589',
        assetValue: 12000000,
        amount: 12000000,
        status: 'Operational',
        insuranceExpiry: new Date('2026-09-30'),
        currentOdometerKm: 64200,
        fuelLog: [
          { date: new Date(), litersAdded: 80, costPerLiter: 360, totalCost: 28800, meterReading: 64200 }
        ]
      },
      {
        assetCode: 'AST-CMP-02',
        name: 'Mikasa Plate Compactor 5.5HP',
        category: 'Power & Hand Tools',
        registrationNumber: 'CMP-102',
        assetValue: 450000,
        amount: 450000,
        status: 'Operational',
        fuelLog: [
          { date: new Date(), litersAdded: 5, costPerLiter: 370, totalCost: 1850, meterReading: 120 }
        ]
      },
      {
        assetCode: 'AST-CRN-01',
        name: 'Tadano 25-Ton Mobile Crane',
        category: 'Machinery & Heavy Equipment',
        registrationNumber: 'CRN-5541',
        assetValue: 35000000,
        amount: 35000000,
        status: 'Operational',
        insuranceExpiry: new Date('2026-12-31'),
        currentEngineHours: 1890,
      }
    ]);
  }
};

// GET /api/assets
exports.getAssets = async (req, res, next) => {
  try {
    await seedDefaultAssets();
    const { category, status, search, project } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (project) filter.assignedProject = project;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetCode: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const assets = await Asset.find(filter)
      .populate('assignedProject', 'name title location')
      .populate('assignedDriverOrOperator', 'name email')
      .sort({ createdAt: -1 });

    const totalValue = assets.reduce((sum, a) => sum + Number(a.assetValue || a.amount || 0), 0);

    res.json({
      success: true,
      count: assets.length,
      totalValue,
      assets,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/assets/summary
exports.getAssetSummary = async (req, res, next) => {
  try {
    await seedDefaultAssets();
    const assets = await Asset.find();

    const totalAssets = assets.length;
    const totalValue = assets.reduce((sum, a) => sum + Number(a.assetValue || a.amount || 0), 0);
    const operationalCount = assets.filter(a => ['Operational', 'Active Site Operation', 'In Store / Ready'].includes(a.status)).length;
    const maintenanceCount = assets.filter(a => ['Under Service', 'Breakdown'].includes(a.status)).length;

    // Fuel & maintenance costs calculation
    let totalFuelCost = 0;
    let totalMaintenanceCost = 0;

    assets.forEach(a => {
      if (Array.isArray(a.fuelLog)) {
        totalFuelCost += a.fuelLog.reduce((s, f) => s + Number(f.totalCost || 0), 0);
      }
      if (Array.isArray(a.maintenanceHistory)) {
        totalMaintenanceCost += a.maintenanceHistory.reduce((s, m) => s + Number(m.cost || 0), 0);
      }
    });

    res.json({
      success: true,
      summary: {
        totalAssets,
        totalValue,
        operationalCount,
        maintenanceCount,
        totalFuelCost,
        totalMaintenanceCost,
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/assets/:id
exports.getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('assignedProject')
      .populate('assignedDriverOrOperator');

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, asset });
  } catch (err) {
    next(err);
  }
};

// POST /api/assets
exports.createAsset = async (req, res, next) => {
  try {
    const {
      name,
      category,
      assetCode,
      registrationNumber,
      assetValue,
      amount,
      assignedProject,
      assignedDriverOrOperator,
      status,
      insuranceExpiry,
      revenueLicenseExpiry,
      currentOdometerKm,
      currentEngineHours,
    } = req.body;

    const numericVal = Number(assetValue || amount || 0);

    // Auto-generate code if missing
    let code = assetCode;
    if (!code) {
      const count = await Asset.countDocuments();
      code = `AST-${String(count + 1).padStart(3, '0')}`;
    }

    const asset = await Asset.create({
      assetCode: code.toUpperCase(),
      name,
      category: category || 'Machinery & Heavy Equipment',
      registrationNumber,
      assetValue: numericVal,
      amount: numericVal,
      assignedProject: assignedProject || null,
      assignedDriverOrOperator: assignedDriverOrOperator || null,
      status: status || 'Operational',
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
      revenueLicenseExpiry: revenueLicenseExpiry ? new Date(revenueLicenseExpiry) : undefined,
      currentOdometerKm: Number(currentOdometerKm || 0),
      currentEngineHours: Number(currentEngineHours || 0),
    });

    res.status(201).json({
      success: true,
      message: 'Asset registered successfully',
      asset,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/assets/:id
exports.updateAsset = async (req, res, next) => {
  try {
    const { assetValue, amount } = req.body;
    const updateData = { ...req.body };

    if (assetValue !== undefined || amount !== undefined) {
      const val = Number(assetValue || amount || 0);
      updateData.assetValue = val;
      updateData.amount = val;
    }

    const asset = await Asset.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({ success: true, message: 'Asset updated successfully', asset });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/assets/:id
exports.deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (err) {
    next(err);
  }
};
