const SiteSetting = require('../models/SiteSetting');

const DEFAULT_PCT = { epfEmployee: 8, epfEmployer: 12, etfEmployer: 3 };

function clampPct(n, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0 || x > 100) return fallback;
  return x;
}

/**
 * Returns EPF/ETF percentages (0–100) and decimal fractions for payroll math.
 */
async function getStatutoryRates() {
  const doc = await SiteSetting.findOne()
    .select('epfEmployeeRate epfEmployerRate etfEmployerRate')
    .lean();

  const epfEmployee = clampPct(doc?.epfEmployeeRate, DEFAULT_PCT.epfEmployee);
  const epfEmployer = clampPct(doc?.epfEmployerRate, DEFAULT_PCT.epfEmployer);
  const etfEmployer = clampPct(doc?.etfEmployerRate, DEFAULT_PCT.etfEmployer);

  return {
    percentages: { epfEmployee, epfEmployer, etfEmployer },
    fractions: {
      epfEmployee: epfEmployee / 100,
      epfEmployer: epfEmployer / 100,
      etfEmployer: etfEmployer / 100,
    },
  };
}

module.exports = { getStatutoryRates, DEFAULT_PCT };
