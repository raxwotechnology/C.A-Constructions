/** Display / invoice currencies (stored on each invoice). */
export const INVOICE_CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP', 'AUD', 'SGD', 'INR', 'AED', 'Other']

/** Quotation module — supported conversion currencies */
export const QUOTATION_CURRENCIES = ['LKR', 'USD', 'AED', 'EUR', 'GBP']

/** Suggested LKR per 1 unit of foreign currency (indicative defaults; user can override per document). */
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

/** Full amount display — never abbreviates (no 100K / 2M). */
export function formatMoney(amount, currency = 'LKR', options = {}) {
  const n = Number(amount) || 0
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    locale = 'en-LK',
  } = options
  return `${currency} ${n.toLocaleString(locale, { minimumFractionDigits, maximumFractionDigits })}`
}

/** Chart axis ticks — full currency, no compact notation */
export function chartMoneyTick(value, currency = 'LKR') {
  return formatMoney(value, currency, { maximumFractionDigits: 0 })
}

/** Recharts tooltip formatter */
export function tooltipMoney(value, name, currency = 'LKR') {
  return [formatMoney(value, currency), name]
}

/** Convert amount from one currency to another via LKR pivot */
export function convertAmountBetweenCurrencies(amount, fromCurrency, toCurrency) {
  const n = Number(amount) || 0
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return n
  const fromRate = suggestedExchangeToLKR(fromCurrency)
  const toRate = suggestedExchangeToLKR(toCurrency)
  if (!toRate) return n
  return parseFloat(((n * fromRate) / toRate).toFixed(2))
}
