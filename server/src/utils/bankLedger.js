const mongoose = require('mongoose');
const { postsToBankLedger, parseLedgerDate } = require('./paymentMethods');

/** @deprecated use postsToBankLedger from paymentMethods */
function isLedgerBankMethod(method) {
  return postsToBankLedger(method);
}

function isFinanceBankMethod(paymentMethod) {
  const p = String(paymentMethod || '').trim();
  if (['Bank Transfer', 'Card', 'Online Payment', 'Cheque'].includes(p)) return true;
  return postsToBankLedger(paymentMethod);
}

/**
 * Append one ledger line and update currentBalance.
 */
async function appendBankTransaction(bankAccountId, {
  type: txType,
  amount,
  description = '',
  date,
  reference = '',
  referenceId = '',
  moduleSource = 'manual',
  sourceType = '',
  sourceId,
  recordedBy,
  paymentMethod = '',
}) {
  if (!bankAccountId || !mongoose.Types.ObjectId.isValid(String(bankAccountId))) {
    throw new Error(`Invalid bank account ID: ${bankAccountId}`);
  }
  const BankAccount = require('../models/BankAccount');
  const account = await BankAccount.findById(bankAccountId);
  if (!account) {
    throw new Error(`Bank account not found for ID: ${bankAccountId}`);
  }
  const amt = Math.abs(Number(amount) || 0);
  if (!amt) {
    throw new Error(`Invalid transaction amount: ${amount}`);
  }

  const balanceBefore = account.currentBalance || 0;
  const isCredit = txType === 'deposit' || txType === 'transfer_in';
  const delta = isCredit ? amt : -amt;
  account.currentBalance = balanceBefore + delta;

  const ref = String(referenceId || reference || '').slice(0, 200);
  const payLabel = String(paymentMethod || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const txDate = parseLedgerDate(date);

  account.transactions.push({
    type: isCredit ? 'deposit' : 'withdrawal',
    transactionType: payLabel || txType,
    amount: amt,
    balanceBefore,
    balanceAfter: account.currentBalance,
    description: String(description || '').slice(0, 500),
    date: txDate,
    reference: ref,
    referenceId: ref,
    moduleSource: String(moduleSource || 'manual').slice(0, 80),
    sourceType: String(sourceType || '').slice(0, 80),
    sourceId: sourceId && mongoose.Types.ObjectId.isValid(String(sourceId)) ? sourceId : undefined,
    recordedBy: recordedBy || undefined,
  });
  await account.save();
  return account;
}

module.exports = {
  isLedgerBankMethod,
  isFinanceBankMethod,
  appendBankTransaction,
  postsToBankLedger,
  parseLedgerDate,
};
