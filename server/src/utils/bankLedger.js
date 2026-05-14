const mongoose = require('mongoose');

/**
 * True when money should move on a company bank account (when bankAccount id is set).
 * Accepts UI labels ("Bank Transfer"), enums ("bank_transfer"), and mixed casing.
 */
function isLedgerBankMethod(method) {
  const raw = String(method || '').trim();
  if (!raw) return false;
  const m = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (!m || m === 'cash' || m === 'cheque' || m === 'other' || m === 'manual' || m === 'salary_deduction') return false;
  if (m.includes('payhere')) return true;
  if (m === 'bank_transfer' || (m.includes('bank') && m.includes('transfer'))) return true;
  if (m.includes('card')) return true;
  if (m.includes('online')) return true;
  if (m.endsWith('_transfer') || m.includes('transfer')) return true;
  return false;
}

/** FinanceEntry uses Title Case labels in the admin UI */
function isFinanceBankMethod(paymentMethod) {
  const p = String(paymentMethod || '').trim();
  if (['Bank Transfer', 'Card', 'Online Payment'].includes(p)) return true;
  return isLedgerBankMethod(paymentMethod);
}

/**
 * Append one ledger line and update currentBalance.
 * @param {'deposit'|'withdrawal'} txType
 */
async function appendBankTransaction(bankAccountId, {
  type: txType,
  amount,
  description = '',
  date,
  reference = '',
  recordedBy,
}) {
  if (!bankAccountId || !mongoose.Types.ObjectId.isValid(String(bankAccountId))) return null;
  const BankAccount = require('../models/BankAccount');
  const account = await BankAccount.findById(bankAccountId);
  if (!account) return null;
  const amt = Math.abs(Number(amount) || 0);
  if (!amt) return null;
  const isCredit = txType === 'deposit' || txType === 'transfer_in';
  const delta = isCredit ? amt : -amt;
  account.currentBalance = (account.currentBalance || 0) + delta;
  account.transactions.push({
    type: isCredit ? 'deposit' : 'withdrawal',
    amount: amt,
    balanceAfter: account.currentBalance,
    description: String(description || '').slice(0, 500),
    date: date ? new Date(date) : new Date(),
    reference: String(reference || '').slice(0, 200),
    recordedBy: recordedBy || undefined,
  });
  await account.save();
  return account;
}

module.exports = {
  isLedgerBankMethod,
  isFinanceBankMethod,
  appendBankTransaction,
};
