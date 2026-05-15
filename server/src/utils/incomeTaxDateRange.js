function parseRangeEnd(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseRangeStart(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Tax record period = calendar month (year/month fields) */
function recordPeriodOverlapsRange(record, from, to) {
  const y = Number(record.year);
  const m = Number(record.month);
  if (!y || !m) return false;
  const periodStart = new Date(y, m - 1, 1);
  const periodEnd = new Date(y, m, 0, 23, 59, 59, 999);
  if (from && periodEnd < from) return false;
  if (to && periodStart > to) return false;
  return true;
}

function enumerateMonthsInRange(fromDate, toDate) {
  const from = parseRangeStart(fromDate);
  const to = parseRangeEnd(toDate);
  if (!from || !to || from > to) return [];

  const months = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

module.exports = {
  parseRangeStart,
  parseRangeEnd,
  recordPeriodOverlapsRange,
  enumerateMonthsInRange,
};
