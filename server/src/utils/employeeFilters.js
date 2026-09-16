/** Statuses that may appear in payroll, project allocations, and other “pick an employee” UIs */
const ASSIGNED_STATUSES = ['active', 'Active', 'ACTIVE', 'internship', 'Internship', 'contract', 'Contract', 'on_leave', 'On Leave', 'On leave'];

/** Excluded from assignable lists; still visible in history/reports with includeFormer or direct id */
const INACTIVE_STATUSES = ['resigned', 'Resigned', 'terminated', 'Terminated', 'former', 'Former', 'intern_ended', 'Inactive', 'inactive', 'Pending', 'pending'];

const STATUS_LABELS = {
  active: 'Active',
  Active: 'Active',
  internship: 'Internship',
  Internship: 'Internship',
  contract: 'Contract',
  Contract: 'Contract',
  on_leave: 'On leave',
  'On Leave': 'On leave',
  'On leave': 'On leave',
  resigned: 'Resigned',
  Resigned: 'Resigned',
  terminated: 'Terminated',
  Terminated: 'Terminated',
  former: 'Former',
  Former: 'Former',
  intern_ended: 'Intern ended',
};

function isAssignableStatus(status) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return ASSIGNED_STATUSES.some(st => String(st).toLowerCase() === s);
}

module.exports = {
  ASSIGNED_STATUSES,
  INACTIVE_STATUSES,
  STATUS_LABELS,
  isAssignableStatus,
};

