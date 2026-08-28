const {
  triggerPayrollSync,
  monthYearFromDate,
  pickPrimarySyncResult,
  syncAllRelevantPayrollsForEmployee,
} = require('../services/payrollEngine');

/**
 * Attach payroll sync result to Express response JSON.
 */
function attachSyncResult(resPayload, syncResult) {
  if (!syncResult) return resPayload;
  const primary = Array.isArray(syncResult)
    ? pickPrimarySyncResult(syncResult, monthYearFromDate().month, monthYearFromDate().year)
    : syncResult;
  if (!primary) return resPayload;

  const syncedCount = Array.isArray(syncResult)
    ? syncResult.filter((r) => r.recalculated).length
    : (primary.recalculated ? 1 : 0);

  return {
    ...resPayload,
    payrollSync: {
      recalculated: Boolean(primary.recalculated),
      skipped: Boolean(primary.skipped),
      reason: primary.reason || primary.skipReason || '',
      payrollId: primary.payroll?._id,
      employeeId: primary.payroll?.employee?._id || primary.payroll?.employee,
      month: primary.payroll?.month,
      year: primary.payroll?.year,
      netSalary: primary.payroll?.netSalary,
      loanDeduction: primary.payroll?.loanDeduction,
      advanceDeduction: primary.payroll?.advanceDeduction,
      adjustmentId: primary.adjustment?._id,
      syncedPayrollCount: syncedCount,
    },
  };
}

module.exports = {
  triggerPayrollSync,
  monthYearFromDate,
  attachSyncResult,
  syncAllRelevantPayrollsForEmployee,
  pickPrimarySyncResult,
};
