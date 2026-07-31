const mongoose = require('mongoose');
const DailyWageLog = require('../models/DailyWageLog');
const Project = require('../models/Project');
const Advance = require('../models/Advance');
const FinanceEntry = require('../models/FinanceEntry');

/** Generate unique Log Code: DW-YYYYMMDD-XXXX */
async function generateLogCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await DailyWageLog.countDocuments();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `DW-${dateStr}-${(count + 1).toString().padStart(3, '0')}${randomSuffix.toString().slice(-2)}`;
}

/** CREATE Daily Wage / Sub-Contract Log Entry */
exports.createDailyWageLog = async (req, res, next) => {
  try {
    const {
      workerName,
      employee,
      project,
      date,
      workType,
      skillLevel,
      skillRate,
      daysWorked,
      otHours,
      otRate,
      allowances,
      advanceDeductions,
      linkedAdvance,
      subContractDetails,
      mealExpenseAutoLogged,
      notes,
    } = req.body;

    const isValidId = (v) => v && mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v);

    if (!workerName || !project || !isValidId(project)) {
      return res.status(400).json({
        success: false,
        message: 'Worker name and a valid project site are required.',
      });
    }

    const logCode = await generateLogCode();

    const newLog = new DailyWageLog({
      logCode,
      workerName,
      employee: isValidId(employee) ? employee : null,
      project,
      date: date || new Date(),
      workType: workType || 'Daily Wage',
      skillLevel: skillLevel || 'Skilled Labour / Baas',
      skillRate: Number(skillRate) || (skillLevel === 'Unskilled Labour / Helper' ? 3500 : 5000),
      daysWorked: Number(daysWorked) || 1.0,
      otHours: Number(otHours) || 0,
      otRate: Number(otRate) || 0,
      allowances: {
        foodRefreshments: Number(allowances?.foodRefreshments) || 0,
        travelTransport: Number(allowances?.travelTransport) || 0,
        nightOutstation: Number(allowances?.nightOutstation) || 0,
      },
      advanceDeductions: Number(advanceDeductions) || 0,
      linkedAdvance: isValidId(linkedAdvance) ? linkedAdvance : null,
      subContractDetails: {
        workCategory: subContractDetails?.workCategory || 'Tiling',
        measuredSqft: Number(subContractDetails?.measuredSqft) || 0,
        measuredCubicFeet: Number(subContractDetails?.measuredCubicFeet) || 0,
        ratePerSqft: Number(subContractDetails?.ratePerSqft) || 0,
      },
      mealExpenseAutoLogged: Boolean(mealExpenseAutoLogged),
      notes: notes || '',
      createdBy: isValidId(req.user?._id || req.user?.id) ? (req.user?._id || req.user?.id) : null,
    });

    await newLog.save();

    // If advance deductions linked to an existing Advance record, record repayment
    if (newLog.advanceDeductions > 0 && newLog.linkedAdvance) {
      const adv = await Advance.findById(newLog.linkedAdvance);
      if (adv) {
        adv.totalRecovered = (adv.totalRecovered || 0) + newLog.advanceDeductions;
        adv.outstandingBalance = Math.max(0, (adv.amount || 0) - adv.totalRecovered);
        if (adv.outstandingBalance === 0) adv.status = 'cleared';
        adv.repayments.push({
          amount: newLog.advanceDeductions,
          date: new Date(),
          note: `Deduction via Daily Wage / Sub-Contract payout (${newLog.logCode})`,
        });
        await adv.save();
      }
    }

    // If meal expenses are flagged for Site Operating Expenses tracking
    if (newLog.mealExpenseAutoLogged && newLog.allowances.foodRefreshments > 0) {
      const txNo = `TX-MEAL-${Date.now().toString().slice(-6)}`;
      const financeEntry = new FinanceEntry({
        transactionNo: txNo,
        project: newLog.project,
        transactionType: 'Expense',
        masterCategory: 'Worker Meals & Refreshments',
        subCategory: 'Site Operating Expenses',
        amount: newLog.allowances.foodRefreshments,
        date: newLog.date,
        paymentMethod: 'Cash',
        payeeOrPayer: newLog.workerName,
        description: `Daily Worker Meals & Refreshments Allowance (${newLog.logCode})`,
        status: 'Approved',
        createdBy: isValidId(req.user?._id || req.user?.id) ? (req.user?._id || req.user?.id) : null,
      });
      await financeEntry.save();
      newLog.financeEntryRef = financeEntry._id;
      await newLog.save();
    }

    // Update Project income vs expense totals if applicable
    const proj = await Project.findById(project);
    if (proj) {
      const payoutAmount = newLog.workType === 'Daily Wage' ? newLog.netDailyPay : newLog.subContractPay;
      proj.actualCost = (proj.actualCost || 0) + payoutAmount;
      proj.totalExpense = (proj.totalExpense || 0) + payoutAmount;
      proj.netProfitLoss = (proj.totalIncome || 0) - proj.totalExpense;
      if (newLog.workType === 'Sub-Contract' && newLog.subContractDetails?.measuredSqft) {
        proj.sqftArea = (proj.sqftArea || 0) + newLog.subContractDetails.measuredSqft;
      }
      if (newLog.workType === 'Sub-Contract' && newLog.subContractDetails?.measuredCubicFeet) {
        proj.cubicFeetArea = (proj.cubicFeetArea || 0) + newLog.subContractDetails.measuredCubicFeet;
      }
      await proj.save();
    }

    const populated = await DailyWageLog.findById(newLog._id)
      .populate('project', 'name code location')
      .populate('employee', 'fullName employeeId designation')
      .populate('linkedAdvance');

    return res.status(201).json({
      success: true,
      message: 'Daily wage / Sub-contract log recorded successfully.',
      data: populated,
    });
  } catch (error) {
    return next(error);
  }
};

