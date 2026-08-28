// Master Categories Breakdown for R.A CREATIONS & HOME DESIGNS (PVT) LTD (Backend)

const PROJECT_SERVICE_TYPES = [
  { id: 'residential', labelEn: 'Residential Construction', labelSi: 'නිවාස ඉදිකිරීම්' },
  { id: 'commercial', labelEn: 'Commercial Construction', labelSi: 'වාණිජ ගොඩනැගිලි' },
  { id: 'renovation', labelEn: 'Renovation & Remodeling', labelSi: 'අලුත්වැඩියා කටයුතු' },
  { id: 'interior', labelEn: 'Interior Design & Fit-out', labelSi: 'අභ්යන්තර නිර්මාණකරණය' },
  { id: 'civil', labelEn: 'Civil Engineering & Infrastructure', labelSi: 'සිවිල් ඉංජිනේරු කටයුතු' },
  { id: 'architectural', labelEn: 'Architectural Design', labelSi: 'වාස්තු විද්යාත්මක සැලසුම්' },
  { id: 'mep', labelEn: 'MEP Services', labelSi: 'යාන්ත්රික, විදුලි සහ ජල නල පද්ධති' },
];

const ASSET_CATEGORIES = [
  'Bank Balance',
  'Cash in Hand',
  'Computers & IT Equipment',
  'Computers & Hardware',
  'Furniture & Office Equipment',
  'Office Furniture',
  'Land & Buildings',
  'Machinery & Heavy Equipment',
  'Machinery & Plant',
  'Power & Hand Tools',
  'Tools & Equipment',
  'Retention Receivables',
  'Vehicles',
];

const CAPITAL_CATEGORIES = [
  'Additional Investment',
  'Capital Reserves',
  'Owner / Partner Capital',
  'Owner Drawings',
];

const DAILY_WAGE_SUB_CATEGORIES = {
  skillRates: [
    { type: 'Skilled Labour / Baas', defaultRate: 5000 },
    { type: 'Unskilled Labour / Helper', defaultRate: 3500 },
  ],
  subContractTypes: [
    'Tiling',
    'Brickwork',
    'Painting',
    'Plastering',
    'Piece-rate',
  ],
  allowances: [
    'Daily Food & Refreshments',
    'Travel & Transport Allowance',
    'Night/Outstation Allowance',
  ],
  financialAdjustments: [
    'Employee Advances',
    'Overtime (OT) Pay',
    'Advance Deductions',
  ],
  staffPayroll: [
    'Monthly Permanent Salaries',
    'EPF (12%/8%)',
    'ETF (3%)',
  ],
};

const EXPENSE_CATEGORIES = {
  labour: [
    'Daily Wages',
    'Overtime (OT)',
    'Sub-contract Payouts',
    'Worker Meals & Refreshments',
  ],
  material: [
    'Metal',
    'Bricks/Blocks',
    'Cement',
    'Chemicals/Waterproofing',
    'Electrical',
    'Hardware',
    'Paint',
    'Plumbing',
    'Ready-Mix Concrete',
    'Sand/Soil',
    'Steel',
    'Tiles/Granite',
    'Timber',
  ],
  site: [
    'Fuel/Diesel',
    'Machinery/Crane Rent',
    'Safety Equipment/PPE',
    'Site Utilities',
    'Transport/Hiring',
    'Small Tools Purchase',
    'Temporary Site Hut/Toilet',
  ],
  office: [
    'Marketing',
    'Office Utilities',
    'Internet/Phone',
    'Office Rent',
    'Software/Hosting',
    'Stationery/Printing',
  ],
};

const INCOME_CATEGORIES = [
  'Advance Payments',
  'Claim Payments / Running Bills',
  'Final Settlement',
  'Scrap Sales',
  'Variation / Extra Work Income',
];

const LIABILITY_CATEGORIES = [
  'Bank Loans/OD',
  'Employee Payable Salaries/Wages',
  'EPF/ETF Payable',
  'Sub-contractor Payables',
  'Supplier Creditors',
];

const PROJECT_TRACKING_CATEGORIES = [
  'BOQ / Estimate',
  'Site Name & Location',
  'Completed Status',
  'Income vs Expense Tracking',
  'Net Profit/Loss',
  'Sqft Area Calculations',
];

const TAX_CATEGORIES = [
  'APIT/PAYE',
  'Income Tax',
  'Municipal Approvals/Fees',
  'SSCL',
  'VAT',
];

const ALL_EXPENSE_FLAT = [
  ...EXPENSE_CATEGORIES.labour,
  ...EXPENSE_CATEGORIES.material,
  ...EXPENSE_CATEGORIES.site,
  ...EXPENSE_CATEGORIES.office,
];

module.exports = {
  PROJECT_SERVICE_TYPES,
  ASSET_CATEGORIES,
  CAPITAL_CATEGORIES,
  DAILY_WAGE_SUB_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  LIABILITY_CATEGORIES,
  PROJECT_TRACKING_CATEGORIES,
  TAX_CATEGORIES,
  ALL_EXPENSE_FLAT,
};
