const Cheque = require('../models/Cheque');

const INCOMING_STATUSES = ['cleared', 'deposited', 'received', 'paid'];
const OUTGOING_STATUSES = ['cleared', 'paid', 'deposited'];

function isIncoming(direction) {
  return ['received', 'incoming'].includes(String(direction || '').toLowerCase());
}

function normalizeChequeEntries(cheques = [], { type } = {}) {
  return cheques
    .filter((c) => {
      const incoming = isIncoming(c.direction);
      if (type === 'income') return incoming;
      if (type === 'expense') return !incoming;
      return true;
    })
    .map((c) => {
      const incoming = isIncoming(c.direction);
      return {
        _id: c._id,
        type: incoming ? 'income' : 'expense',
        category: incoming ? 'Cheques (In)' : 'Cheques (Out)',
        title: `Cheque ${c.chequeNumber}: ${c.drawerOrPayee || c.source || '—'}`,
        amount: Number(c.amount || 0),
        date: c.chequeDate || c.createdAt,
        paymentMethod: 'Cheque',
        note: `${c.status} | ${c.bankName || ''}`.trim(),
        source: 'cheque',
      };
    });
}

async function resolveChequeTransactions(branchId, dateFilter, paymentMethod) {
  if (paymentMethod && paymentMethod !== 'Cheque') {
    return { incomeTotal: 0, expenseTotal: 0, incomeEntries: [], expenseEntries: [] };
  }

  const baseQ = { ledgerPosted: true };
  if (branchId) baseQ.branch = branchId;
  if (dateFilter) baseQ.chequeDate = dateFilter;

  const [incoming, outgoing] = await Promise.all([
    Cheque.find({ ...baseQ, direction: { $in: ['received', 'incoming'] }, status: { $in: INCOMING_STATUSES } }).sort({ chequeDate: -1 }).lean(),
    Cheque.find({ ...baseQ, direction: { $in: ['issued', 'outgoing'] }, status: { $in: OUTGOING_STATUSES } }).sort({ chequeDate: -1 }).lean(),
  ]);

  const incomeEntries = normalizeChequeEntries(incoming, { type: 'income' });
  const expenseEntries = normalizeChequeEntries(outgoing, { type: 'expense' });
  const incomeTotal = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const expenseTotal = expenseEntries.reduce((s, e) => s + e.amount, 0);

  return { incomeTotal, expenseTotal, incomeEntries, expenseEntries };
}

module.exports = {
  resolveChequeTransactions,
  normalizeChequeEntries,
};