/** GET All Daily Wage Logs with Filters */
exports.getDailyWageLogs = async (req, res, next) => {
  try {
    const { project, workType, status, startDate, endDate, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (project) query.project = project;
    if (workType) query.workType = workType;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { workerName: { $regex: search, $options: 'i' } },
        { logCode: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      DailyWageLog.find(query)
        .populate('project', 'name code location')
        .populate('employee', 'fullName employeeId designation')
        .populate('linkedAdvance')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      DailyWageLog.countDocuments(query),
    ]);

    // Compute summary totals for header metric cards
    const summaryAgg = await DailyWageLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalNetDailyPay: { $sum: '$netDailyPay' },
          totalSubContractPay: { $sum: '$subContractPay' },
          totalAllowances: { $sum: '$totalAllowances' },
          totalAdvanceDeductions: { $sum: '$advanceDeductions' },
          totalSqftMeasured: { $sum: '$subContractDetails.measuredSqft' },
          totalCubicFeetMeasured: { $sum: '$subContractDetails.measuredCubicFeet' },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      totalNetDailyPay: 0,
      totalSubContractPay: 0,
      totalAllowances: 0,
      totalAdvanceDeductions: 0,
      totalSqftMeasured: 0,
      totalCubicFeetMeasured: 0,
    };

    return res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
      summary,
    });
  } catch (error) {
    return next(error);
  }
};

/** GET Single Daily Wage Log */
exports.getDailyWageLogById = async (req, res, next) => {
  try {
    const log = await DailyWageLog.findById(req.params.id)
      .populate('project')
      .populate('employee')
      .populate('linkedAdvance')
      .populate('createdBy', 'fullName email')
      .populate('approvedBy', 'fullName email');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Daily wage log not found.' });
    }

    return res.json({ success: true, data: log });
  } catch (error) {
    return next(error);
  }
};

