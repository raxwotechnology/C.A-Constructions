const EpfRecord = require('../models/EpfRecord');
const Employee  = require('../models/Employee');
const { createAuditLog } = require('./auditController');
const { getStatutoryRates } = require('../utils/statutoryRates');
const { ASSIGNED_STATUSES } = require('../utils/employeeFilters');

// Helper — round to integer LKR
const r = n => Math.round(n);

// @desc  Get EPF records for a month/year — auto-creates for newly enrolled employees
//        OR all records for one employee when ?employeeId= is set
// @route GET /api/epf-records?month=X&year=Y  OR  ?employeeId=
exports.getEpfRecords = async (req, res, next) => {
  try {
    const { fractions: F, percentages: statutoryRates } = await getStatutoryRates();

    if (req.query.employeeId) {
      const records = await EpfRecord.find({ employee: req.query.employeeId })
        .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
        .sort({ year: -1, month: -1 })
        .limit(240);
      return res.json({
        success: true,
        records: records.map((rec) => ({
          _id: rec._id,
          month: rec.month,
          year: rec.year,
          basicSalary: rec.basicSalary,
          epfEmployee: rec.epfEmployee,
          epfEmployer: rec.epfEmployer,
          etfEmployer: rec.etfEmployer,
          totalEPF: rec.totalEPF,
          isPaid: rec.isPaid,
          paidAt: rec.paidAt,
        })),
        statutoryRates,
      });
    }

    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year  = Number(req.query.year)  || new Date().getFullYear();
    const shouldRefresh = String(req.query.refresh || '').toLowerCase() === 'true';

    // All active enrolled employees
    const enrolled = await Employee.find({
      epfEtfEnrolled: true,
      status: { $in: ASSIGNED_STATUSES },
    }).populate('userId', 'name email');

    const enrolledIds = enrolled.map(e => e._id);

    // Force refresh: recalculate unpaid records from current employee basic salary
    if (shouldRefresh) {
      for (const emp of enrolled) {
        const basic = emp.basicSalary || 0;
        const ee = r(basic * F.epfEmployee);
        const er = r(basic * F.epfEmployer);
        const et = r(basic * F.etfEmployer);
        await EpfRecord.findOneAndUpdate(
          { employee: emp._id, month, year, isPaid: { $ne: true } },
          {
            employee: emp._id,
            month,
            year,
            basicSalary: basic,
            epfEmployee: ee,
            epfEmployer: er,
            etfEmployer: et,
            totalEPF: ee + er,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    // Existing records for this period
    const existing = await EpfRecord.find({ employee: { $in: enrolledIds }, month, year });
    const existingMap = {};
    existing.forEach(rec => { existingMap[String(rec.employee)] = rec; });

    // Auto-create missing records (upsert-style)
    const toCreate = enrolled
      .filter(emp => !existingMap[String(emp._id)])
      .map(emp => {
        const basic = emp.basicSalary || 0;
        const ee = r(basic * F.epfEmployee);
        const er = r(basic * F.epfEmployer);
        const et = r(basic * F.etfEmployer);
        return {
          employee:    emp._id,
          month, year,
          basicSalary: basic,
          epfEmployee: ee,
          epfEmployer: er,
          etfEmployer: et,
          totalEPF:    ee + er,
        };
      });

    if (toCreate.length) {
      await EpfRecord.insertMany(toCreate, { ordered: false });
    }

    // Fetch all records (including newly created)
    const records = await EpfRecord.find({ employee: { $in: enrolledIds }, month, year })
      .populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } })
      .sort({ createdAt: 1 });

    const summary = records.map(rec => ({
      _id:         rec._id,
      employeeId:  rec.employee._id,
      employeeNo:  rec.employee.employeeNo,
      name:        rec.employee.userId?.name,
      epfNo:       rec.employee.epfNumber,
      etfNo:       rec.employee.etfNumber,
      basicSalary: rec.basicSalary,
      epfEmployee: rec.epfEmployee,
      epfEmployer: rec.epfEmployer,
      totalEPF:    rec.totalEPF,
      etfEmployer: rec.etfEmployer,
      isPaid:      rec.isPaid,
      paidAt:      rec.paidAt,
      notes:       rec.notes,
    }));

    const totals = {
      epfEmployee: summary.reduce((a, b) => a + b.epfEmployee, 0),
      epfEmployer: summary.reduce((a, b) => a + b.epfEmployer, 0),
      totalEPF:    summary.reduce((a, b) => a + b.totalEPF,    0),
      etfEmployer: summary.reduce((a, b) => a + b.etfEmployer, 0),
    };

    res.json({ success: true, summary, totals, statutoryRates });
  } catch (err) { next(err); }
};

// @desc  Update EPF/ETF amounts for a record (always allowed)
// @route PUT /api/epf-records/:id
exports.updateEpfRecord = async (req, res, next) => {
  try {
    const rec = await EpfRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Record not found' });

    const epfEmployee = Number(req.body.epfEmployee ?? rec.epfEmployee);
    const epfEmployer = Number(req.body.epfEmployer ?? rec.epfEmployer);
    const etfEmployer = Number(req.body.etfEmployer ?? rec.etfEmployer);
    const basicSalary = Number(req.body.basicSalary ?? rec.basicSalary);
    const notes       = req.body.notes       ?? rec.notes;

    const updated = await EpfRecord.findByIdAndUpdate(
      req.params.id,
      {
        epfEmployee,
        epfEmployer,
        etfEmployer,
        basicSalary,
        totalEPF: Math.round(epfEmployee + epfEmployer),
        notes,
      },
      { new: true }
    ).populate({ path: 'employee', populate: { path: 'userId', select: 'name email' } });

    await createAuditLog({
      user: req.user, action: 'update', module: 'payroll', entityId: updated._id, entityName: `EPF Record`,
      description: `Updated EPF/ETF amounts for employee ${updated.employee?.userId?.name || updated.employee} (${updated.month}/${updated.year})`,
    });

    res.json({ success: true, record: updated });
  } catch (err) { next(err); }
};

// @desc  Mark EPF record as paid / unpaid toggle
// @route PUT /api/epf-records/:id/pay
exports.togglePaid = async (req, res, next) => {
  try {
    const rec = await EpfRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Record not found' });

    const newPaid = !rec.isPaid;
    const updated = await EpfRecord.findByIdAndUpdate(
      req.params.id,
      {
        isPaid: newPaid,
        paidAt: newPaid ? new Date() : null,
        paidBy: newPaid ? req.user._id : null,
      },
      { new: true }
    );

    res.json({ success: true, record: updated, isPaid: newPaid });
  } catch (err) { next(err); }
};

// @desc  Delete EPF record (always allowed)
// @route DELETE /api/epf-records/:id
exports.deleteEpfRecord = async (req, res, next) => {
  try {
    const rec = await EpfRecord.findByIdAndDelete(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Record not found' });
    await createAuditLog({
      user: req.user, action: 'delete', module: 'payroll', entityId: rec._id, entityName: `EPF Record Deleted`,
      description: `Deleted EPF/ETF record for employee ${rec.employee} (${rec.month}/${rec.year})`,
    });
    res.json({ success: true, message: 'EPF record deleted' });
  } catch (err) { next(err); }
};
