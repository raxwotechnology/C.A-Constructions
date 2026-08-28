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
        pricingBasis: subContractDetails?.pricingBasis || 'SQFT',
        workCategory: subContractDetails?.workCategory || 'Roofing',
        measuredSqft: Number(subContractDetails?.measuredSqft) || 0,
        measuredCubicFeet: Number(subContractDetails?.measuredCubicFeet) || 0,
        ratePerSqft: Number(subContractDetails?.ratePerSqft) || 0,
        lumpSumAmount: Number(subContractDetails?.lumpSumAmount) || 0,
        totalMeasuredPay: Number(subContractDetails?.totalMeasuredPay) || 0,
      },
      mealExpenseAutoLogged: Boolean(mealExpenseAutoLogged),
      notes: notes || '',
      createdBy: isValidId(req.user?._id || req.user?.id) ? (req.user?._id || req.user?.id) : null,
    });

    await newLog.save();

    // If advance deductions entered, log an Advance Expense in Finance Entries / Ledger
    if (newLog.advanceDeductions > 0) {
      const advTxNo = `TX-ADV-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
      const advFinanceEntry = new FinanceEntry({
        transactionNo: advTxNo,
        project: newLog.project,
        transactionType: 'Expense',
        type: 'expense',
        category: 'Daily Wages',
        masterCategory: 'Daily Wages',
        subCategory: 'Salary Advance',
        title: `Worker Salary Advance - ${newLog.workerName}`,
        amount: newLog.advanceDeductions,
        date: newLog.date || new Date(),
        paymentMethod: 'Cash',
        payeeOrPayer: newLog.workerName,
        description: `Worker Wage Advance Deduction Expense - ${newLog.workerName} (${newLog.logCode})`,
        note: `Worker Wage Advance Deduction Expense - ${newLog.workerName} (${newLog.logCode})`,
        status: 'Approved',
        createdBy: isValidId(req.user?._id || req.user?.id) ? (req.user?._id || req.user?.id) : null,
      });
      await advFinanceEntry.save();
      newLog.advanceFinanceEntryRef = advFinanceEntry._id;
    }

    // If status is created as Paid, log the Final Wage Payout Expense immediately
    const netPayout = newLog.workType === 'Daily Wage' ? newLog.netDailyPay : newLog.subContractPay;
    if (newLog.status === 'Paid' && netPayout > 0) {
      const paidTxNo = `TX-PAY-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
      const paidFinanceEntry = new FinanceEntry({
        transactionNo: paidTxNo,
        project: newLog.project,
        transactionType: 'Expense',
        type: 'expense',
        category: 'Daily Wages',
        masterCategory: 'Daily Wages',
        subCategory: 'Final Wage Payout',
        title: `Final Wage Payout - ${newLog.workerName}`,
        amount: netPayout,
        date: newLog.date || new Date(),
        paymentMethod: 'Cash',
        payeeOrPayer: newLog.workerName,
        description: `Final Wage Payout Expense - ${newLog.workerName} (${newLog.logCode})`,
        note: `Final Wage Payout Expense - ${newLog.workerName} (${newLog.logCode})`,
        status: 'Approved',
        createdBy: isValidId(req.user?._id || req.user?.id) ? (req.user?._id || req.user?.id) : null,
      });
      await paidFinanceEntry.save();
      newLog.paidFinanceEntryRef = paidFinanceEntry._id;
    }

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
        type: 'expense',
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

    // Update Project income vs expense totals (Advance + Net Payout if paid)
    const proj = await Project.findById(project);
    if (proj) {
      const totalExpenseToAdd = (newLog.advanceDeductions || 0) + (newLog.status === 'Paid' ? netPayout : 0);
      proj.actualCost = (proj.actualCost || 0) + totalExpenseToAdd;
      proj.totalExpense = (proj.totalExpense || 0) + totalExpenseToAdd;
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
    const { project, workType, status, branch, startDate, endDate, search, page = 1, limit = 500 } = req.query;

    const query = {};

    if (project) query.project = project;
    if (workType) query.workType = workType;
    if (status) query.status = status;

    if (branch) {
      const projectIds = await Project.find({ branch }).distinct('_id');
      query.project = { $in: projectIds };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { workerName: { $regex: search, $options: 'i' } },
        { logCode: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const effectiveLimit = Number(limit) || 500;
    const skip = (Number(page) - 1) * effectiveLimit;

    const [logs, total] = await Promise.all([
      DailyWageLog.find(query)
        .populate('project', 'name code location branch')
        .populate('employee', 'fullName employeeId designation')
        .populate('linkedAdvance')
        .sort({ date: -1 })
        .skip(skip)
        .limit(effectiveLimit),
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
          totalGrossSalary: {
            $sum: { $add: [{ $ifNull: ['$netDailyPay', 0] }, { $ifNull: ['$subContractPay', 0] }] },
          },
        },
      },
    ]);

    const summaryData = summaryAgg[0] || {
      totalNetDailyPay: 0,
      totalSubContractPay: 0,
      totalAllowances: 0,
      totalAdvanceDeductions: 0,
      totalSqftMeasured: 0,
      totalCubicFeetMeasured: 0,
      totalGrossSalary: 0,
    };

    const summary = {
      ...summaryData,
      totalGrossSalary: summaryData.totalGrossSalary || ((summaryData.totalNetDailyPay || 0) + (summaryData.totalSubContractPay || 0)),
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

    const previousStatus = log.status;

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

    // Trigger pre-validate hook to calculate netDailyPay / subContractPay
    await log.save();

    // Check if status changed to 'Paid' or changed away from 'Paid'
    const newStatus = log.status;
    const netPayout = log.workType === 'Daily Wage' ? log.netDailyPay : log.subContractPay;

    if (newStatus === 'Paid' && previousStatus !== 'Paid') {
      if (!log.paidFinanceEntryRef && netPayout > 0) {
        const paidTxNo = `TX-PAY-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
        const paidFinanceEntry = new FinanceEntry({
          transactionNo: paidTxNo,
          project: log.project,
          transactionType: 'Expense',
          type: 'expense',
          category: 'Daily Wages',
          masterCategory: 'Daily Wages',
          subCategory: 'Final Wage Payout',
          title: `Final Wage Payout - ${log.workerName}`,
          amount: netPayout,
          date: log.date || new Date(),
          paymentMethod: 'Cash',
          payeeOrPayer: log.workerName,
          description: `Final Worker Wage Payout Expense - ${log.workerName} (${log.logCode})`,
          note: `Final Worker Wage Payout Expense - ${log.workerName} (${log.logCode})`,
          status: 'Approved',
          createdBy: (req.user?._id || req.user?.id) || null,
        });
        await paidFinanceEntry.save();
        log.paidFinanceEntryRef = paidFinanceEntry._id;
        await log.save();
      }

      // Update project costs
      if (log.project) {
        const proj = await Project.findById(log.project);
        if (proj) {
          proj.actualCost = (proj.actualCost || 0) + netPayout;
          proj.totalExpense = (proj.totalExpense || 0) + netPayout;
          proj.netProfitLoss = (proj.totalIncome || 0) - proj.totalExpense;
          await proj.save();
        }
      }
    } else if (newStatus !== 'Paid' && previousStatus === 'Paid') {
      if (log.paidFinanceEntryRef) {
        await FinanceEntry.findByIdAndDelete(log.paidFinanceEntryRef);
        log.paidFinanceEntryRef = null;
        await log.save();

        if (log.project) {
          const proj = await Project.findById(log.project);
          if (proj) {
            proj.actualCost = Math.max(0, (proj.actualCost || 0) - netPayout);
            proj.totalExpense = Math.max(0, (proj.totalExpense || 0) - netPayout);
            proj.netProfitLoss = (proj.totalIncome || 0) - proj.totalExpense;
            await proj.save();
          }
        }
      }
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
    if (log.advanceFinanceEntryRef) {
      await FinanceEntry.findByIdAndDelete(log.advanceFinanceEntryRef);
    }
    if (log.paidFinanceEntryRef) {
      await FinanceEntry.findByIdAndDelete(log.paidFinanceEntryRef);
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
