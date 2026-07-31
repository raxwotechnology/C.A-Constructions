const { createDailyWageLog } = require('../server/src/controllers/dailyWageController');
const mongoose = require('mongoose');

const req = {
  body: {
    workerName: 'Sunil Perera',
    project: new mongoose.Types.ObjectId(),
    workType: 'Daily Wage',
    skillLevel: 'Skilled Labour / Baas',
    skillRate: 5000,
    daysWorked: 1,
    otHours: 2,
    otRate: 500,
    allowances: { foodRefreshments: 500, travelTransport: 300 },
    mealExpenseAutoLogged: true,
  },
  user: { id: new mongoose.Types.ObjectId() }
};

const res = {
  status: (code) => { console.log('Status code:', code); return res; },
  json: (data) => console.log('Response JSON:', data)
};

const next = (err) => console.error('Next Error:', err);

console.log('Testing createDailyWageLog...');
createDailyWageLog(req, res, next);
