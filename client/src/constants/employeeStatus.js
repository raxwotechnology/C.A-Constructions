export const EMPLOYEE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'internship', label: 'Internship' },
  { value: 'contract', label: 'Contract' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
]

/** Quick filters for employee list */
export const EMPLOYEE_STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'resigned', label: 'Resigned' },
]

export const STATUS_BADGE = {
  active: 'badge-green',
  inactive: 'badge-gray',
  suspended: 'badge-red',
  internship: 'badge-yellow',
  contract: 'badge-purple',
  on_leave: 'badge-blue',
  resigned: 'badge-gray',
  terminated: 'badge-red',
  former: 'badge-gray',
  intern_ended: 'badge-gray',
}

export const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'HR', 'Finance', 'Operations', 'Sales', 'Infrastructure']

export const ROLES = [
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
]
