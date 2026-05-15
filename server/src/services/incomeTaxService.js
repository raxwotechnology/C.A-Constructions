const IncomeTaxConfig = require('../models/IncomeTaxConfig');
const EmployeeTaxProfile = require('../models/EmployeeTaxProfile');

const FILING_RELIEF = {
  single: 0,
  married: 50000,
  head_of_household: 75000,
};

const NON_RESIDENT_RATE_MULTIPLIER = 1.2;

function annualizeMonthly(amount) {
  return Math.max(0, Number(amount) || 0) * 12;
}

function applySlabs(annualTaxable, slabs = []) {
  const sorted = [...slabs].sort((a, b) => (a.minIncome || 0) - (b.minIncome || 0));
  let tax = 0;
  let remaining = annualTaxable;
  for (const slab of sorted) {
    const min = Number(slab.minIncome || 0);
    const max = slab.maxIncome == null || slab.maxIncome === '' ? Infinity : Number(slab.maxIncome);
    const rate = Number(slab.rate || 0) / 100;
    if (remaining <= 0) break;
    if (annualTaxable <= min) continue;
    const band = Math.min(remaining, max === Infinity ? remaining : Math.max(0, max - min));
    if (band > 0) {
      tax += band * rate;
      remaining -= band;
    }
  }
  return Math.round(tax);
}

async function getActiveTaxConfig(year) {
  const y = Number(year) || new Date().getFullYear();
  return IncomeTaxConfig.findOne({ year: y, isActive: true }).sort({ updatedAt: -1 });
}

async function getEmployeeTaxProfile(employeeId, year) {
  const y = Number(year) || new Date().getFullYear();
  return EmployeeTaxProfile.findOne({ employee: employeeId, year: y });
}

function extraReliefFromProfile(profile) {
  if (!profile) return 0;
  return FILING_RELIEF[profile.filingStatus] || 0;
}

/**
 * @param {Object} employee - Employee doc
 * @param {number} month - 1-12
 * @param {number} year
 * @param {number} monthlyTaxableIncome - gross components subject to tax
 */
async function calculateMonthlyIncomeTax(employee, month, year, monthlyTaxableIncome) {
  const profile = await getEmployeeTaxProfile(employee._id, year);
  if (profile?.isExempt) {
    return {
      taxAmount: 0,
      annualTaxable: 0,
      monthlyTaxable: monthlyTaxableIncome,
      exemptions: profile.exemptions || [],
      config: null,
      profile,
    };
  }

  const config = await getActiveTaxConfig(year);
  if (!config) {
    return {
      taxAmount: 0,
      annualTaxable: 0,
      monthlyTaxable: monthlyTaxableIncome,
      exemptions: [],
      config: null,
      profile,
    };
  }

  const profileExemptionTotal = (profile?.exemptions || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const exemptionTotal = profileExemptionTotal
    + Number(config.standardRelief || 0)
    + extraReliefFromProfile(profile);

  const monthlyInput = Math.max(0, Number(monthlyTaxableIncome) || 0);
  const monthlyTaxable = Math.max(0, monthlyInput - exemptionTotal / 12);

  let annualTaxable;
  if (profile?.calculationMode === 'annual') {
    annualTaxable = Math.max(0, annualizeMonthly(monthlyInput) - exemptionTotal);
  } else {
    annualTaxable = Math.max(0, annualizeMonthly(monthlyTaxable) - exemptionTotal);
  }

  let annualTax = applySlabs(annualTaxable, config.slabs || []);
  if (profile?.taxResidency === 'non_resident') {
    annualTax = Math.round(annualTax * NON_RESIDENT_RATE_MULTIPLIER);
  }

  const taxAmount = profile?.calculationMode === 'annual'
    ? Math.round(annualTax / 12)
    : Math.round(annualTax / 12);

  return {
    taxAmount,
    annualTaxable,
    monthlyTaxable,
    exemptions: profile?.exemptions || [],
    config,
    profile,
  };
}

module.exports = {
  applySlabs,
  getActiveTaxConfig,
  getEmployeeTaxProfile,
  calculateMonthlyIncomeTax,
};
