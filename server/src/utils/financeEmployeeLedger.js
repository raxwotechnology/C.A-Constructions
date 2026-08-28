const mongoose = require('mongoose');
const Advance = require('../models/Advance');
const Loan = require('../models/Loan');
const Employee = require('../models/Employee');
const BankAccount = require('../models/BankAccount');

function mapMethod(method = '') {
  const map = {
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    online_transfer: 'Online Payment',
    payhere: 'Online Payment',
    cheque: 'Cheque',
    salary_deduction: 'Salary Deduction',
    external: 'Other',
  };
  const key = String(method || 'cash').toLowerCase().replace(/\s+/g, '_');
  return map[key] || 'Other';
}

function matchesPaymentMethod(actual, filter) {
  if (!filter) return true;
  return mapMethod(actual).toLowerCase() === String(filter).toLowerCase();
}

function inDateRange(date, dateFilter) {
  if (!dateFilter) return true;
  const d = new Date(date);
  if (dateFilter.$gte && d < dateFilter.$gte) return false;
  if (dateFilter.$lte && d > dateFilter.$lte) return false;
  return true;
}

async function getEmployeeIds(branchId) {
  if (!branchId) return null;
  const emps = await Employee.find({ branch: branchId }).select('_id').lean();
  return emps.map((e) => e._id);
}

/** Salary advance payouts (expense). */
async function resolveAdvanceExpenses(branchId, dateFilter, paymentMethod) {
  const q = {};
  const empIds = await getEmployeeIds(branchId);
  if (empIds) q.employee = { $in: empIds };
  if (dateFilter) q.date = dateFilter;

  const advances = await Advance.find(q)
    .populate({ path: 'employee', populate: { path: 'userId', select: 'name' } })
    .sort({ date: -1 })
    .lean();

  const entries = advances
    .filter((a) => matchesPaymentMethod(a.paymentMethod, paymentMethod))
    .map((a) => ({
      _id: a._id,
      type: 'expense',
      category: 'Salary Advances',
      title: `Advance: ${a.employee?.userId?.name || 'Employee'}`,
      amount: Number(a.amount || 0),
      date: a.date,
      paymentMethod: mapMethod(a.paymentMethod),
      note: a.reason || a.paymentReference || '',
      source: 'advance',
    }));

  const total = entries.reduce((s, e) => s + e.amount, 0);
  return { total, count: entries.length, entries };
}

/** Loan disbursements (expense) and direct repayments (income, excludes payroll deductions). */
async function resolveLoanTransactions(branchId, dateFilter, paymentMethod) {
  const empIds = await getEmployeeIds(branchId);
  const empMatch = empIds ? { employee: { $in: empIds } } : {};

  const loanQ = { ...empMatch };
  if (dateFilter) loanQ.startDate = dateFilter;

  const loans = await Loan.find(loanQ)
    .populate({ path: 'employee', populate: { path: 'userId', select: 'name' } })
    .lean();

  const disbursementEntries = loans.map((l) => ({
    _id: `loan-disb-${l._id}`,
    type: 'expense',
    category: 'Employee Loans',
    title: `Loan Disbursement: ${l.employee?.userId?.name || 'Employee'}`,
    amount: Number(l.totalAmount || 0),
    date: l.startDate,
    paymentMethod: 'Other',
    note: l.reason || '',
    source: 'loan_disbursement',
  }));

  const allLoans = await Loan.find(empMatch)
    .populate({ path: 'employee', populate: { path: 'userId', select: 'name' } })
    .lean();

  const repaymentEntries = [];
  for (const loan of allLoans) {
    for (const p of loan.payments || []) {
      if (p.method === 'salary_deduction') continue;
      if (!inDateRange(p.date, dateFilter)) continue;
      if (!matchesPaymentMethod(p.method, paymentMethod)) continue;
      repaymentEntries.push({
        _id: p._id,
        type: 'income',
        category: 'Loan Repayments',
        title: `Loan Repayment: ${loan.employee?.userId?.name || 'Employee'}`,
        amount: Number(p.amount || 0),
        date: p.date,
        paymentMethod: mapMethod(p.method),
        note: p.note || '',
        source: 'loan_repayment',
      });
    }
  }

  const expenseTotal = disbursementEntries.reduce((s, e) => s + e.amount, 0);
  const incomeTotal = repaymentEntries.reduce((s, e) => s + e.amount, 0);

  return {
    expenseTotal,
    incomeTotal,
    expenseEntries: disbursementEntries,
    incomeEntries: repaymentEntries,
  };
}

const AUTO_BANK_SOURCES = new Set([
  'advances', 'loans', 'payroll', 'invoices', 'subscriptions', 'petty_cash', 'cheques', 'finance',
]);

/** Bank account ledger lines — shown for reconciliation; auto-linked rows are excluded from P&L totals. */
async function resolveBankLedgerTransactions(branchId, dateFilter) {
  const q = { isActive: true };
  if (branchId) q.branch = new mongoose.Types.ObjectId(branchId);

  const accounts = await BankAccount.find(q).select('bankName accountNumber branch transactions').lean();
  const entries = [];
  let deposits = 0;
  let withdrawals = 0;

  for (const acct of accounts) {
    for (const tx of acct.transactions || []) {
      if (!inDateRange(tx.date, dateFilter)) continue;
      const isCredit = tx.type === 'deposit' || tx.type === 'transfer_in';
      const amt = Number(tx.amount || 0);
      if (isCredit) deposits += amt;
      else withdrawals += amt;

      const moduleSource = String(tx.moduleSource || 'manual').toLowerCase();
      entries.push({
        _id: tx._id,
        type: isCredit ? 'income' : 'expense',
        category: isCredit ? 'Bank Deposits' : 'Bank Withdrawals',
        title: tx.description || `${acct.bankName} — ${isCredit ? 'Deposit' : 'Withdrawal'}`,
        amount: amt,
        date: tx.date,
        paymentMethod: mapMethod(tx.transactionType || tx.moduleSource),
        note: `${acct.bankName} (${acct.accountNumber})`,
        source: 'bank_ledger',
        countsInTotals: !AUTO_BANK_SOURCES.has(moduleSource),
        moduleSource,
      });
    }
  }

  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalsEntries = entries.filter((e) => e.countsInTotals);
  const incomeTotal = totalsEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expenseTotal = totalsEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  return {
    deposits,
    withdrawals,
    netFlow: deposits - withdrawals,
    count: entries.length,
    incomeTotal,
    expenseTotal,
    entries,
  };
}

module.exports = {
  resolveAdvanceExpenses,
  resolveLoanTransactions,
  resolveBankLedgerTransactions,
  mapMethod,
};
