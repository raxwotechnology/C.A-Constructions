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

export const DEPARTMENTS = [
  'Civil & Structural Engineering',
  'Architecture & Building Design',
  'Quantity Surveying & Estimating',
  'Site Operations & Supervision',
  'Project Management',
  'Finance & Accounting',
  'Safety & Quality Control (HSE)',
  'Procurement & Logistics',
]

export const ROLES = [
  { value: 'admin', label: 'Admin / Managing Director' },
  { value: 'manager', label: 'Project Manager (PM)' },
  { value: 'engineer', label: 'Site Engineer / QS' },
  { value: 'supervisor', label: 'Site Supervisor' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'supplier', label: 'Supplier / Vendor' },
  { value: 'worker', label: 'Site Worker / Mason' },
  { value: 'client', label: 'Client / Property Owner' },
]
