const mongoose = require('mongoose');
const { createDailyWageLog } = require('../server/src/controllers/dailyWageController');

const sampleProjId = new mongoose.Types.ObjectId();
const req = {
  body: {
    workerName: 'Kamal Perera',
    project: sampleProjId.toString(),
    workType: 'Daily Wage',
    skillLevel: 'Skilled Labour / Baas',
    skillRate: 5000,
    daysWorked: 1,
    otHours: 2,
    otRate: 500,
    allowances: { foodRefreshments: 500, travelTransport: 300 },
    mealExpenseAutoLogged: true,
  },
  user: { _id: new mongoose.Types.ObjectId() }
};

const res = {
  status: (s) => { console.log('Status:', s); return res; },
  json: (d) => console.log('JSON Output:', d)
};

console.log('Testing createDailyWageLog validation check...');
createDailyWageLog(req, res, (err) => console.error('Next Error:', err));
