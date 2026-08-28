/** Compute attendance hour breakdown from clock times and breaks. */
function computeAttendanceHours({
  checkIn,
  checkOut,
  breakTimes = [],
  status = 'present',
  isHalfDay = false,
  expectedDailyHours = 8,
}) {
  const result = {
    totalDurationHours: 0,
    breakHours: 0,
    leaveHours: 0,
    totalWorkedHours: 0,
    nonWorkedHours: 0,
    overtimeHours: 0,
    missingHours: 0,
  };

  const leaveStatuses = ['leave', 'absent'];
  if (leaveStatuses.includes(status)) {
    result.leaveHours = isHalfDay ? expectedDailyHours / 2 : expectedDailyHours;
    result.nonWorkedHours = result.leaveHours;
    return result;
  }

  if (!checkIn || !checkOut) {
    if (isHalfDay) {
      result.leaveHours = expectedDailyHours / 2;
      result.missingHours = expectedDailyHours / 2;
    } else if (status !== 'present' && status !== 'late') {
      result.missingHours = expectedDailyHours;
    }
    result.nonWorkedHours = Math.max(0, expectedDailyHours - result.totalWorkedHours);
    return result;
  }

  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  if (outMs <= inMs) return result;

  const totalMs = outMs - inMs;
  result.totalDurationHours = parseFloat((totalMs / 3600000).toFixed(2));

  const breakMs = (breakTimes || []).reduce((acc, b) => {
    if (b?.breakIn && b?.breakOut) {
      const bi = new Date(b.breakIn).getTime();
      const bo = new Date(b.breakOut).getTime();
      if (bo > bi) return acc + (bo - bi);
    }
    return acc;
  }, 0);
  result.breakHours = parseFloat((breakMs / 3600000).toFixed(2));

  if (isHalfDay) result.leaveHours = expectedDailyHours / 2;

  const netMs = Math.max(0, totalMs - breakMs);
  result.totalWorkedHours = parseFloat((netMs / 3600000).toFixed(2));

  const expected = isHalfDay ? expectedDailyHours / 2 : expectedDailyHours;
  if (result.totalWorkedHours > expected) {
    result.overtimeHours = parseFloat((result.totalWorkedHours - expected).toFixed(2));
  } else {
    result.missingHours = parseFloat((expected - result.totalWorkedHours).toFixed(2));
    result.nonWorkedHours = result.missingHours + result.leaveHours;
  }

  return result;
}

module.exports = { computeAttendanceHours };
