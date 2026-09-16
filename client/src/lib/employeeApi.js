/** Employees eligible for payroll, allocations, attendance pickers, etc. */
export function assignableEmployeesUrl(extra = {}) {
  const params = new URLSearchParams({ assignable: '1' })
  Object.entries(extra).forEach(([k, v]) => {
    if (v != null && v !== '') params.set(k, v)
  })
  const qs = params.toString()
  return `/employees?${qs}`
}
