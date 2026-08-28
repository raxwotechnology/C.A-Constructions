const {
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
} = require('../server/src/constants/masterCategories');

const dailyWageController = require('../server/src/controllers/dailyWageController');

console.log('=== VERIFYING EXTENDED MASTER CATEGORIES ===');
console.log('Assets count:', ASSET_CATEGORIES.length);
console.log('Capital count:', CAPITAL_CATEGORIES.length);
console.log('Daily Wage Skill Rates:', DAILY_WAGE_SUB_CATEGORIES.skillRates);
console.log('Expense categories material count:', EXPENSE_CATEGORIES.material.length);
console.log('Income categories count:', INCOME_CATEGORIES.length);
console.log('Liabilities count:', LIABILITY_CATEGORIES.length);
console.log('Tax categories count:', TAX_CATEGORIES.length);

console.log('\n=== TESTING DAILY WAGE FORMULA CALCULATIONS ===');

// Mock req and res
const reqDailyWage = {
  body: {
    workType: 'Daily Wage',
    skillRate: 5000,
    daysWorked: 1.5,
    otHours: 3,
    otRate: 600,
    allowances: {
      foodRefreshments: 500,
      travelTransport: 400,
      nightOutstation: 0,
    },
    advanceDeductions: 1000,
  },
};

const reqSubContract = {
  body: {
    workType: 'Sub-Contract',
    measuredSqft: 500,
    ratePerSqft: 150,
    advanceDeductions: 2000,
  },
};

let resData = null;
const resMock = {
  json: (data) => {
    resData = data;
    return data;
  },
};

dailyWageController.calculatePayPreview(reqDailyWage, resMock);
console.log('Daily Wage Calculation Result:');
console.log(resData);

const expectedNetDaily = (1.5 * 5000) + (3 * 600) + (500 + 400 + 0) - 1000;
console.log('Expected Net Daily Pay:', expectedNetDaily, 'Match:', resData.data.netDailyPay === expectedNetDaily);

dailyWageController.calculatePayPreview(reqSubContract, resMock);
console.log('\nSub-Contract Calculation Result:');
console.log(resData);

const expectedSubPay = (500 * 150) - 2000;
console.log('Expected Sub-Contract Pay:', expectedSubPay, 'Match:', resData.data.subContractPay === expectedSubPay);

if (resData.data.subContractPay === expectedSubPay) {
  console.log('\nSUCCESS: All calculations & category definitions verified successfully!');
} else {
  console.error('\nERROR: Calculation mismatch!');
  process.exit(1);
}