/** UPDATE Daily Wage Log */
exports.updateDailyWageLog = async (req, res, next) => {
  try {
    const log = await DailyWageLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Daily wage log not found.' });
    }

    const fields = [
      'workerName',
      'employee',
      'project',
      'date',
      'workType',
      'skillLevel',
      'skillRate',
      'daysWorked',
      'otHours',
      'otRate',
      'allowances',
      'advanceDeductions',
      'linkedAdvance',
      'subContractDetails',
      'mealExpenseAutoLogged',
      'status',
      'notes',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        log[field] = req.body[field];
      }
    });

    if (req.body.status === 'Approved' && !log.approvedBy) {
      log.approvedBy = req.user?._id || req.user?.id;
    }

    await log.save();

    const updated = await DailyWageLog.findById(log._id)
      .populate('project', 'name code location')
      .populate('employee', 'fullName employeeId designation')
      .populate('linkedAdvance');

    return res.json({
      success: true,
      message: 'Daily wage log updated successfully.',
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
};

/** DELETE Daily Wage Log */
exports.deleteDailyWageLog = async (req, res, next) => {
  try {
    const log = await DailyWageLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Daily wage log not found.' });
    }

    if (log.financeEntryRef) {
      await FinanceEntry.findByIdAndDelete(log.financeEntryRef);
    }

    await DailyWageLog.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: 'Daily wage log deleted successfully.' });
  } catch (error) {
    return next(error);
  }
};

/** Instant Calculator Endpoint (Preview) */
exports.calculatePayPreview = (req, res) => {
  const {
    workType = 'Daily Wage',
    skillRate = 5000,
    daysWorked = 1.0,
    otHours = 0,
    otRate = 0,
    allowances = {},
    advanceDeductions = 0,
    measuredSqft = 0,
    ratePerSqft = 0,
  } = req.body;

  if (workType === 'Daily Wage') {
    const otPay = Number(otHours) * Number(otRate);
    const food = Number(allowances.foodRefreshments) || 0;
    const travel = Number(allowances.travelTransport) || 0;
    const night = Number(allowances.nightOutstation) || 0;
    const totalAllowances = food + travel + night;
    const grossPay = Number(daysWorked) * Number(skillRate) + otPay + totalAllowances;
    const netDailyPay = Math.max(0, grossPay - Number(advanceDeductions));

    return res.json({
      success: true,
      data: {
        workType,
        skillRate: Number(skillRate),
        daysWorked: Number(daysWorked),
        basePay: Number(daysWorked) * Number(skillRate),
        otPay,
        totalAllowances,
        grossPay,
        advanceDeductions: Number(advanceDeductions),
        netDailyPay,
        formula: '(Days Worked * Skill Rate) + Overtime Pay + Allowances - Advance Deductions',
      },
    });
  } else {
    const totalMeasuredPay = Number(measuredSqft) * Number(ratePerSqft);
    const subContractPay = Math.max(0, totalMeasuredPay - Number(advanceDeductions));

    return res.json({
      success: true,
      data: {
        workType,
        measuredSqft: Number(measuredSqft),
        ratePerSqft: Number(ratePerSqft),
        totalMeasuredPay,
        advanceDeductions: Number(advanceDeductions),
        subContractPay,
        formula: '(Measured Sqft * Rate Per Sqft) - Advance Deductions',
      },
    });
  }
};

/** Project Sqft & Financial Summary */
exports.getProjectSqftSummary = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const logsAgg = await DailyWageLog.aggregate([
      { $match: { project: project._id } },
      {
        $group: {
          _id: '$workType',
          totalPayout: {
            $sum: {
              $cond: [{ $eq: ['$workType', 'Daily Wage'] }, '$netDailyPay', '$subContractPay'],
            },
          },
          totalAllowances: { $sum: '$totalAllowances' },
          totalAdvancesDeducted: { $sum: '$advanceDeductions' },
          totalSqft: { $sum: '$subContractDetails.measuredSqft' },
          totalCubicFeet: { $sum: '$subContractDetails.measuredCubicFeet' },
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyWageSummary = logsAgg.find((l) => l._id === 'Daily Wage') || { totalPayout: 0, count: 0 };
    const subContractSummary = logsAgg.find((l) => l._id === 'Sub-Contract') || { totalPayout: 0, count: 0, totalSqft: 0, totalCubicFeet: 0 };

    return res.json({
      success: true,
      data: {
        project: {
          id: project._id,
          name: project.name,
          code: project.code,
          location: project.location,
          sqftArea: project.sqftArea,
          cubicFeetArea: project.cubicFeetArea,
          totalIncome: project.totalIncome,
          totalExpense: project.totalExpense,
          netProfitLoss: project.netProfitLoss,
        },
        dailyWages: dailyWageSummary,
        subContracts: subContractSummary,
      },
    });
  } catch (error) {
    return next(error);
  }
};
