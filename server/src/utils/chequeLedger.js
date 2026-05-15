const { appendBankTransaction } = require('./bankLedger');

const INCOMING_CREDIT = new Set(['cleared', 'deposited', 'received', 'paid']);
const OUTGOING_DEBIT = new Set(['cleared', 'paid', 'deposited']);

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

module.exports = {
  syncChequeBankLedger,
  shouldCreditBank,
  shouldDebitBank,
  statusNeedsBankLedger,
};
