const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const User = require('../models/User');
const BankAccount = require('../models/BankAccount');
const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Loan = require('../models/Loan');
const Branch = require('../models/Branch');
const PettyCash = require('../models/PettyCash');
const FinanceEntry = require('../models/FinanceEntry');
const { ASSIGNED_STATUSES, INACTIVE_STATUSES } = require('../utils/employeeFilters');

const PAGE_SIZE = 20;

function paginate(query, page, limit) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(5, parseInt(limit, 10) || PAGE_SIZE));
  const skip = (p - 1) * l;
  return { skip, limit: l, page: p };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toOptions(items, valueKey = '_id', labelFn) {
  return items.map(item => ({
    value: String(item[valueKey]),
    label: labelFn(item),
    meta: item,
  }));
}

// GET /api/lookups/:type?search=&page=&limit=&branch=&assignable=
exports.searchLookup = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { search = '', page = 1, limit, branch, assignable } = req.query;
    const { skip, limit: l, page: p } = paginate({}, page, limit);
    const q = search.trim();
    const rx = q ? new RegExp(escapeRegex(q), 'i') : null;

    let options = [];
    let total = 0;
    let hasMore = false;

    switch (type) {
      case 'employees': {
        const query = {};
        if (assignable === '0' || assignable === 'false') {
          // Explicitly requesting all statuses (e.g., history/reports)
          query.status = { $nin: INACTIVE_STATUSES };
        } else {
          // Default behaviour: active-only (assignable=1 or no param)
          query.status = { $in: ASSIGNED_STATUSES };
        }
        if (branch) query.branch = branch;
        let empQuery = Employee.find(query).populate('userId', 'name email');
        if (rx) {
          const users = await User.find({
            $or: [{ name: rx }, { email: rx }],
          }).select('_id');
          empQuery = empQuery.find({
            $or: [
              { employeeNo: rx },
              { department: rx },
              { designation: rx },
              { userId: { $in: users.map(u => u._id) } },
            ],
          });
        }
        total = await Employee.countDocuments(empQuery.getFilter());
        const rows = await empQuery.sort({ createdAt: -1 }).skip(skip).limit(l + 1);
        hasMore = rows.length > l;
        const sliceRaw = hasMore ? rows.slice(0, l) : rows;
        const slice = sliceRaw.filter((e) => e.userId);
        const seenUsers = new Set();
        const deduped = slice.filter((e) => {
          const uid = String(e.userId?._id || e.userId);
          if (seenUsers.has(uid)) return false;
          seenUsers.add(uid);
          return true;
        });
        options = toOptions(deduped, '_id', e => `${e.userId?.name || '—'} (${e.employeeNo || '—'})`);
        break;
      }
      case 'clients': {
        const query = { role: 'client' };
        if (rx) query.$or = [{ name: rx }, { email: rx }, { phone: rx }];
        total = await User.countDocuments(query);
        const rows = await User.find(query).sort({ name: 1 }).skip(skip).limit(l + 1);
        hasMore = rows.length > l;
        options = toOptions(hasMore ? rows.slice(0, l) : rows, '_id', u => `${u.name} (${u.email})`);
        break;
      }
      case 'banks': {
        const query = { isActive: { $ne: false } };
        if (branch) query.branch = branch;
        if (rx) {
          query.$or = [{ bankName: rx }, { accountNumber: rx }, { accountHolder: rx }];
        }
        total = await BankAccount.countDocuments(query);
        const rows = await BankAccount.find(query).sort({ bankName: 1 }).skip(skip).limit(l + 1);
        hasMore = rows.length > l;
        options = toOptions(hasMore ? rows.slice(0, l) : rows, '_id', b =>
          `${b.bankName} · ${b.accountNumber} (LKR ${(b.currentBalance || 0).toLocaleString()})`);
        break;
      }
      case 'projects': {
        const query = {};
        if (branch && mongoose.Types.ObjectId.isValid(branch)) query.branch = branch;
        if (rx) query.$or = [{ title: rx }, { description: rx }];
        total = await Project.countDocuments(query);
        const rows = await Project.find(query).select('title status client').populate('client', 'name').sort({ updatedAt: -1 }).skip(skip).limit(l + 1);
        hasMore = rows.length > l;
        options = toOptions(hasMore ? rows.slice(0, l) : rows, '_id', p =>
          `${p.title} (${p.status || '—'})`);
        break;
      }
      case 'invoices': {
        const query = {};
        if (rx) query.$or = [{ invoiceNo: rx }, { title: rx }];
        total = await Invoice.countDocuments(query);
        const rows = await Invoice.find(query).select('invoiceNo title totalAmount status').sort({ createdAt: -1 }).skip(skip).limit(l + 1);
        hasMore = rows.length > l;
        options = toOptions(hasMore ? rows.slice(0, l) : rows, '_id', inv =>
          `${inv.invoiceNo || inv._id} — LKR ${(inv.totalAmount || 0).toLocaleString()}`);
        break;
      }
      case 'loans': {
        const query = { status: 'active' };
        if (branch) {
          const emps = await Employee.find({ branch }).select('_id');
          query.employee = { $in: emps.map(e => e._id) };
        }
        let loanQ = Loan.find(query).populate({ path: 'employee', populate: { path: 'userId', select: 'name' } });
        if (rx) {
          const emps = await Employee.find({ employeeNo: rx }).select('_id');
          loanQ = loanQ.find({
            $or: [{ reason: rx }, { employee: { $in: emps.map(e => e._id) } }],
          });
        }
        total = await Loan.countDocuments(loanQ.getFilter());
        const rows = await loanQ.sort({ createdAt: -1 }).skip(skip).limit(l + 1);
        hasMore = rows.length > l;
        const slice = hasMore ? rows.slice(0, l) : rows;
        options = toOptions(slice, '_id', ln =>
          `${ln.employee?.userId?.name || '—'} — LKR ${(ln.outstandingBalance || 0).toLocaleString()} outstanding`);
        break;
      }
      case 'branches': {
        const query = {};
        if (rx) query.$or = [{ name: rx }, { code: rx }, { address: rx }];
        total = await Branch.countDocuments(query);
        const rows = await Branch.find(query).sort({ name: 1 }).skip(skip).limit(l + 1);
        hasMore = rows.length > l;
        options = toOptions(hasMore ? rows.slice(0, l) : rows, '_id', b => b.name);
        break;
      }
      case 'suppliers': {
        const names = new Set();
        if (rx) {
          const petty = await PettyCash.find({ paidTo: { $regex: rx.source, $nin: ['', null] } }).distinct('paidTo');
          petty.forEach(n => names.add(n));
          const fin = await FinanceEntry.find({ type: 'expense', title: rx }).distinct('title');
          fin.forEach(n => names.add(n));
        } else {
          const petty = await PettyCash.find({ paidTo: { $ne: '' } }).distinct('paidTo');
          const fin = await FinanceEntry.find({ type: 'expense' }).distinct('title');
          petty.forEach(n => names.add(n));
          fin.forEach(n => names.add(n));
        }
        const all = [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
        total = all.length;
        const slice = all.slice(skip, skip + l + 1);
        hasMore = slice.length > l;
        const pageItems = hasMore ? slice.slice(0, l) : slice;
        options = pageItems.map((name, i) => ({ value: name, label: name, meta: { name } }));
        break;
      }
      default:
        return res.status(400).json({ success: false, message: `Unknown lookup type: ${type}` });
    }

    res.json({
      success: true,
      options,
      page: p,
      total,
      hasMore,
    });
  } catch (err) { next(err); }
};
