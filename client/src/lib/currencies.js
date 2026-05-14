/** Display / invoice currencies (stored on each invoice). */
export const INVOICE_CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP', 'AUD', 'SGD', 'INR', 'AED', 'Other']

/** Suggested LKR per 1 unit of foreign currency (indicative defaults; user can override per invoice). */
export const SUGGESTED_FX_TO_LKR = {
  USD: 303,
  EUR: 330,
  GBP: 385,
  AUD: 195,
  SGD: 225,
  INR: 3.65,
  AED: 82.5,
  Other: 1,
}

export function suggestedExchangeToLKR(currency) {
  if (!currency || currency === 'LKR') return 1
  return SUGGESTED_FX_TO_LKR[currency] || 1
}

export function formatMoney(amount, currency = 'LKR') {
  const n = Number(amount) || 0
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}
