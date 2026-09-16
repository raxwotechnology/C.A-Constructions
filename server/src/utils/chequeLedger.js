const { appendBankTransaction } = require('./bankLedger');

const INCOMING_CREDIT = new Set(['cleared', 'deposited', 'received', 'paid']);
const OUTGOING_DEBIT = new Set(['cleared', 'paid', 'deposited']);
const BOUNCED_STATUSES = new Set(['bounced', 'returned', 'cancelled']);

function isIncoming(direction) {
  return ['received', 'incoming'].includes(String(direction || '').toLowerCase());
}

function isOutgoing(direction) {
  return ['issued', 'outgoing'].includes(String(direction || '').toLowerCase());
}

function shouldCreditBank(status, direction) {
  return isIncoming(direction) && INCOMING_CREDIT.has(String(status || '').toLowerCase());
}

function shouldDebitBank(status, direction) {
  return isOutgoing(direction) && OUTGOING_DEBIT.has(String(status || '').toLowerCase());
}

function statusNeedsBankLedger(status, direction) {
  return shouldCreditBank(status, direction) || shouldDebitBank(status, direction);
}

async function syncChequeBankLedger(cheque, { recordedBy, force = false } = {}) {
  if (!cheque?.bankAccount) return null;

  const status = String(cheque.status || '').toLowerCase();
  const amt = Number(cheque.amount || 0);
  if (!amt) return null;

  if (!force && cheque.ledgerPosted) return null;

  const needsCredit = shouldCreditBank(status, cheque.direction);
  const needsDebit = shouldDebitBank(status, cheque.direction);
  if (!needsCredit && !needsDebit) return null;

  if (needsCredit) {
    await appendBankTransaction(cheque.bankAccount, {
      type: 'deposit',
      amount: amt,
      description: `Incoming cheque ${cheque.chequeNumber} — ${status}`,
      date: cheque.chequeDate || new Date(),
      moduleSource: 'cheques',
      sourceType: 'Cheque',
      sourceId: cheque._id,
      referenceId: cheque.chequeNumber,
      paymentMethod: 'cheque',
      recordedBy,
    });
    cheque.ledgerPosted = true;
    cheque.ledgerPostedAt = new Date();
    cheque.ledgerPostedStatus = status;
    await cheque.save();
    return 'credit';
  }

  if (needsDebit) {
    await appendBankTransaction(cheque.bankAccount, {
      type: 'withdrawal',
      amount: amt,
      description: `Outgoing cheque ${cheque.chequeNumber} — ${status}`,
      date: cheque.chequeDate || new Date(),
      moduleSource: 'cheques',
      sourceType: 'Cheque',
      sourceId: cheque._id,
      referenceId: cheque.chequeNumber,
      paymentMethod: 'cheque',
      recordedBy,
    });
    cheque.ledgerPosted = true;
    cheque.ledgerPostedAt = new Date();
    cheque.ledgerPostedStatus = status;
    await cheque.save();
    return 'debit';
  }

  return null;
}

/** Reverse a previously posted cheque ledger entry (bounced / cancelled). */
async function reverseChequeBankLedger(cheque, { recordedBy } = {}) {
  if (!cheque?.bankAccount || !cheque.ledgerPosted) return null;

  const postedStatus = String(cheque.ledgerPostedStatus || cheque.status || '').toLowerCase();
  const amt = Number(cheque.amount || 0);
  if (!amt) return null;

  const wasCredit = shouldCreditBank(postedStatus, cheque.direction);
  const wasDebit = shouldDebitBank(postedStatus, cheque.direction);
  if (!wasCredit && !wasDebit) {
    cheque.ledgerPosted = false;
    cheque.ledgerPostedStatus = '';
    await cheque.save();
    return null;
  }

  if (wasCredit) {
    await appendBankTransaction(cheque.bankAccount, {
      type: 'withdrawal',
      amount: amt,
      description: `Reversal: cheque ${cheque.chequeNumber} — ${postedStatus}`,
      date: new Date(),
      moduleSource: 'cheques',
      sourceType: 'Cheque',
      sourceId: cheque._id,
      referenceId: `${cheque.chequeNumber}-rev`,
      paymentMethod: 'cheque',
      recordedBy,
    });
  } else if (wasDebit) {
    await appendBankTransaction(cheque.bankAccount, {
      type: 'deposit',
      amount: amt,
      description: `Reversal: cheque ${cheque.chequeNumber} — ${postedStatus}`,
      date: new Date(),
      moduleSource: 'cheques',
      sourceType: 'Cheque',
      sourceId: cheque._id,
      referenceId: `${cheque.chequeNumber}-rev`,
      paymentMethod: 'cheque',
      recordedBy,
    });
  }

  cheque.ledgerPosted = false;
  cheque.ledgerPostedAt = undefined;
  cheque.ledgerPostedStatus = '';
  await cheque.save();
  return 'reversed';
}

function isBouncedStatus(status) {
  return BOUNCED_STATUSES.has(String(status || '').toLowerCase());
}

module.exports = {
  syncChequeBankLedger,
  reverseChequeBankLedger,
  shouldCreditBank,
  shouldDebitBank,
  statusNeedsBankLedger,
  isBouncedStatus,
};
