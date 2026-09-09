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

    const projDoc = await Project.findById(newLog.project);
    const projBranch = projDoc?.branch || null;

    // If advance deductions entered without a pre-existing linked advance, log an Advance Expense in Finance Entries / Ledger
    if (newLog.advanceDeductions > 0 && !newLog.linkedAdvance) {
      const advTxNo = `TX-ADV-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
      const advFinanceEntry = new FinanceEntry({
        transactionNo: advTxNo,
        project: newLog.project,
        branch: projBranch,
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
        branch: projBranch,
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
        let projBranch = null;
        if (log.project) {
          const proj = await Project.findById(log.project);
          if (proj) projBranch = proj.branch || null;
        }
        const paidTxNo = `TX-PAY-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
        const paidFinanceEntry = new FinanceEntry({
          transactionNo: paidTxNo,
          project: log.project,
          branch: projBranch,
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

/** BATCH PAYOUT: Settle / Pay multiple pending logs in one consolidated transaction */
exports.batchPayoutDailyWageLogs = async (req, res, next) => {
  try {
    const { logIds, paymentDate, paymentMethod = 'Cash', notes = '' } = req.body;

    if (!Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one log ID to settle.' });
    }

    const isValidId = (v) => v && mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === String(v);
    const validLogIds = logIds.filter(isValidId);

    if (validLogIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid log IDs provided.' });
    }

    const logs = await DailyWageLog.find({ _id: { $in: validLogIds } }).populate('project');
    if (logs.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching daily wage logs found.' });
    }

    // Filter only logs that are not already Paid
    const pendingLogs = logs.filter((l) => l.status !== 'Paid');
    if (pendingLogs.length === 0) {
      return res.status(400).json({ success: false, message: 'All selected work logs are already marked as Paid.' });
    }

    // Worker names involved
    const workerNames = Array.from(new Set(pendingLogs.map((l) => l.workerName).filter(Boolean)));
    const primaryWorkerName = workerNames.join(', ');
    const primaryProject = pendingLogs[0].project;
    const projectId = primaryProject?._id || primaryProject || null;

    // Total net payout calculation
    let totalNetPayout = 0;
    let totalGrossPay = 0;
    let totalAdvancesDeducted = 0;

    pendingLogs.forEach((log) => {
      const net = log.workType === 'Daily Wage' ? (log.netDailyPay || 0) : (log.subContractPay || 0);
      totalNetPayout += net;
      totalAdvancesDeducted += (log.advanceDeductions || 0);
      if (log.workType === 'Daily Wage') {
        const gross = ((log.daysWorked || 1) * (log.skillRate || 0)) + (log.otPay || 0) + (log.totalAllowances || 0);
        totalGrossPay += gross;
      } else {
        totalGrossPay += (log.subContractDetails?.totalMeasuredPay || 0);
      }
    });

    let consolidatedFinanceEntry = null;

    if (totalNetPayout > 0) {
      let projBranch = null;
      if (projectId) {
        const proj = await Project.findById(projectId);
        if (proj) projBranch = proj.branch || null;
      }
      const paidTxNo = `TX-BATCH-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
      const logCodesSummary = pendingLogs.map((l) => l.logCode).join(', ');
      const desc = notes
        ? `${notes} (Logs: ${logCodesSummary})`
        : `Consolidated Final Wage Payout for ${primaryWorkerName} covering ${pendingLogs.length} work day(s) (${logCodesSummary})`;

      consolidatedFinanceEntry = new FinanceEntry({
        transactionNo: paidTxNo,
        project: projectId,
        branch: projBranch,
        transactionType: 'Expense',
        type: 'expense',
        category: 'Daily Wages',
        masterCategory: 'Daily Wages',
        subCategory: 'Final Wage Payout',
        title: pendingLogs.length > 1
          ? `Final Wage Payout - ${primaryWorkerName} (${pendingLogs.length} Days Consolidated)`
          : `Final Wage Payout - ${primaryWorkerName}`,
        amount: totalNetPayout,
        date: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || 'Cash',
        payeeOrPayer: primaryWorkerName,
        description: desc,
        note: desc,
        status: 'Approved',
        createdBy: isValidId(req.user?._id || req.user?.id) ? (req.user?._id || req.user?.id) : null,
      });

      await consolidatedFinanceEntry.save();
    }

    // Update all pending logs to 'Paid' and link the consolidated FinanceEntry
    const updatePromises = pendingLogs.map(async (log) => {
      log.status = 'Paid';
      if (consolidatedFinanceEntry) {
        log.paidFinanceEntryRef = consolidatedFinanceEntry._id;
      }
      if (req.user?._id || req.user?.id) {
        log.approvedBy = req.user?._id || req.user?.id;
      }
      return log.save();
    });

    await Promise.all(updatePromises);

    // Update Project actual costs
    if (projectId && totalNetPayout > 0) {
      const proj = await Project.findById(projectId);
      if (proj) {
        proj.actualCost = (proj.actualCost || 0) + totalNetPayout;
        proj.totalExpense = (proj.totalExpense || 0) + totalNetPayout;
        proj.netProfitLoss = (proj.totalIncome || 0) - proj.totalExpense;
        await proj.save();
      }
    }

    return res.json({
      success: true,
      message: `Successfully processed consolidated payout of Rs. ${totalNetPayout.toLocaleString()} for ${pendingLogs.length} work log(s).`,
      data: {
        settledCount: pendingLogs.length,
        totalNetPayout,
        totalGrossPay,
        totalAdvancesDeducted,
        financeEntry: consolidatedFinanceEntry,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/** AUTO-DEDUPLICATE & RECONCILE: Scan FinanceEntry & DailyWageLog to remove duplicate entries */
exports.syncAndDeduplicateWageFinanceEntries = async (req, res, next) => {
  try {
    // 1. Fetch all DailyWageLog records
    const allLogs = await DailyWageLog.find();
    const paidLogs = allLogs.filter((l) => l.status === 'Paid');

    // Map of valid paidFinanceEntryRef IDs
    const validPaidFinanceRefs = new Set();
    paidLogs.forEach((l) => {
      if (l.paidFinanceEntryRef) validPaidFinanceRefs.add(String(l.paidFinanceEntryRef));
    });

    // 2. Fetch all FinanceEntry records related to Daily Wages
    const wageEntries = await FinanceEntry.find({
      $or: [
        { category: 'Daily Wages' },
        { masterCategory: 'Daily Wages' },
        { subCategory: 'Final Wage Payout' },
        { title: { $regex: /Final Wage Payout|Worker Salary Advance/i } },
      ],
    });

    let deletedCount = 0;
    let cleanedAmount = 0;
    const deletedIds = [];

    // 3. Case A: Detect exact duplicate entries (same title, amount, date, project)
    const seenTx = new Map();
    for (const entry of wageEntries) {
      const key = `${entry.title}_${entry.amount}_${entry.date ? new Date(entry.date).toISOString().slice(0, 10) : ''}_${entry.project || ''}`;
      if (seenTx.has(key)) {
        await FinanceEntry.findByIdAndDelete(entry._id);
        deletedCount++;
        cleanedAmount += Number(entry.amount || 0);
        deletedIds.push(entry._id);
      } else {
        seenTx.set(key, entry);
      }
    }

    // Case B: Worker has individual daily logs (e.g. 5,000s) AND an orphan lump-sum entry (e.g. 20,000) for the exact same accumulated worker period
    const remainingWageEntries = await FinanceEntry.find({
      _id: { $nin: deletedIds },
      $or: [
        { category: 'Daily Wages' },
        { masterCategory: 'Daily Wages' },
        { subCategory: 'Final Wage Payout' },
        { title: { $regex: /Final Wage Payout/i } },
      ],
    });

    // Group logs and entries by worker
    const workerLogsMap = new Map();
    paidLogs.forEach((l) => {
      const w = (l.workerName || '').trim();
      if (!workerLogsMap.has(w)) workerLogsMap.set(w, []);
      workerLogsMap.get(w).push(l);
    });

    for (const [workerName, logsList] of workerLogsMap.entries()) {
      const workerEntries = remainingWageEntries.filter((e) =>
        (e.payeeOrPayer || e.title || '').includes(workerName)
      );

      const totalLogNet = logsList.reduce((s, l) => s + (l.netDailyPay || l.subContractPay || 0), 0);
      const totalEntryAmount = workerEntries.reduce((s, e) => s + Number(e.amount || 0), 0);

      if (totalEntryAmount > totalLogNet && workerEntries.length > logsList.length) {
        for (const entry of workerEntries) {
          const isLumpSumOvercount = entry.amount > 0 && Math.abs(totalLogNet - entry.amount) < 1 && logsList.length > 1;
          const individualEntriesExist = workerEntries.some(
            (e) => e._id.toString() !== entry._id.toString() && e.amount < entry.amount
          );

          if (isLumpSumOvercount && individualEntriesExist && !validPaidFinanceRefs.has(entry._id.toString())) {
            await FinanceEntry.findByIdAndDelete(entry._id);
            deletedCount++;
            cleanedAmount += Number(entry.amount || 0);
            break;
          }
        }
      }
    }

    // 4. Reconcile project costs
    const projects = await Project.find();
    for (const proj of projects) {
      const projEntries = await FinanceEntry.find({ project: proj._id, type: 'expense' });
      const realExpense = projEntries.reduce((s, e) => s + Number(e.amount || 0), 0);
      if (proj.totalExpense !== realExpense) {
        proj.totalExpense = realExpense;
        proj.actualCost = realExpense;
        proj.netProfitLoss = (proj.totalIncome || 0) - realExpense;
        await proj.save();
      }
    }

    return res.json({
      success: true,
      message: deletedCount > 0
        ? `Auto-Fix complete! Removed ${deletedCount} duplicate wage entries (Total Rs. ${cleanedAmount.toLocaleString()}) and reconciled Accounts & Projects.`
        : 'All wage finance entries are already clean and in sync with Accounts.',
      data: {
        deletedCount,
        cleanedAmount,
      },
    });
  } catch (error) {
    return next(error);
  }
};


