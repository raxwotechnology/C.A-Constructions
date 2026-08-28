/** Invalidate payroll-related React Query caches after financial sync */
export function invalidatePayrollQueries(qc, employeeId) {
  qc.invalidateQueries({ queryKey: ['payroll'] })
  qc.invalidateQueries({ queryKey: ['payroll-live-snapshot'] })
  qc.invalidateQueries({ queryKey: ['payrolls'] })
  qc.invalidateQueries({ queryKey: ['admin-payroll'] })
  if (employeeId) {
    qc.invalidateQueries({ queryKey: ['employee-financial', employeeId] })
    qc.invalidateQueries({ queryKey: ['emp-detail-payroll', employeeId] })
    qc.invalidateQueries({ queryKey: ['loans'] })
    qc.invalidateQueries({ queryKey: ['advances'] })
  }
}

export function handlePayrollSyncResponse(qc, data, toast) {
  const sync = data?.payrollSync
  if (!sync) return
  const empId = sync.employeeId
  if (sync.recalculated) {
    const loan = Number(sync.loanDeduction || 0)
    const loanMsg = loan > 0 ? ` · loan −LKR ${loan.toLocaleString()}` : ''
    const countMsg = sync.syncedPayrollCount > 1 ? ` (${sync.syncedPayrollCount} periods)` : ''
    toast.success(`Payroll updated${countMsg} — net LKR ${Number(sync.netSalary || 0).toLocaleString()}${loanMsg}`)
    invalidatePayrollQueries(qc, empId)
  } else if (sync.skipped && sync.reason === 'finalized_locked') {
    toast('Payroll is approved/locked — use Reopen on Payroll to apply loan deductions', { icon: '🔒', duration: 5000 })
  } else if (sync.skipped && sync.reason === 'paid_locked') {
    toast('Payroll already paid — adjustment entry created if amounts changed', { icon: '📋' })
    invalidatePayrollQueries(qc, empId)
  } else if (sync.skipped && sync.reason === 'no_payroll_record') {
    toast('No payroll record for this period yet — generate or sync payroll', { icon: 'ℹ️' })
  }
}
