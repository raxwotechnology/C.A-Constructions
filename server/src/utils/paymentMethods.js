/** Normalize payment method strings to snake_case tokens. */
function normalizePayMethod(method) {
  return String(method || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/** Cash-only — no bank account required. */
function isCashMethod(method) {
  return normalizePayMethod(method) === 'cash';
}

function isChequeMethod(method) {
  return normalizePayMethod(method) === 'cheque';
}

/** Bank account must be selected (bank transfer or cheque). */
function requiresBankAccount(method) {
  const m = normalizePayMethod(method);
  return m === 'bank_transfer' || m === 'cheque';
}

/**
 * Post withdrawal/deposit to company bank ledger when paying from a bank account.
 * Includes cheque (issued) and bank transfer; excludes cash.
 */
function postsToBankLedger(method) {
  const m = normalizePayMethod(method);
  if (!m || m === 'cash' || m === 'other' || m === 'manual' || m === 'salary_deduction') return false;
  if (m === 'cheque' || m === 'bank_transfer') return true;
  if (m.includes('payhere')) return true;
  if (m.includes('card')) return true;
  if (m.includes('online')) return true;
  if (m.endsWith('_transfer') || (m.includes('bank') && m.includes('transfer'))) return true;
  return false;
}

/** Map raw method to finance report label. */
function mapToFinancePaymentMethod(method = '') {
  const map = {
    cash: 'Cash',
    card: 'Card',
    card_payment: 'Card',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    payhere: 'Online Payment',
    online_transfer: 'Online Payment',
    online: 'Online Payment',
    custom: 'Other',
  };
  const key = normalizePayMethod(method);
  return map[key] || 'Other';
}

/** Parse date for ledger rows — capture exact time. */
function parseLedgerDate(date) {
  if (!date) {
    return new Date();
  }
  if (date instanceof Date) {
    return date;
  }
  const s = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const now = new Date();
    const [y, mo, da] = s.split('-').map(Number);
    return new Date(y, mo - 1, da, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

module.exports = {
  normalizePayMethod,
  isCashMethod,
  isChequeMethod,
  requiresBankAccount,
  postsToBankLedger,
  mapToFinancePaymentMethod,
  parseLedgerDate,
};
