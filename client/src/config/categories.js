// Master Categories Breakdown for R A Creations / R A Constructions Web Management System (Frontend)

export const PROJECT_SERVICE_TYPES = [
  { id: 'residential', labelEn: 'Residential Construction', labelSi: 'නිවාස ඉදිකිරීම්' },
  { id: 'commercial', labelEn: 'Commercial Construction', labelSi: 'වාණිජ ගොඩනැගිලි' },
  { id: 'renovation', labelEn: 'Renovation & Remodeling', labelSi: 'අලුත්වැඩියා කටයුතු' },
  { id: 'interior', labelEn: 'Interior Design & Fit-out', labelSi: 'අභ්යන්තර නිර්මාණකරණය' },
  { id: 'civil', labelEn: 'Civil Engineering & Infrastructure', labelSi: 'සිවිල් ඉංජිනේරු කටයුතු' },
  { id: 'architectural', labelEn: 'Architectural Design', labelSi: 'වාස්තු විද්යාත්මක සැලසුම්' },
  { id: 'mep', labelEn: 'MEP Services', labelSi: 'යාන්ත්රික, විදුලි සහ ජල නල පද්ධති' },
];

export const INCOME_CATEGORIES = [
  'Client Payment',
  'Advance Payment',
  'Variation / Extra Work Income',
  'Retention Release',
  'Other Income',
];

export const EXPENSE_CATEGORIES = {
  material: [
    'Cement',
    'Steel',
    'Sand',
    'Metal',
    'Blocks',
    'Tiles',
    'Electrical Items',
    'Plumbing Items',
  ],
  labour: [
    'Daily Labour',
    'Skilled Labour',
    'Sub Contractor Payment',
  ],
  site: [
    'Transport',
    'Machinery Rent',
    'Fuel',
    'Site Meals & Welfare',
    'Safety Tools & Equipment',
  ],
  office: [
    'Rent',
    'Salary',
    'Electricity & Utilities',
    'Internet & Telephone',
    'Stationery',
  ],
};

export const ASSET_CATEGORIES = [
  'Vehicles',
  'Machinery & Plant',
  'Tools & Equipment',
  'Office Furniture',
  'Computers & Hardware',
  'Cash in Hand',
  'Bank Balance',
];

export const LIABILITY_CATEGORIES = [
  'Supplier Creditors',
  'Bank Loans & Leases',
  'Employee Payables',
  'Other Payables',
];

export const CAPITAL_CATEGORIES = [
  'Owner Capital',
  'Additional Investment',
  'Drawings',
];

export const TAX_CATEGORIES = [
  'VAT',
  'PAYE / APIT',
  'Income Tax',
  'Government Levies & Stamp Duty',
];

export const ALL_EXPENSE_FLAT = [
  ...EXPENSE_CATEGORIES.material,
  ...EXPENSE_CATEGORIES.labour,
  ...EXPENSE_CATEGORIES.site,
  ...EXPENSE_CATEGORIES.office,
];

export const CRM_LEAD_SOURCES = [
  'Website Inquiry',
  'Client Referral',
  'Facebook Ad',
  'Site Visit Walk-in',
  'Exhibition / Expo',
  'Other',
];

export const SLS_573_BOQ_DIVISIONS = [
  'Earthworks & Excavation',
  'Concrete & Formwork',
  'Reinforcement Steel',
  'Masonry Work',
  'Roofing & Waterproofing',
  'Plumbing & Drainage',
  'Electrical & Mechanical',
  'Finishing & Painting',
];

export const FINANCIAL_ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense',
];

export const SRI_LANKA_PAYROLL_CONFIG = {
  epfEmployee: 8,
  epfEmployer: 12,
  etfEmployer: 3,
};

export default {
  PROJECT_SERVICE_TYPES,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  CAPITAL_CATEGORIES,
  TAX_CATEGORIES,
  ALL_EXPENSE_FLAT,
  CRM_LEAD_SOURCES,
  SLS_573_BOQ_DIVISIONS,
  FINANCIAL_ACCOUNT_TYPES,
  SRI_LANKA_PAYROLL_CONFIG,
};
