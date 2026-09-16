/** Statuses that post to company bank ledger */
export function statusNeedsBankLedger(status, direction) {
  const s = String(status || '').toLowerCase();
  const d = String(direction || '').toLowerCase();
  const incoming = ['received', 'incoming'].includes(d);
  const outgoing = ['issued', 'outgoing'].includes(d);
  if (incoming && ['cleared', 'deposited', 'received', 'paid'].includes(s)) return true;
  if (outgoing && ['paid', 'cleared', 'deposited'].includes(s)) return true;
  return false;
}
